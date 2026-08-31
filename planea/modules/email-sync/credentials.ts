import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

/** Credencial lista para usar: tokens ya descifrados. */
export interface DecryptedCredential {
  id: string;
  userId: string;
  email: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  revokedAt: Date | null;
}

interface SaveGmailCredentialInput {
  userId: string;
  email: string;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
}

/**
 * Guarda (o renueva) la autorización de un buzón. Reautorizar el mismo
 * correo sustituye los tokens y limpia revokedAt, de modo que el usuario
 * puede arreglar una conexión caída repitiendo el flujo.
 */
export async function saveGmailCredential(input: SaveGmailCredentialInput) {
  const email = input.email.toLowerCase();
  const data = {
    refreshToken: encryptSecret(input.refreshToken),
    accessToken: input.accessToken ? encryptSecret(input.accessToken) : null,
    accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
    scope: input.scope ?? null,
    revokedAt: null,
  };

  return db.emailCredential.upsert({
    where: {
      userId_provider_email: { userId: input.userId, provider: "GMAIL", email },
    },
    create: { userId: input.userId, provider: "GMAIL", email, ...data },
    update: data,
  });
}

function decrypt(credential: {
  id: string;
  userId: string;
  email: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  revokedAt: Date | null;
}): DecryptedCredential {
  return {
    ...credential,
    refreshToken: decryptSecret(credential.refreshToken),
    accessToken: credential.accessToken
      ? decryptSecret(credential.accessToken)
      : null,
  };
}

export async function getGmailCredential(userId: string, email: string) {
  const credential = await db.emailCredential.findUnique({
    where: {
      userId_provider_email: {
        userId,
        provider: "GMAIL",
        email: email.toLowerCase(),
      },
    },
  });
  return credential ? decrypt(credential) : null;
}

export async function getCredentialById(credentialId: string) {
  const credential = await db.emailCredential.findUnique({
    where: { id: credentialId },
  });
  return credential ? decrypt(credential) : null;
}

/** Guarda el access token renovado para no pedir uno nuevo en cada sync. */
export async function updateAccessToken(
  credentialId: string,
  accessToken: string,
  expiresAt: Date | null,
) {
  await db.emailCredential.update({
    where: { id: credentialId },
    data: {
      accessToken: encryptSecret(accessToken),
      accessTokenExpiresAt: expiresAt,
    },
  });
}

/** Google rechazó el refresh token: hay que volver a autorizar. */
export async function markCredentialRevoked(credentialId: string) {
  await db.emailCredential.update({
    where: { id: credentialId },
    data: { revokedAt: new Date() },
  });
}
