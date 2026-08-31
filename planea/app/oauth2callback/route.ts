import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { createGmailOAuthClient } from "@/modules/email-sync/gmail-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localOAuthEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_LOCAL_GMAIL_OAUTH === "true"
  );
}

function escapeEnvValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
}

async function upsertEnvValue(name: string, value: string) {
  const envPath = path.join(process.cwd(), ".env");
  let current = "";

  try {
    current = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const escaped = `${name}="${escapeEnvValue(value)}"`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, escaped)
    : `${current.trimEnd()}\n${escaped}\n`;

  await fs.writeFile(envPath, next, "utf8");
  process.env[name] = value;
}

function redirectToAccounts(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/cuentas?gmail=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  if (!localOAuthEnabled()) {
    return NextResponse.json({ error: "OAuth local deshabilitado." }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("gmail_oauth_state")?.value;

  if (!state || !expectedState || state !== expectedState) {
    return redirectToAccounts(request, "state-error");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectToAccounts(request, "missing-code");
  }

  const oauthClient = createGmailOAuthClient(request.nextUrl.origin);
  const { tokens } = await oauthClient.getToken(code);

  if (!tokens.refresh_token) {
    return redirectToAccounts(request, "missing-refresh-token");
  }

  await upsertEnvValue("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);

  const response = redirectToAccounts(request, "authorized");
  response.cookies.delete("gmail_oauth_state");
  return response;
}
