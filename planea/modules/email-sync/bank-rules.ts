/**
 * Catálogo de entidades bancarias y reglas para identificar sus correos.
 *
 * Fuente única: el seed las escribe en BankEntity, `db:sync-banks` las
 * actualiza sin borrar datos, y la sincronización las usa para completar las
 * que falten en bases sembradas con una versión anterior. Si la lista viviera
 * en varios sitios, acabarían divergiendo y el filtro descartaría correos
 * legítimos.
 */
export interface BankEmailRules {
  senderAddresses: string[];
  senderDomains: string[];
  subjectPatterns: string[];
  keywords: string[];
}

export interface BankDefinition extends BankEmailRules {
  name: string;
  slug: string;
  color: string;
  /** Variante de parseo que entiende el formato de sus correos. */
  parserKey: string;
}

export const BANKS: BankDefinition[] = [
  {
    name: "Banco Popular",
    slug: "banco-popular",
    color: "#005baa",
    parserKey: "generic-es",
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
  {
    name: "Qik Banco Digital",
    slug: "qik",
    // Color provisional: ajústalo si tienes el oficial de la marca.
    color: "#6C4EE3",
    parserKey: "qik",
    senderAddresses: ["notificaciones@qik.do", "no-reply-qik@qik.com.do"],
    senderDomains: ["qik.do", "qik.com.do"],
    subjectPatterns: [
      "Usaste tu tarjeta de débito Qik",
      "Se reversó una transacción",
      "Se reverso una transaccion",
      "Te han enviado un Toke",
      "Toke",
    ],
    keywords: [
      "tarjeta de débito qik",
      "tarjeta debito qik",
      "toke",
      "reversada",
      "reversó",
      "has recibido",
      "balance disponible",
      "RD$",
    ],
  },
  {
    name: "Banreservas",
    slug: "banreservas",
    color: "#00529c",
    parserKey: "generic-es",
    senderAddresses: ["alertas@banreservas.com"],
    senderDomains: ["banreservas.com"],
    subjectPatterns: ["Alerta de transacción", "Notificación Banreservas"],
    keywords: ["transacción", "monto", "cuenta"],
  },
  {
    name: "Banco BHD",
    slug: "banco-bhd",
    color: "#00713d",
    parserKey: "generic-es",
    senderAddresses: ["avisos@bhd.com.do"],
    senderDomains: ["bhd.com.do"],
    subjectPatterns: ["Aviso de transacción BHD"],
    keywords: ["consumo", "retiro", "depósito"],
  },
  {
    name: "Scotiabank RD",
    slug: "scotiabank-rd",
    color: "#ec111a",
    parserKey: "generic-es",
    senderAddresses: ["alertas@scotiabank.com.do"],
    senderDomains: ["scotiabank.com.do"],
    subjectPatterns: ["ScotiaAlertas"],
    keywords: ["compra", "monto"],
  },
  {
    name: "APAP",
    slug: "apap",
    color: "#f26522",
    parserKey: "generic-es",
    senderAddresses: ["notificaciones@apap.com.do"],
    senderDomains: ["apap.com.do"],
    subjectPatterns: ["Notificación de movimiento"],
    keywords: ["movimiento", "monto"],
  },
];

export const BANK_EMAIL_RULES: Record<string, BankEmailRules> =
  Object.fromEntries(
    BANKS.map(({ senderAddresses, senderDomains, subjectPatterns, keywords, slug }) => [
      slug,
      { senderAddresses, senderDomains, subjectPatterns, keywords },
    ]),
  );

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
