# Planea

Aplicación web responsive para gestionar finanzas personales y grupales:
registra ingresos y gastos, arma presupuestos, define metas de ahorro y crea
planes de ahorro en grupo donde el aporte de cada persona se calcula según su
capacidad financiera, no dividiendo en partes iguales.

## Cómo correrlo

Necesitas **Node.js 20+** y una base **PostgreSQL 16**. Elige abajo cómo
conseguir la base; el resto de los pasos es el mismo en todos los casos.

### 1. Copia el archivo de entorno

macOS y Linux:

```bash
cd planea
cp .env.example .env
```

Windows (símbolo del sistema, `cmd`):

```bat
cd planea
copy .env.example .env
```

Windows (PowerShell):

```powershell
cd planea
Copy-Item .env.example .env
```

> `copy` es de `cmd` y `Copy-Item` es de PowerShell: usa el que corresponda a
> la terminal que tengas abierta, o los comandos fallarán con «no se reconoce
> como un comando interno o externo».

### 2. Levanta PostgreSQL

**Opción A — Docker** (la más rápida si ya lo tienes instalado y abierto):

```bash
docker compose up -d
```

Los valores por defecto del `.env` ya apuntan a esta base, no hay nada que
cambiar.

**Opción B — PostgreSQL instalado en tu equipo.** Instálalo desde
[postgresql.org/download](https://www.postgresql.org/download/), crea la base y
el usuario, y ajusta `DATABASE_URL` en el `.env`:

```sql
CREATE USER planea WITH PASSWORD 'planea' CREATEDB;
CREATE DATABASE planea_dev OWNER planea;
```

**Opción C — Base en la nube, sin instalar nada.** Crea un proyecto gratuito en
[Supabase](https://supabase.com) o [Neon](https://neon.tech) y pega su cadena de
conexión en `DATABASE_URL` dentro del `.env`.

En Supabase, dentro de tu proyecto:

1. Pulsa **Connect** en la barra superior.
2. En la lista de cadenas elige la de **Session pooler** — su host contiene
   `pooler.supabase.com` y termina en el puerto `5432`.
3. Cópiala y sustituye `[YOUR-PASSWORD]` por la contraseña que definiste al
   crear el proyecto. Queda parecida a:

```
DATABASE_URL="postgresql://postgres.abcdefgh:TU-CLAVE@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> Dos avisos que ahorran un rato de depuración. **No uses la cadena del
> «Transaction pooler» (puerto 6543)** para preparar la base: usa sentencias
> preparadas de forma incompatible con `prisma db push` y el comando falla.
> Y la **«Direct connection»** (host `db.xxxx.supabase.co`) en proyectos
> nuevos solo responde por IPv6, que muchas redes domésticas no alcanzan; por
> eso el Session pooler es la opción segura.

### 3. Instala, prepara la base y arranca

```bash
npm install
npm run db:push               # crea las tablas
npm run db:seed               # carga datos de demostración
npm run dev                   # http://localhost:3000
```

### Usuarios de demostración

Todos usan la contraseña **`Demo1234!`**

| Correo                    | Perfil                                                  |
| ------------------------- | ------------------------------------------------------- |
| `valeria@demo.planea.do`  | Ingresos altos, administradora del grupo "Viaje a Japón" |
| `ana@demo.planea.do`      | Ingresos medios, comparte sus finanzas                   |
| `luis@demo.planea.do`     | Ingresos bajos, mantiene sus finanzas **privadas**       |

Entra con los tres para ver cómo cambia la privacidad dentro de un mismo grupo.
El link de invitación de ejemplo es `/invitacion/demo-japon-2026`.

> Los datos son ficticios y se generan con el seed. No se usa información
> financiera real en ningún momento.

## Qué incluye

- **Inicio** — balance, ingresos y gastos del mes, gráfico de pastel por
  categoría (tocar una categoría filtra los movimientos) y listado de
  transacciones con búsqueda y filtros por categoría, cuenta, fecha, tipo y
  entidad bancaria.
- **Presupuesto** — CRUD de pagos recurrentes y una propuesta mensual generada
  a partir de ingresos promedio, gastos históricos, pagos recurrentes y metas;
  editable a mano.
- **Plan** — el botón central: eliges grupo, monto y fecha, y el sistema reparte
  el aporte mensual de forma proporcional a la capacidad de ahorro de cada
  miembro, explicando brevemente por qué le tocó ese monto.
- **Metas** — metas de ahorro personales con progreso y aportes.
- **Grupo** — grupos, miembros y administradores, links de invitación
  (generar, copiar, compartir, revocar y regenerar) y privacidad financiera
  configurable **por grupo**.
- **Cuentas** — cuentas conectadas por correo a una entidad bancaria, con
  sincronización que detecta transacciones desde los correos del banco.

## Detección de transacciones desde el correo

Cada entidad bancaria guarda las reglas para reconocer sus correos
(remitentes, dominios, asuntos, palabras clave y el formato esperado). Al
sincronizar una cuenta el sistema busca solo los correos de esa entidad, los
analiza, extrae tipo de movimiento, monto, fecha, comercio, descripción y
moneda, clasifica la transacción y guarda una referencia al correo original.
Nunca registra dos veces el mismo mensaje.

En desarrollo la bandeja se simula (`modules/email-sync/mock-inbox.ts`) para no
depender de credenciales ni de datos reales. La integración real con la Gmail
API vía OAuth 2.0 se conecta implementando la interfaz `EmailProvider` de
`modules/email-sync/provider.ts`; el resto del flujo no cambia.

### Conectar Gmail de verdad

Opcional: sin esto la app funciona con la bandeja simulada.

1. En [Google Cloud Console](https://console.cloud.google.com) crea un proyecto
   y activa la **API de Gmail**.
2. En **APIs y servicios → Pantalla de consentimiento**, elige tipo **Externo**,
   déjala en modo **Prueba** y añade tu propio correo en *Usuarios de prueba*.
3. En **Credenciales**, crea un *ID de cliente de OAuth* de tipo
   **Aplicación de escritorio**. Este tipo usa `http://127.0.0.1` como destino,
   así que no hay que registrar ningún dominio.
4. Copia el ID y el secreto a tu `.env` como `GOOGLE_CLIENT_ID` y
   `GOOGLE_CLIENT_SECRET`.
5. Ejecuta una sola vez:

   ```bash
   node scripts/gmail-refresh-token.mjs
   ```

   Abre la URL que imprime, autoriza el acceso y pega en el `.env` el
   `GOOGLE_REFRESH_TOKEN` que devuelve.

> Mientras la pantalla de consentimiento siga en modo **Prueba**, Google caduca
> el refresh token a los 7 días y habrá que volver a generarlo. Para que dure,
> hay que publicar la aplicación; con el permiso `gmail.readonly` eso exige
> pasar la verificación de Google.

El permiso solicitado es `gmail.readonly`: la app solo lee correos, nunca
envía ni modifica nada.

## Privacidad financiera

Cada persona decide, **grupo por grupo**, si comparte sus finanzas. Cuando las
mantiene privadas, el sistema sigue usando sus datos internamente para repartir
los aportes de un plan, pero los montos se redactan en el servidor antes de
llegar al navegador (`getGroupMemberFinances`), y las explicaciones del reparto
son cualitativas para no revelar ingresos exactos.

## Arquitectura

```
app/            rutas y componentes de pantalla (App Router)
  (auth)/       registro, login, recuperación de contraseña
  (app)/        pantallas autenticadas, con navegación compartida
  invitacion/   página pública para aceptar invitaciones
components/     UI reutilizable (ui/ estilo shadcn, shared/, layout/)
modules/        un módulo por dominio, con service/actions/schemas separados
  users · accounts · banks · email-sync · transactions · categories
  budgets · recurring-payments · savings-goals · groups · invitations
  group-plans
lib/            cliente Prisma, sesión, utilidades
prisma/         schema, migraciones y seed
```

Cada módulo separa el acceso a datos (`service.ts`), las reglas de negocio
expuestas como Server Actions (`actions.ts`) y la validación con Zod
(`schemas.ts`). Los componentes de React no consultan la base de datos
directamente.

## Seguridad

- Contraseñas con hash bcrypt y sesiones JWT firmadas (Auth.js).
- Toda ruta protegida resuelve la sesión en el servidor (`requireUser`).
- Cada Server Action revalida la sesión (`requireUserId`) y comprueba que el
  recurso pertenezca al usuario antes de leerlo o modificarlo.
- El acceso a grupos pasa por `requireMembership` / `requireAdmin`; pedir un
  grupo ajeno devuelve 404.
- Los datos financieros privados se redactan en el servidor, no se ocultan solo
  en la interfaz.
- Los tokens de restablecimiento de contraseña se guardan hasheados, expiran en
  una hora y son de un solo uso.

## Stack

TypeScript · Next.js (App Router, Server Components y Server Actions) ·
Tailwind CSS · componentes estilo shadcn/ui sobre Radix · PostgreSQL · Prisma ·
Auth.js · Zod · Recharts · Lucide.

## Comandos

| Comando            | Qué hace                                |
| ------------------ | --------------------------------------- |
| `npm run dev`      | Servidor de desarrollo                  |
| `npm run build`    | Compilación de producción               |
| `npm start`        | Sirve la compilación de producción      |
| `npm run lint`     | ESLint                                  |
| `npm run db:push`  | Sincroniza el esquema con la base       |
| `npm run db:seed`  | Carga los datos de demostración         |
| `npm run db:migrate` | Aplica migraciones (producción)       |

## Despliegue

Pensado para Vercel con Supabase PostgreSQL: define `DATABASE_URL` y
`AUTH_SECRET` como variables de entorno y ejecuta `npm run db:migrate` contra
la base de producción. La autenticación es por correo y contraseña, así que no
requiere registrar un dominio con ningún proveedor externo.
