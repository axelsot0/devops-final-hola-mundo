import type { InboxEmail } from "./provider";

export interface ParsedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: number;
  currency: string;
  merchant: string | null;
  description: string;
  date: Date;
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

const AMOUNT_REGEX = /(?:RD\$|DOP\s?|US\$|USD\s?)\s?([\d.,]+)/i;
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

/**
 * Extrae los datos financieros de un correo bancario.
 * Cada parserKey de BankEntity podría registrar aquí una variante específica;
 * "generic-es" cubre el formato común de las alertas en español.
 */
export function parseBankEmail(
  email: InboxEmail,
  parserKey: string = "generic-es",
): ParsedTransaction | null {
  void parserKey; // por ahora todos los bancos sembrados usan el formato genérico
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
