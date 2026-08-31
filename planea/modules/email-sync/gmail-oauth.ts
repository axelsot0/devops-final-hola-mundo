import { google } from "googleapis";

const DEFAULT_REDIRECT_PATH = "/oauth2callback";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function getRequiredGmailEnv(names: string[]) {
  const value = names.map((name) => process.env[name]).find(Boolean);
  if (!value) {
    throw new Error(
      `Faltan credenciales de Gmail OAuth. Define ${names.join(" o ")}.`,
    );
  }
  return value;
}

export function getOptionalGmailEnv(names: string[]) {
  return names.map((name) => process.env[name]).find(Boolean);
}

export function getGmailRedirectUri(origin?: string) {
  return (
    getOptionalGmailEnv(["GOOGLE_REDIRECT_URI", "GMAIL_REDIRECT_URI"]) ??
    `${origin ?? "http://localhost:3000"}${DEFAULT_REDIRECT_PATH}`
  );
}

export function createGmailOAuthClient(origin?: string) {
  const clientId = getRequiredGmailEnv(["GOOGLE_CLIENT_ID", "GMAIL_CLIENT_ID"]);
  const clientSecret = getRequiredGmailEnv([
    "GOOGLE_CLIENT_SECRET",
    "GMAIL_CLIENT_SECRET",
  ]);

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getGmailRedirectUri(origin),
  );
}

export function createAuthorizedGmailOAuthClient(origin?: string) {
  const oauth2Client = createGmailOAuthClient(origin);

  oauth2Client.setCredentials({
    refresh_token: getRequiredGmailEnv([
      "GOOGLE_REFRESH_TOKEN",
      "GMAIL_REFRESH_TOKEN",
    ]),
    access_token: getOptionalGmailEnv([
      "GOOGLE_ACCESS_TOKEN",
      "GMAIL_ACCESS_TOKEN",
    ]),
  });

  return oauth2Client;
}

export function getGmailAuthorizationUrl(state: string, origin: string) {
  return createGmailOAuthClient(origin).generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}
