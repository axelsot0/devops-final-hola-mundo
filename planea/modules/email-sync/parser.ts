import type { InboxEmail } from "./provider";

export interface ParsedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: number;
  currency: string;
  merchant: string | null;
  description: string;
  date: Date;
  /** Saldo de la cuenta si el correo lo informa (Qik lo trae, Popular no). */
  balance?: number | null;
}

const INCOME_KEYWORDS = [
  "abono",
  "acreditación",
  "acreditacion",
  "acreditado",
  "acreditada",
  "acreditó",
  "acredito",
  "crédito recibido",
  "credito recibido",
  "depósito",
  "deposito",
  "depositado",
  "depositada",
  "nómina",
  "nomina",
  "pago recibido",
  "salario",
  "transferencia recibida",
];
const EXPENSE_KEYWORDS = ["consumo", "compra", "retiro", "débito", "debito", "pago realizado", "cargo"];

const AMOUNT_REGEX = /(?:RD\s?\$|DOP\s?|US\s?\$|USD\s?)\s?([\d.,]+)/i;
const MERCHANT_REGEX = /(?:en|comercio)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9'.& ]+?)\s+(?:con|el|por|mediante|\.)/i;

/*
 * Formato real de las alertas de Banco Popular ("Notificación de Consumo").
 * El cuerpo text/plain trae una tabla separada por tabuladores:
 *
 *   Monto \tMoneda \tFecha \tComercio\tEstatus\t
 *   RD$50.00 \tPeso dominicano \t28/08/2026 \tCESAR RODRIGUEZ\nSNACK \tAprobada\t
 *
 * El nombre del comercio puede venir cortado en dos líneas (el correo va
 * envuelto a ~72 columnas), y cuando cabe completo el salto de línea aparece
 * antes del estatus en lugar del tabulador. Por eso el comercio se captura de
 * forma perezosa hasta el estatus y luego se normalizan los espacios.
 */
const STATUS_WORDS = "Aprobad[ao]|Rechazad[ao]|Declinad[ao]|Denegad[ao]|Anulad[ao]|Revertid[ao]|Pendiente|Procesad[ao]";

const POPULAR_TABLE_REGEX = new RegExp(
  String.raw`(RD\$|US\$|DOP|USD)\s?([\d.,]+)\s*\t` + // Monto
    String.raw`([^\t\n]*)\t` + //                      Moneda
    String.raw`(\d{1,2}\/\d{1,2}\/\d{4})\s*\t` + //    Fecha
    String.raw`([\s\S]*?)` + //                        Comercio
    String.raw`\s*\t?\s*(?:${STATUS_WORDS})\b`, //     Estatus
  "i",
);

/* Misma tabla cuando solo hay versión HTML: los tabuladores se pierden al
 * limpiar las etiquetas y todo queda separado por espacios. */
const POPULAR_FLAT_REGEX = new RegExp(
  String.raw`Monto\s+Moneda\s+Fecha\s+Comercio\s+Estatus\s+` +
    String.raw`(RD\$|US\$|DOP|USD)\s?([\d.,]+)\s+` +
    String.raw`(Peso dominicano|Dólar[a-z ]*|Dolar[a-z ]*|USD|DOP)\s+` +
    String.raw`(\d{1,2}\/\d{1,2}\/\d{4})\s+` +
    String.raw`([\s\S]*?)` +
    String.raw`\s+(?:${STATUS_WORDS})\b`,
  "i",
);

/*
 * Transferencias recibidas de Popular: otra tabla distinta a la de consumo.
 *
 *   Monto \tFecha \tCanal
 *   RD $576.00 \t27/8/2026 \nAPP POPULAR
 *
 * Aquí el importe lleva un espacio tras "RD", que es justo lo que hacía que
 * el reconocimiento genérico fallara y estos ingresos no se registraran.
 */
const POPULAR_TRANSFER_REGEX = new RegExp(
  String.raw`Monto\s+Fecha\s+Canal\s+` +
    String.raw`(RD\s?\$|US\s?\$|DOP|USD)\s?([\d.,]+)\s+` +
    String.raw`(\d{1,2}\/\d{1,2}\/\d{4})`,
  "i",
);

interface PopularRow {
  amount: number;
  currency: string;
  merchant: string | null;
  date: Date | null;
}

