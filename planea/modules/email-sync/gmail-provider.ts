import { google, type gmail_v1 } from "googleapis";

import { createAuthorizedGmailOAuthClient } from "./gmail-oauth";
import type { EmailProvider, EmailQuery, InboxEmail } from "./provider";

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function quoteSearchValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatGmailDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function buildSearchQuery(query: EmailQuery) {
  const terms: string[] = [];

  const senderFilters = [
    ...unique(query.senderAddresses).map((address) => `from:${address}`),
    ...unique(query.senderDomains).map((domain) => `from:${domain}`),
  ];

  if (senderFilters.length > 0) {
    terms.push(`(${senderFilters.join(" OR ")})`);
  }

  const subjectFilters = unique(query.subjectPatterns).map(
    (pattern) => `subject:${quoteSearchValue(pattern)}`,
  );
  const keywordFilters = unique(query.keywords ?? []).map(quoteSearchValue);
  const messageFilters = [...subjectFilters, ...keywordFilters];

  if (messageFilters.length > 0) {
    terms.push(`(${messageFilters.join(" OR ")})`);
  }

  if (query.after) {
    terms.push(`after:${formatGmailDate(query.after)}`);
  }

  return terms.join(" ");
}

const DEFAULT_GMAIL_MAX_RESULTS = 9999;
const GMAIL_MAX_RESULTS_LIMIT = 9999;

/** Tope de correos a revisar por sincronización (GMAIL_MAX_RESULTS lo ajusta). */
function getMaxResults() {
  const rawValue =
    process.env.GMAIL_MAX_RESULTS ?? process.env.gmail_max_results;
  const value = Number(rawValue ?? DEFAULT_GMAIL_MAX_RESULTS);
  if (!Number.isFinite(value)) return DEFAULT_GMAIL_MAX_RESULTS;
  return Math.min(Math.max(Math.trunc(value), 1), GMAIL_MAX_RESULTS_LIMIT);
}

/** users.messages.list no devuelve más de 100 por página. */
const LIST_PAGE_SIZE = 100;

/** Cuántos users.messages.get se piden a la vez, para no chocar con la cuota. */
const DETAIL_CONCURRENCY = 10;

/**
 * Recorre las páginas de resultados hasta juntar `limit` mensajes.
 * Sin esto solo llegaba la primera página y la sincronización se quedaba
 * silenciosamente en los correos más recientes.
 */
async function listMessageIds(
  gmail: gmail_v1.Gmail,
  searchQuery: string,
  limit: number,
) {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: Math.min(LIST_PAGE_SIZE, limit - ids.length),
      pageToken,
    });

    for (const message of response.data.messages ?? []) {
      if (message.id) ids.push(message.id);
    }

    pageToken = response.data.nextPageToken ?? undefined;
    console.log(`[gmail] ${ids.length} mensaje(s) listado(s)…`);
  } while (pageToken && ids.length < limit);

  return ids;
}

async function fetchMessages(gmail: gmail_v1.Gmail, ids: string[]) {
  const messages: gmail_v1.Schema$Message[] = [];

  for (let i = 0; i < ids.length; i += DETAIL_CONCURRENCY) {
    const chunk = ids.slice(i, i + DETAIL_CONCURRENCY);
    const responses = await Promise.all(
      chunk.map((id) =>
        gmail.users.messages.get({ userId: "me", id, format: "full" }),
      ),
    );
    messages.push(...responses.map((response) => response.data));
  }

  return messages;
}

function getHeader(
  payload: gmail_v1.Schema$MessagePart | undefined,
  name: string,
) {
  return (
    payload?.headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function extractEmailAddress(fromHeader: string) {
  const bracketMatch = /<([^>]+)>/.exec(fromHeader);
  const candidate = bracketMatch?.[1] ?? fromHeader;
  const addressMatch = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(
    candidate,
  );
  return (addressMatch?.[0] ?? candidate).trim().toLowerCase();
}

function decodeBase64Url(data: string) {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectPayloadText(
  payload: gmail_v1.Schema$MessagePart | undefined,
  output: { plain: string[]; html: string[] },
) {
  if (!payload) return;

  const data = payload.body?.data;
  if (data && payload.mimeType === "text/plain") {
    output.plain.push(decodeBase64Url(data));
  }

  if (data && payload.mimeType === "text/html") {
    output.html.push(stripHtml(decodeBase64Url(data)));
  }

  for (const part of payload.parts ?? []) {
    collectPayloadText(part, output);
  }
}

function messageToInboxEmail(
  message: gmail_v1.Schema$Message,
): InboxEmail | null {
  if (!message.id) return null;

  const text = { plain: [] as string[], html: [] as string[] };
  collectPayloadText(message.payload, text);

  const body =
    text.plain.join("\n").trim() ||
    text.html.join("\n").trim() ||
    message.snippet ||
    "";

  return {
    externalId: message.id,
    from: extractEmailAddress(getHeader(message.payload, "From")),
    subject: getHeader(message.payload, "Subject"),
    snippet: body,
    receivedAt: message.internalDate
      ? new Date(Number(message.internalDate))
      : new Date(),
  };
}

export const gmailEmailProvider: EmailProvider = {
  async fetchEmails(accountEmail: string, query: EmailQuery) {
    console.log("🔥 GMAIL PROVIDER EJECUTADO 🔥");
    console.log("[gmail] Inicializando OAuth...");

    const gmail = google.gmail({
      version: "v1",
      auth: createAuthorizedGmailOAuthClient(),
    });

    console.log("[gmail] Verificando cuenta autorizada...");
    const profile = await gmail.users.getProfile({ userId: "me" });
    const authorizedEmail = profile.data.emailAddress?.toLowerCase();
    const requestedEmail = accountEmail.toLowerCase();

    console.log("[gmail] Cuenta autorizada:", {
      authorizedEmail,
      requestedEmail,
    });

    if (authorizedEmail && authorizedEmail !== requestedEmail) {
      throw new Error(
        `La cuenta Gmail autorizada (${authorizedEmail}) no coincide con la cuenta conectada (${requestedEmail}).`,
      );
    }

    const searchQuery = buildSearchQuery(query);
    console.log("[gmail] Query:", searchQuery);
    console.log("[gmail] Buscando mensajes...");

    const maxResults = getMaxResults();
    console.log("[gmail] Tope de mensajes:", maxResults);
    const messageIds = await listMessageIds(gmail, searchQuery, maxResults);
    console.log(`[gmail] ${messageIds.length} mensaje(s) candidato(s).`);

    if (messageIds.length === maxResults) {
      console.warn(
        `[gmail] Se alcanzó el tope de ${maxResults} correos; sube GMAIL_MAX_RESULTS si faltan.`,
      );
    }

    const fullMessages = await fetchMessages(gmail, messageIds);

    const emails = fullMessages
      .map((message) => messageToInboxEmail(message))
      .filter((email): email is InboxEmail => Boolean(email));

    console.log(`[gmail] ${emails.length} mensaje(s) normalizado(s).`);
    return emails;
  },
};

export default gmailEmailProvider;
