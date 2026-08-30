import type { InboxEmail } from "./provider";

export interface ParsedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: number;
  currency: string;
  merchant: string | null;
  description: string;
  date: Date;
}

const INCOME_KEYWORDS = ["depósito", "deposito", "acreditó", "acredito", "crédito recibido", "transferencia recibida", "pago recibido"];
const EXPENSE_KEYWORDS = ["consumo", "compra", "retiro", "débito", "debito", "pago realizado", "cargo"];

const AMOUNT_REGEX = /(?:RD\$|DOP\s?|US\$|USD\s?)\s?([\d.,]+)/i;
const MERCHANT_REGEX = /(?:en|comercio)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9'.& ]+?)\s+(?:con|el|por|mediante|\.)/i;

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

  const amountMatch = AMOUNT_REGEX.exec(text);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[1]!.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const lower = text.toLowerCase();
  const isIncome = INCOME_KEYWORDS.some((k) => lower.includes(k));
  const isExpense = EXPENSE_KEYWORDS.some((k) => lower.includes(k));
  if (!isIncome && !isExpense) return null;

  const currency = /US\$|USD/i.test(amountMatch[0]!) ? "USD" : "DOP";

  const merchantMatch = MERCHANT_REGEX.exec(text);
  const merchant = merchantMatch ? merchantMatch[1]!.trim() : null;

  return {
    type: isIncome ? "INCOME" : "EXPENSE",
    amount,
    currency,
    merchant: isIncome ? (merchant ?? "Depósito") : merchant,
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
  const from = email.from.toLowerCase();
  const addressMatch = rules.senderAddresses.some(
    (a) => from === a.toLowerCase(),
  );
  const domainMatch = rules.senderDomains.some((d) =>
    from.endsWith(`@${d.toLowerCase()}`),
  );
  if (!addressMatch && !domainMatch) return false;

  if (rules.subjectPatterns.length > 0) {
    const subject = email.subject.toLowerCase();
    const subjectMatch = rules.subjectPatterns.some((p) =>
      subject.includes(p.toLowerCase()),
    );
    if (!subjectMatch) return false;
  }
  return true;
}
