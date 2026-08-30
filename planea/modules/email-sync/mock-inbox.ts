import type { EmailProvider, EmailQuery, InboxEmail } from "./provider";

/**
 * Proveedor simulado: genera una bandeja de entrada determinista por día.
 * Los externalId son estables dentro del mismo día, así que sincronizar dos
 * veces no duplica transacciones (la deduplicación se puede ver en acción).
 */

const SAMPLE_PURCHASES = [
  { merchant: "Supermercado Nacional", min: 1500, max: 5200 },
  { merchant: "Uber", min: 250, max: 750 },
  { merchant: "Farmacia Carol", min: 380, max: 2200 },
  { merchant: "Netflix", min: 650, max: 650 },
  { merchant: "La Sirena", min: 1100, max: 4200 },
  { merchant: "Caribbean Cinemas", min: 500, max: 1400 },
  { merchant: "Estación Shell", min: 1000, max: 2800 },
  { merchant: "Amazon", min: 900, max: 4800 },
  { merchant: "Jumbo", min: 1300, max: 3900 },
  { merchant: "Café del Parque", min: 250, max: 700 },
];

const SAMPLE_DEPOSITS = [
  { merchant: "Transferencia recibida", min: 2000, max: 12000 },
];

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockEmailProvider implements EmailProvider {
  async fetchEmails(accountEmail: string, query: EmailQuery): Promise<InboxEmail[]> {
    const sender = query.senderAddresses[0] ?? `alertas@${query.senderDomains[0] ?? "banco.do"}`;
    const subjectBase = query.subjectPatterns[0] ?? "Notificación de transacción";

    const now = new Date();
    const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
    const rand = mulberry32(hashCode(`${accountEmail}|${dayKey}`));

    const emails: InboxEmail[] = [];
    const count = 3 + Math.floor(rand() * 4); // 3 a 6 correos del día

    for (let i = 0; i < count; i++) {
      const isDeposit = rand() < 0.15;
      const source = isDeposit
        ? SAMPLE_DEPOSITS[0]!
        : SAMPLE_PURCHASES[Math.floor(rand() * SAMPLE_PURCHASES.length)]!;
      const amount =
        Math.round((source.min + rand() * (source.max - source.min)) / 10) * 10;
      const receivedAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          8 + Math.floor(rand() * 12),
          Math.floor(rand() * 60),
        ),
      );
      const formatted = amount.toLocaleString("es-DO");
      emails.push({
        externalId: `sim-${hashCode(accountEmail)}-${dayKey}-${i}`,
        from: sender,
        subject: isDeposit
          ? `${subjectBase}: depósito recibido`
          : `${subjectBase}: consumo en ${source.merchant}`,
        snippet: isDeposit
          ? `Le informamos que se acreditó un depósito por RD$${formatted} en su cuenta terminada en 4321.`
          : `Le informamos que se realizó un consumo por RD$${formatted} en ${source.merchant} con su tarjeta terminada en 4321.`,
        receivedAt,
      });
    }

    // Correo NO bancario que las reglas de la entidad deben descartar:
    // demuestra que solo se procesan los remitentes configurados.
    emails.push({
      externalId: `sim-${hashCode(accountEmail)}-${dayKey}-promo`,
      from: "ofertas@tiendaonline.com",
      subject: "¡50% de descuento solo hoy!",
      snippet: "Aprovecha nuestras ofertas exclusivas…",
      receivedAt: now,
    });

    return query.after
      ? emails.filter((e) => e.receivedAt > query.after!)
      : emails;
  }
}

export const mockEmailProvider = new MockEmailProvider();
