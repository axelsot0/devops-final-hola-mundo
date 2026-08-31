import crypto from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { getGmailAuthorizationUrl } from "@/modules/email-sync/gmail-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localOAuthEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_LOCAL_GMAIL_OAUTH === "true"
  );
}

export async function GET(request: NextRequest) {
  if (!localOAuthEnabled()) {
    return NextResponse.json({ error: "OAuth local deshabilitado." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = getGmailAuthorizationUrl(state, request.nextUrl.origin);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}
