import { google } from "googleapis";

import {
  updateAccessToken,
  type DecryptedCredential,
} from "./credentials";

const DEFAULT_REDIRECT_PATH = "/oauth2callback";

/**
 * Solo lectura del buzón. Es un scope "restringido" de Google: mientras la
 * app esté en modo Testing funciona sin verificación, pero únicamente para
 * los usuarios de prueba dados de alta en la consola.
 */
export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta ${name}. Configura las credenciales de OAuth de Google en el entorno.`,
    );
  }
  return value;
}

/**
 * El redirect URI debe coincidir carácter a carácter con el registrado en
 * Google Cloud. Se deriva del origen de la petición para que localhost y el
 * despliegue funcionen con el mismo código; GOOGLE_REDIRECT_URI lo fuerza
 * cuando la app vive detrás de un proxy que reescribe el host.
 */
export function getGmailRedirectUri(origin: string) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${origin}${DEFAULT_REDIRECT_PATH}`;
}

export function createGmailOAuthClient(origin: string) {
  return new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getGmailRedirectUri(origin),
  );
}

export function getGmailAuthorizationUrl(state: string, origin: string) {
  return createGmailOAuthClient(origin).generateAuthUrl({
    // offline + consent son los que hacen que Google entregue refresh token.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GMAIL_SCOPES,
    state,
  });
}

/**
 * Cliente autenticado como el dueño de la credencial. googleapis renueva el
 * access token solo; el evento `tokens` nos deja persistir el nuevo para no
 * gastar una renovación en cada sincronización.
 */
export function createUserGmailClient(credential: DecryptedCredential) {
  const client = new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
  );

  client.setCredentials({
    refresh_token: credential.refreshToken,
    access_token: credential.accessToken ?? undefined,
    expiry_date: credential.accessTokenExpiresAt?.getTime(),
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void updateAccessToken(
      credential.id,
      tokens.access_token,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    ).catch(() => {
      // Persistir el token es una optimización: si falla, la próxima
      // sincronización simplemente pedirá otro.
    });
  });

  return client;
}

/** El usuario revocó el acceso o el refresh token caducó (apps en Testing). */
export class GmailAuthorizationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "GmailAuthorizationError";
  }
}

export function isInvalidGrant(error: unknown) {
  const payload = JSON.stringify(
    (error as { response?: { data?: unknown } })?.response?.data ??
      (error as { message?: string })?.message ??
      "",
  );
  return /invalid_grant|invalid_token|unauthorized_client/i.test(payload);
}
