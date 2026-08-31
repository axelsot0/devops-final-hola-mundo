import { google } from "googleapis";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveGmailCredential } from "@/modules/email-sync/credentials";
import { createGmailOAuthClient } from "@/modules/email-sync/gmail-oauth";
import {
  OAUTH_STATE_COOKIE,
  parseOAuthStateCookie,
} from "@/modules/email-sync/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backToAccounts(request: NextRequest, status: string) {
  const response = NextResponse.redirect(
    new URL(`/cuentas?gmail=${status}`, request.url),
  );
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

/**
 * Vuelta del consentimiento de Google: canjea el código, guarda el refresh
 * token cifrado del usuario y deja la cuenta lista para sincronizar. El
 * correo no se pide en un formulario: lo dice el propio buzón autorizado.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.searchParams.get("error")) {
    return backToAccounts(request, "denied");
  }

  const stored = parseOAuthStateCookie(
    request.cookies.get(OAUTH_STATE_COOKIE)?.value,
  );
  const state = request.nextUrl.searchParams.get("state");

  if (!stored || !state || state !== stored.state) {
    return backToAccounts(request, "state-error");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return backToAccounts(request, "missing-code");
  }

  const bank = await db.bankEntity.findFirst({
    where: { id: stored.bankId, active: true },
    select: { id: true },
  });
  if (!bank) {
    return backToAccounts(request, "missing-bank");
  }

  const oauthClient = createGmailOAuthClient(request.nextUrl.origin);
  const { tokens } = await oauthClient.getToken(code);

  // Google solo entrega refresh token la primera vez que se aprueba la app;
  // pedimos prompt=consent justo para que siempre llegue uno.
  if (!tokens.refresh_token) {
    return backToAccounts(request, "missing-refresh-token");
  }

  oauthClient.setCredentials(tokens);
  const profile = await google
    .gmail({ version: "v1", auth: oauthClient })
    .users.getProfile({ userId: "me" });

  const email = profile.data.emailAddress?.toLowerCase();
  if (!email) {
    return backToAccounts(request, "missing-email");
  }

  const credential = await saveGmailCredential({
    userId: session.user.id,
    email,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? null,
    accessTokenExpiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : null,
    scope: tokens.scope ?? null,
  });

  // Reautorizar un buzón ya conectado repara la cuenta existente en vez de
  // duplicarla.
  await db.account.upsert({
    where: {
      userId_email_bankId: {
        userId: session.user.id,
        email,
        bankId: bank.id,
      },
    },
    create: {
      userId: session.user.id,
      email,
      bankId: bank.id,
      credentialId: credential.id,
    },
    update: {
      credentialId: credential.id,
      status: "CONNECTED",
    },
  });

  return backToAccounts(request, "connected");
}
