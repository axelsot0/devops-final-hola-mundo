import crypto from "node:crypto";

/**
 * Cifrado simétrico para los secretos que sí tenemos que guardar en la base
 * de datos: hoy, los refresh tokens de Gmail de cada usuario.
 *
 * AES-256-GCM añade una etiqueta de autenticación, así que un valor
 * manipulado en la base falla al descifrar en vez de devolver basura.
 *
 * La clave vive en ENCRYPTION_KEY (32 bytes en base64):
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Falta ENCRYPTION_KEY. Genera una con: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe ser de 32 bytes en base64 (recibidos ${key.length}).`,
    );
  }

  return key;
}

/** Devuelve "iv.tag.ciphertext" en base64url. */
export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, ciphertext] = payload
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));

  if (!iv || !tag || !ciphertext) {
    throw new Error("Secreto cifrado con formato inválido.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