function toAmount(raw: string) {
  const amount = Number(raw.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function toCurrency(symbol: string, currencyLabel: string) {
  if (/US\$|USD|d[óo]lar/i.test(`${symbol} ${currencyLabel}`)) return "USD";
  return "DOP";
}

/** "CESAR RODRIGUEZ\nSNACK " -> "CESAR RODRIGUEZ SNACK" */
function normalizeMerchant(raw: string) {
  const merchant = raw.replace(/\s+/g, " ").trim().replace(/[\s*.-]+$/, "");
  return merchant.length > 0 ? merchant : null;
}

function inferIncomeMerchant(text: string, merchant: string | null) {
  const usefulMerchant =
    merchant && !/^(su\s+)?cuenta\b|^la\s+cuenta\b/i.test(merchant)
      ? merchant
      : null;
  if (usefulMerchant) return usefulMerchant;
  if (/n[oó]mina|salario|payroll/i.test(text)) return "Nómina";
  if (/transferencia/i.test(text)) return "Transferencia recibida";
  if (/pago recibido/i.test(text)) return "Pago recibido";
  return "Depósito";
}

/** dd/mm/yyyy -> mediodía UTC, para que el día no cambie según la zona horaria */
function parseTableDate(raw: string) {
  const [day, month, year] = raw.split("/").map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePopularTable(text: string): PopularRow | null {
  const match =
    POPULAR_TABLE_REGEX.exec(text) ?? POPULAR_FLAT_REGEX.exec(text);
  if (!match) return null;

  const amount = toAmount(match[2]!);
  if (amount === null) return null;

  return {
    amount,
    currency: toCurrency(match[1]!, match[3] ?? ""),
    merchant: normalizeMerchant(match[5]!),
    date: parseTableDate(match[4]!),
  };
}

/*
 * ─────────────────────────────────────────────
 * Qik Banco Digital
 * ─────────────────────────────────────────────
 *
 * Tres plantillas, con el importe siempre en una frase reconocible:
 *
 *   Consumo    "Se hizo una transacción de RD$ 169.04 en UBER*RIDES con tu…"
 *   Reverso    "Ha sido reversada la transacción de RD$ 199.74 en UBER*RIDES…"
 *   Toke       "Has recibido RD$ 15,000.00 por parte de Axel Soto Perez en tu…"
 *
 * El genérico no sirve aquí: el correo de consumo también trae "Balance
 * Disponible RD$ 14,831.94", y la primera cifra que encontrara sería el saldo
 * de la cuenta en vez del gasto.
 */
const QIK_TRANSACTION =
  /transacci[óo]n de\s*(RD\$|US\$|DOP|USD)\s*([\d.,]+)\s*en\s+([\s\S]{1,80}?)\s+con tu/i;
const QIK_TOKE =
  /has recibido\s*(RD\$|US\$|DOP|USD)\s*([\d.,]+)\s*por parte de\s+([\s\S]{1,80}?)\s+en tu/i;

/** Filas de la tabla, como respaldo si cambia la redacción de la frase. */
const QIK_TABLE_AMOUNT = /Monto\s*[:\t]?\s*(RD\$|US\$|DOP|USD)\s*([\d.,]+)/i;
/** Qik informa el saldo tras el movimiento; Popular no lo incluye nunca. */
const QIK_BALANCE =
  /Balance\s+Disponible\s*[:\t]?\s*(?:RD\s?\$|US\s?\$|DOP|USD)\s*([\d.,]+)/i;
const QIK_TABLE_PLACE =
  /(?:Localidad|Lugar)\s*[:\t]?\s*([^\n\t]{1,80}?)\s*(?:\n|\t|Fecha|Monto|Estatus|Balance|$)/i;

/** "08-28-2026 07:09 PM (AST)" — mes primero, y AST es siempre UTC-4. */
const QIK_DATETIME =
  /Fecha y hora\s*[:\t]?\s*(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?/i;
/** "Fecha 28 de ago. 2026" en los correos de Toke. */
const QIK_DATE_ES = /Fecha\s*[:\t]?\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\.?\s+(\d{4})/i;

const SPANISH_MONTHS: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
};

const AST_OFFSET_HOURS = 4;

function qikDate(text: string): Date | null {
  const stamp = QIK_DATETIME.exec(text);
  if (stamp) {
    const [, month, day, year, rawHour, minute, meridiem] = stamp;
    let hour = rawHour ? Number(rawHour) % 12 : 12;
    if (meridiem?.toUpperCase() === "PM") hour += 12;

    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour + AST_OFFSET_HOURS,
        minute ? Number(minute) : 0,
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const spanish = QIK_DATE_ES.exec(text);
  if (spanish) {
    const month = SPANISH_MONTHS[spanish[2]!.toLowerCase().slice(0, 4)] ??
      SPANISH_MONTHS[spanish[2]!.toLowerCase().slice(0, 3)];
    if (!month) return null;
    // Sin hora: mediodía UTC para que el día no cambie de zona horaria.
    const date = new Date(
      Date.UTC(Number(spanish[3]), month - 1, Number(spanish[1]), 12),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseQikEmail(email: InboxEmail): ParsedTransaction | null {
  const text = `${email.subject}. ${email.snippet}`;
  const date = qikDate(text) ?? email.receivedAt;
  const balance = toAmount(QIK_BALANCE.exec(text)?.[1] ?? "");

  // Toke recibido: ingreso, y el comercio es quien envía el dinero.
  const toke = QIK_TOKE.exec(text);
  if (toke) {
    const amount = toAmount(toke[2]!);
    if (amount === null) return null;

    return {
      type: "INCOME",
      amount,
      currency: toCurrency(toke[1]!, ""),
      merchant: normalizeMerchant(toke[3]!) ?? "Toke recibido",
      description: email.subject,
      date,
      balance,
    };
  }

  const transaction = QIK_TRANSACTION.exec(text);
  const tableAmount = QIK_TABLE_AMOUNT.exec(text);
  const symbol = transaction?.[1] ?? tableAmount?.[1];
  const amount = toAmount(transaction?.[2] ?? tableAmount?.[2] ?? "");
  if (amount === null || !symbol) return null;

  const place =
    normalizeMerchant(transaction?.[3] ?? "") ??
    normalizeMerchant(QIK_TABLE_PLACE.exec(text)?.[1] ?? "");

  /*
   * Un reverso devuelve el dinero al usuario, así que entra como ingreso: es
   * la única forma de que el saldo cuadre sin un tipo "devolución" en el
   * modelo. El prefijo evita confundirlo con un ingreso real en la lista.
   */
  const isReversal = /revers(?:ad[ao]|[óo])/i.test(text);

  return {
    type: isReversal ? "INCOME" : "EXPENSE",
    amount,
    currency: toCurrency(symbol, ""),
    merchant: isReversal && place ? `Reverso · ${place}` : place,
    description: email.subject,
    date,
    balance,
  };
}

/**
 * Extrae los datos financieros de un correo bancario.
 * Cada parserKey de BankEntity registra aquí su variante; "generic-es" cubre
 * el formato común de las alertas en español.
 */
export function parseBankEmail(
  email: InboxEmail,
  parserKey: string = "generic-es",
): ParsedTransaction | null {
  if (parserKey === "qik") return parseQikEmail(email);

  const text = `${email.subject}. ${email.snippet}`;
  const lower = text.toLowerCase();
  const isIncome = INCOME_KEYWORDS.some((k) => lower.includes(k));
  const isExpense = EXPENSE_KEYWORDS.some((k) => lower.includes(k));

  // Formato tabular de Banco Popular: monto, comercio y fecha vienen en la tabla.
  const row = parsePopularTable(text);
  if (row) {
    return {
      // La tabla solo se emite para consumos; el depósito usa otra plantilla.
      type: isIncome && !isExpense ? "INCOME" : "EXPENSE",
      amount: row.amount,
      currency: row.currency,
      merchant: row.merchant,
      description: email.subject,
      date: row.date ?? email.receivedAt,
    };
  }

  // Transferencia recibida: su propia tabla, con la fecha en la fila.
  const transfer = POPULAR_TRANSFER_REGEX.exec(text);
  if (transfer) {
    const amount = toAmount(transfer[2]!);
    if (amount !== null) {
      return {
        type: isExpense && !isIncome ? "EXPENSE" : "INCOME",
        amount,
        currency: toCurrency(transfer[1]!, ""),
        merchant: inferIncomeMerchant(text, null),
        description: email.subject,
        date: parseTableDate(transfer[3]!) ?? email.receivedAt,
      };
    }
  }

  const amountMatch = AMOUNT_REGEX.exec(text);
  if (!amountMatch) return null;

  const amount = toAmount(amountMatch[1]!);
  if (amount === null) return null;

  if (!isIncome && !isExpense) return null;

  const currency = /US\$|USD/i.test(amountMatch[0]!) ? "USD" : "DOP";

  const merchantMatch = MERCHANT_REGEX.exec(text);
  const merchant = merchantMatch ? normalizeMerchant(merchantMatch[1]!) : null;

  return {
    type: isIncome ? "INCOME" : "EXPENSE",
    amount,
    currency,
    merchant: isIncome ? inferIncomeMerchant(text, merchant) : merchant,
    description: email.subject,
    date: email.receivedAt,
  };
}

/** Verifica si un correo coincide con las reglas de la entidad bancaria. */
export function matchesBankRules(
  email: InboxEmail,
  rules: {
    senderAddresses: string[];
    senderDomains: string[];
    subjectPatterns: string[];
    keywords: string[];
  },
): boolean {
  const from = normalizeEmailAddress(email.from);
  const addressMatch = rules.senderAddresses.some(
    (a) => from === normalizeEmailAddress(a),
  );
  const domain = from.split("@").at(1);
  const domainMatch = Boolean(
    domain &&
      rules.senderDomains.some((d) => domain === d.trim().toLowerCase()),
  );
  if (!addressMatch && !domainMatch) return false;

  const searchableText = `${email.subject} ${email.snippet}`.toLowerCase();
  const subjectMatch = rules.subjectPatterns.some((p) =>
    email.subject.toLowerCase().includes(p.toLowerCase()),
  );
  const keywordMatch = rules.keywords.some((keyword) =>
    searchableText.includes(keyword.toLowerCase()),
  );

  if (rules.subjectPatterns.length > 0 || rules.keywords.length > 0) {
    if (!subjectMatch && !keywordMatch) return false;
  }
  return true;
}

function normalizeEmailAddress(value: string) {
  const bracketMatch = /<([^>]+)>/.exec(value);
  const candidate = bracketMatch?.[1] ?? value;
  const addressMatch = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(
    candidate,
  );
  return (addressMatch?.[0] ?? candidate).trim().toLowerCase();
}
