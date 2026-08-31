/**
 * Abstracción del proveedor de correo.
 *
 * En producción la implementación real usaría la Gmail API con OAuth 2.0
 * (ver docs/gmail.md); como en desarrollo no se usan datos reales ni
 * servicios que requieran registrar un dominio, la app funciona con un
 * proveedor simulado que genera correos bancarios de ejemplo.
 */

export interface InboxEmail {
  /** Id del mensaje en el proveedor (Gmail message id en producción) */
  externalId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
}

export interface EmailQuery {
  /** Filtros derivados de las reglas de la entidad bancaria */
  senderAddresses: string[];
  senderDomains: string[];
  subjectPatterns: string[];
  keywords?: string[];
  /** Solo mensajes posteriores a esta fecha */
  after?: Date;
}

export interface EmailProvider {
  fetchEmails(accountEmail: string, query: EmailQuery): Promise<InboxEmail[]>;
}
