export const OAUTH_STATE_COOKIE = "gmail_oauth_state";

export interface OAuthStateCookie {
  state: string;
  bankId: string;
}

export function parseOAuthStateCookie(
  value: string | undefined,
): OAuthStateCookie | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<OAuthStateCookie>;
    if (!parsed.state || !parsed.bankId) return null;
    return { state: parsed.state, bankId: parsed.bankId };
  } catch {
    return null;
  }
}
