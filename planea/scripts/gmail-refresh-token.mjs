/**
 * Obtiene un refresh token de Gmail para la sincronización de correos.
 *
 * Se ejecuta una sola vez, en tu máquina:
 *   node scripts/gmail-refresh-token.mjs
 *
 * Requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el .env (o como
 * variables de entorno). Abre el consentimiento de Google en el navegador,
 * recibe la respuesta en un servidor local y muestra el refresh token para
 * que lo pegues en el .env.
 *
 * No usa dependencias externas: solo módulos de Node.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/** Lee el .env sin dependencias (solo las claves que nos interesan). */
function readEnvFile() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * Guarda el refresh token en el .env: sustituye la línea si ya existe y la
 * añade si no. Así el token no tiene que pasar por el portapapeles ni por un
 * chat, donde quedaría expuesto.
 */
function writeRefreshToken(token) {
  const file = path.join(ROOT, ".env");
  const line = `GOOGLE_REFRESH_TOKEN="${token}"`;
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  // Sin `\s`: en JavaScript `\r` cuenta como fin de línea para `^`, así que
  // `\s*` cruzaría el salto y rompería los separadores en archivos CRLF.
  const pattern = /^[ \t]*GOOGLE_REFRESH_TOKEN[ \t]*=.*$/m;

  const updated = pattern.test(existing)
    ? existing.replace(pattern, line)
    : (existing && !existing.endsWith("\n") ? existing + eol : existing) +
      line +
      eol;

  fs.writeFileSync(file, updated, "utf8");
  return file;
}

const env = { ...readEnvFile(), ...process.env };
const clientId = env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(`
Faltan credenciales.

Añade estas dos líneas a planea/.env y vuelve a ejecutar:

  GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET="...."

Las obtienes en Google Cloud Console -> APIs y servicios -> Credenciales,
creando un ID de cliente de OAuth de tipo "Aplicación de escritorio".
`);
  process.exit(1);
}

// El state evita que una petición ajena complete el flujo por nosotros.
const state = crypto.randomBytes(16).toString("hex");

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Fuerza la pantalla de consentimiento: sin esto Google omite el
    // refresh_token si ya autorizaste antes.
    prompt: "consent",
    state,
  }).toString();

function page(title, body, ok = true) {
  return `<!doctype html><html lang="es"><meta charset="utf-8">
<title>${title}</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#E8E8E8;color:#292929">
<div style="max-width:28rem;padding:2rem;background:#fff;border-radius:1rem;text-align:center">
<div style="font-size:2.5rem">${ok ? "✅" : "⚠️"}</div>
<h1 style="font-size:1.1rem">${title}</h1>
<p style="color:#6f6f6f;font-size:.9rem">${body}</p>
</div></body></html>`;
}

async function exchangeCode(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google respondió ${res.status}: ${data.error_description ?? data.error ?? "error desconocido"}`,
    );
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page("Autorización cancelada", `Google devolvió: ${error}`, false));
    console.error(`\n❌ Autorización cancelada: ${error}`);
    server.close();
    process.exit(1);
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page("Petición no válida", "El parámetro state no coincide.", false));
    console.error("\n❌ El parámetro state no coincide; se descartó la respuesta.");
    server.close();
    process.exit(1);
  }

  try {
    const tokens = await exchangeCode(url.searchParams.get("code"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      page("Listo", "Ya puedes cerrar esta pestaña y volver a la terminal."),
    );

    if (!tokens.refresh_token) {
      console.error(`
❌ Google no devolvió refresh_token.

Suele pasar cuando ya habías autorizado esta aplicación. Entra a
https://myaccount.google.com/permissions, revoca el acceso de la app y
vuelve a ejecutar este script.
`);
      server.close();
      process.exit(1);
    }

    let saved;
    try {
      saved = writeRefreshToken(tokens.refresh_token);
    } catch (e) {
      console.error(`
⚠️  Se obtuvo el token pero no se pudo escribir el .env: ${e.message}

Añade esta línea a mano en planea/.env:

GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"
`);
      server.close();
      process.exit(1);
    }

    // El token no se imprime: quien lo tenga puede leer el correo autorizado.
    console.log(`
✅ Refresh token obtenido y guardado en:
   ${saved}

No se muestra en pantalla a propósito: cualquiera que lo copie podría leer
ese buzón. Trátalo como una contraseña y no lo compartas.

Ahora detén el servidor (Ctrl+C) y vuelve a arrancarlo para que lea el .env:

   npm run dev

Luego prueba «Sincronizar» en la pantalla de Cuentas.
`);
    server.close();
    process.exit(0);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page("Falló el intercambio", e.message, false));
    console.error(`\n❌ ${e.message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
Abre esta URL en tu navegador y autoriza el acceso:

${authUrl}

Esperando la respuesta de Google en ${REDIRECT_URI} …
(Ctrl+C para cancelar)
`);
});
