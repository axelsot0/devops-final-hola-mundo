import crypto from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGmailAuthorizationUrl } from "@/modules/email-sync/gmail-oauth";
import { OAUTH_STATE_COOKIE } from "@/modules/email-sync/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Punto de entrada del "Conectar Gmail": valida la sesión y el banco
 * elegido, firma un state contra CSRF y manda al consentimiento de Google.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const bankId = request.nextUrl.searchParams.get("bankId");
  if (!bankId) {
    return NextResponse.redirect(
      new URL("/cuentas?gmail=missing-bank", request.url),
    );
  }

  const bank = await db.bankEntity.findFirst({
    where: { id: bankId, active: true },
    select: { id: true },
  });
  if (!bank) {
    return NextResponse.redirect(
      new URL("/cuentas?gmail=missing-bank", request.url),
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const response = NextResponse.redirect(
    getGmailAuthorizationUrl(state, request.nextUrl.origin),
  );

  // El banco viaja en la cookie, no en el state que Google devuelve, para
  // que el callback no acepte un banco elegido por un tercero.
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, bankId: bank.id }),
    {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    },
  );

  return response;
}
