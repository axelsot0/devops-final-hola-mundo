/**
 * Reglas de identificación de correos por entidad bancaria.
 *
 * Fuente única: el seed las escribe en BankEntity y la sincronización las
 * usa para completar las que falten en bases sembradas con una versión
 * anterior. Si la lista viviera en los dos sitios, acabarían divergiendo y
 * el filtro descartaría correos legítimos.
 */
export interface BankEmailRules {
  senderAddresses: string[];
  senderDomains: string[];
  subjectPatterns: string[];
  keywords: string[];
}

export const BANK_EMAIL_RULES: Record<string, BankEmailRules> = {
  "banco-popular": {
    senderAddresses: [
      "notificaciones@popularenlinea.com",
      "notificaciones@popularenlinea.com.do",
    ],
    senderDomains: ["popularenlinea.com", "popularenlinea.com.do", "bpd.com.do"],
    subjectPatterns: [
      "Notificación de Consumo",
      "Notificación de transacción",
      "Notificación de Transacción",
      "Notificación de Depósito",
      "Notificación de Deposito",
      "Notificación de Crédito",
      "Notificación de Credito",
      "Aviso de consumo",
      "Depósito recibido",
      "Deposito recibido",
      "Transferencia recibida",
      "Pago recibido",
      "Crédito recibido",
      "Credito recibido",
    ],
    keywords: [
      "consumo",
      "tarjeta",
      "monto",
      "RD$",
      "depósito",
      "deposito",
      "acreditó",
      "acredito",
      "crédito",
      "credito",
      "transferencia recibida",
      "pago recibido",
      "nómina",
      "nomina",
      "salario",
    ],
  },
  banreservas: {
    senderAddresses: ["alertas@banreservas.com"],
    senderDomains: ["banreservas.com"],
    subjectPatterns: ["Alerta de transacción", "Notificación Banreservas"],
    keywords: ["transacción", "monto", "cuenta"],
  },
  "banco-bhd": {
    senderAddresses: ["avisos@bhd.com.do"],
    senderDomains: ["bhd.com.do"],
    subjectPatterns: ["Aviso de transacción BHD"],
    keywords: ["consumo", "retiro", "depósito"],
  },
  "scotiabank-rd": {
    senderAddresses: ["alertas@scotiabank.com.do"],
    senderDomains: ["scotiabank.com.do"],
    subjectPatterns: ["ScotiaAlertas"],
    keywords: ["compra", "monto"],
  },
  apap: {
    senderAddresses: ["notificaciones@apap.com.do"],
    senderDomains: ["apap.com.do"],
    subjectPatterns: ["Notificación de movimiento"],
    keywords: ["movimiento", "monto"],
  },
};

interface WithRules extends BankEmailRules {
  slug: string;
}

function mergeUnique(values: string[], required: readonly string[]) {
  return [...new Set([...required, ...values].map((v) => v.trim()))].filter(
    Boolean,
  );
}

/**
 * Completa las reglas guardadas con las mínimas conocidas del banco, sin
 * borrar las que el usuario o una versión posterior hayan añadido.
 */
export function withRequiredBankRules<T extends WithRules>(bank: T): T {
  const required = BANK_EMAIL_RULES[bank.slug];
  if (!required) return bank;

  return {
    ...bank,
    senderAddresses: mergeUnique(bank.senderAddresses, required.senderAddresses),
    senderDomains: mergeUnique(bank.senderDomains, required.senderDomains),
    subjectPatterns: mergeUnique(bank.subjectPatterns, required.subjectPatterns),
    keywords: mergeUnique(bank.keywords, required.keywords),
  };
}

export function bankRulesChanged(before: BankEmailRules, after: BankEmailRules) {
  const keys = [
    "senderAddresses",
    "senderDomains",
    "subjectPatterns",
    "keywords",
  ] as const;
  return keys.some((key) => before[key].join("\n") !== after[key].join("\n"));
}
