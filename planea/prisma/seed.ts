/**
 * Seed de desarrollo: datos ficticios que permiten visualizar todas las
 * pantallas sin usar información financiera real.
 *
 * Usuarios demo (contraseña para todos: Demo1234!)
 *  - valeria@demo.planea.do  → ingresos altos, admin de los grupos
 *  - ana@demo.planea.do      → ingresos medios
 *  - luis@demo.planea.do     → ingresos bajos, privacidad PRIVATE en el grupo
 */
import {
  PrismaClient,
  TransactionType,
  TransactionSource,
  Periodicity,
  GroupRole,
  PrivacyMode,
} from "../lib/generated/prisma";
import bcrypt from "bcryptjs";
import { allocatePlan } from "../modules/group-plans/allocation";

const db = new PrismaClient();

// RNG determinista para que el seed sea reproducible
let rngState = 42;
function rand() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
}
function randBetween(min: number, max: number) {
  return Math.round((min + rand() * (max - min)) / 10) * 10;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

const BANKS = [
  {
    name: "Banco Popular",
    slug: "banco-popular",
    color: "#005baa",
    senderAddresses: ["notificaciones@popularenlinea.com.do"],
    senderDomains: ["popularenlinea.com.do", "bpd.com.do"],
    subjectPatterns: ["Notificación de transacción", "Aviso de consumo"],
    keywords: ["consumo", "tarjeta", "monto", "RD$"],
    parserKey: "generic-es",
  },
  {
    name: "Banreservas",
    slug: "banreservas",
    color: "#00529c",
    senderAddresses: ["alertas@banreservas.com"],
    senderDomains: ["banreservas.com"],
    subjectPatterns: ["Alerta de transacción", "Notificación Banreservas"],
    keywords: ["transacción", "monto", "cuenta"],
    parserKey: "generic-es",
  },
  {
    name: "Banco BHD",
    slug: "banco-bhd",
    color: "#00713d",
    senderAddresses: ["avisos@bhd.com.do"],
    senderDomains: ["bhd.com.do"],
    subjectPatterns: ["Aviso de transacción BHD"],
    keywords: ["consumo", "retiro", "depósito"],
    parserKey: "generic-es",
  },
  {
    name: "Scotiabank RD",
    slug: "scotiabank-rd",
    color: "#ec111a",
    senderAddresses: ["alertas@scotiabank.com.do"],
    senderDomains: ["scotiabank.com.do"],
    subjectPatterns: ["ScotiaAlertas"],
    keywords: ["compra", "monto"],
    parserKey: "generic-es",
  },
  {
    name: "APAP",
    slug: "apap",
    color: "#f26522",
    senderAddresses: ["notificaciones@apap.com.do"],
    senderDomains: ["apap.com.do"],
    subjectPatterns: ["Notificación de movimiento"],
    keywords: ["movimiento", "monto"],
    parserKey: "generic-es",
  },
];

const CATEGORIES = [
  { name: "Comida", slug: "comida", icon: "utensils", color: "#3E9B94" },
  { name: "Transporte", slug: "transporte", icon: "bus", color: "#5B8DB8" },
  { name: "Vivienda", slug: "vivienda", icon: "home", color: "#206B48" },
  { name: "Entretenimiento", slug: "entretenimiento", icon: "clapperboard", color: "#E0755B" },
  { name: "Salud", slug: "salud", icon: "heart-pulse", color: "#C9678F" },
  { name: "Compras", slug: "compras", icon: "shopping-bag", color: "#F0B75B" },
  { name: "Educación", slug: "educacion", icon: "graduation-cap", color: "#9B7BC9" },
  { name: "Suscripciones", slug: "suscripciones", icon: "repeat", color: "#7BCDC7" },
  { name: "Transferencias", slug: "transferencias", icon: "arrow-left-right", color: "#8A9A5B" },
  { name: "Salario", slug: "salario", icon: "briefcase", color: "#3E9B94" },
  { name: "Otros", slug: "otros", icon: "circle-ellipsis", color: "#A1A1A1" },
] as const;

const MERCHANTS: Record<string, { name: string; min: number; max: number }[]> = {
  comida: [
    { name: "Supermercado Nacional", min: 1800, max: 6500 },
    { name: "La Sirena", min: 1200, max: 4800 },
    { name: "Jumbo", min: 1500, max: 5200 },
    { name: "Pizzarelli", min: 700, max: 1900 },
    { name: "Café del Parque", min: 250, max: 800 },
  ],
  transporte: [
    { name: "Uber", min: 250, max: 900 },
    { name: "Estación Shell", min: 1000, max: 3000 },
    { name: "Caribe Tours", min: 400, max: 1200 },
  ],
  entretenimiento: [
    { name: "Caribbean Cinemas", min: 500, max: 1500 },
    { name: "Steam", min: 600, max: 2500 },
    { name: "Teatro Nacional", min: 800, max: 2000 },
  ],
  salud: [
    { name: "Farmacia Carol", min: 400, max: 2500 },
    { name: "Centro Médico Integral", min: 1500, max: 5000 },
  ],
  compras: [
    { name: "Amazon", min: 900, max: 6000 },
    { name: "Zara Ágora Mall", min: 1500, max: 5500 },
    { name: "Ferretería Americana", min: 500, max: 2500 },
  ],
  suscripciones: [
    { name: "Netflix", min: 650, max: 650 },
    { name: "Spotify", min: 380, max: 380 },
    { name: "iCloud", min: 180, max: 180 },
  ],
};

interface UserSpec {
  name: string;
  email: string;
  bankSlug: string;
  accountEmail: string;
  nickname: string;
  salary: number;
  rent: number | null;
  variableBudget: number; // gasto variable mensual aproximado
}

const USERS: UserSpec[] = [
  {
    name: "Valeria Gómez",
    email: "valeria@demo.planea.do",
    bankSlug: "banco-popular",
    accountEmail: "valeria.gomez@gmail.com",
    nickname: "Cuenta principal",
    salary: 95000,
    rent: 25000,
    variableBudget: 28000,
  },
  {
    name: "Ana Rodríguez",
    email: "ana@demo.planea.do",
    bankSlug: "banreservas",
    accountEmail: "ana.rodriguez@gmail.com",
    nickname: "Nómina",
    salary: 60000,
    rent: 15000,
    variableBudget: 22000,
  },
  {
    name: "Luis Peralta",
    email: "luis@demo.planea.do",
    bankSlug: "apap",
    accountEmail: "luis.peralta@gmail.com",
    nickname: "Cuenta de ahorros",
    salary: 38000,
    rent: null, // vive con familia
    variableBudget: 21000,
  },
];

function monthStart(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - offset, 1));
}

function dayInMonth(offset: number, day: number) {
  const start = monthStart(offset);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day, 12 + Math.floor(rand() * 8), Math.floor(rand() * 60)));
}

async function main() {
  console.log("🌱 Limpiando datos previos…");
  await db.planContribution.deleteMany();
  await db.planMember.deleteMany();
  await db.groupPlan.deleteMany();
  await db.groupInvitation.deleteMany();
  await db.groupMember.deleteMany();
  await db.group.deleteMany();
  await db.transaction.deleteMany();
  await db.emailMessage.deleteMany();
  await db.recurringPayment.deleteMany();
  await db.budget.deleteMany();
  await db.savingsGoal.deleteMany();
  await db.account.deleteMany();
  await db.category.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();
  await db.bankEntity.deleteMany();

  console.log("🏦 Entidades bancarias…");
  const banks = new Map<string, string>();
  for (const b of BANKS) {
    const bank = await db.bankEntity.create({ data: b });
    banks.set(b.slug, bank.id);
  }

  console.log("🏷️ Categorías del sistema…");
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await db.category.create({ data: { ...c, isSystem: true } });
    categories.set(c.slug, cat.id);
  }

  console.log("👤 Usuarios, cuentas y transacciones…");
  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const userIds = new Map<string, string>();
  const capacities: { userId: string; name: string; monthlyCapacity: number }[] = [];

  for (const spec of USERS) {
    const user = await db.user.create({
      data: { name: spec.name, email: spec.email, passwordHash },
    });
    userIds.set(spec.email, user.id);

    const account = await db.account.create({
      data: {
        userId: user.id,
        email: spec.accountEmail,
        bankId: banks.get(spec.bankSlug)!,
        nickname: spec.nickname,
        lastSyncAt: new Date(),
      },
    });

    const bank = BANKS.find((b) => b.slug === spec.bankSlug)!;
    let emailSeq = 0;

    // 4 meses de historial (mes actual incluido, parcial)
    for (let offset = 3; offset >= 0; offset--) {
      const now = new Date();
      const daysInMonth =
        offset === 0
          ? now.getUTCDate()
          : new Date(Date.UTC(monthStart(offset).getUTCFullYear(), monthStart(offset).getUTCMonth() + 1, 0)).getUTCDate();

      // Salario a fin de mes anterior / quincena
      if (daysInMonth >= 28 || offset > 0) {
        await db.transaction.create({
          data: {
            userId: user.id,
            accountId: account.id,
            type: TransactionType.INCOME,
            amount: spec.salary,
            merchant: "Nómina",
            description: "Pago de nómina mensual",
            date: dayInMonth(offset, Math.min(28, daysInMonth)),
            categoryId: categories.get("salario")!,
            source: TransactionSource.MANUAL,
          },
        });
      }

      // Alquiler
      if (spec.rent && daysInMonth >= 3) {
        await db.transaction.create({
          data: {
            userId: user.id,
            accountId: account.id,
            type: TransactionType.EXPENSE,
            amount: spec.rent,
            merchant: "Alquiler apartamento",
            description: "Pago mensual de alquiler",
            date: dayInMonth(offset, 3),
            categoryId: categories.get("vivienda")!,
            source: TransactionSource.MANUAL,
          },
        });
      }

      // Gastos variables detectados desde correos (mock)
      const slugs = Object.keys(MERCHANTS);
      let spent = 0;
      const target = spec.variableBudget * (offset === 0 ? daysInMonth / 30 : 1);
      let guard = 0;
      while (spent < target && guard < 40) {
        guard++;
        const slug = pick(slugs);
        const merchant = pick(MERCHANTS[slug]!);
        const amount = randBetween(merchant.min, merchant.max);
        if (spent + amount > target * 1.15) continue;
        spent += amount;
        const day = 1 + Math.floor(rand() * Math.max(1, daysInMonth - 1));
        const date = dayInMonth(offset, day);
        emailSeq++;
        const externalId = `mock-${spec.bankSlug}-${user.id.slice(-6)}-${offset}-${emailSeq}`;
        const email = await db.emailMessage.create({
          data: {
            accountId: account.id,
            externalId,
            fromAddress: bank.senderAddresses[0]!,
            subject: `${bank.subjectPatterns[0]}: consumo en ${merchant.name}`,
            snippet: `Le informamos que se realizó un consumo por RD$${amount.toLocaleString("es-DO")} en ${merchant.name} con su tarjeta terminada en 4321.`,
            receivedAt: date,
          },
        });
        await db.transaction.create({
          data: {
            userId: user.id,
            accountId: account.id,
            type: TransactionType.EXPENSE,
            amount,
            merchant: merchant.name,
            description: `Consumo detectado desde correo de ${bank.name}`,
            date,
            categoryId: categories.get(slug)!,
            source: TransactionSource.EMAIL,
            externalRef: externalId,
            emailId: email.id,
          },
        });
      }
    }

    // Pagos recurrentes
    const nextMonth = monthStart(-1);
    const recurring: { name: string; slug: string; amount: number; day: number }[] = [
      { name: "Internet Claro", slug: "suscripciones", amount: 2300, day: 5 },
      { name: "Netflix", slug: "suscripciones", amount: 650, day: 12 },
      { name: "Plan móvil", slug: "suscripciones", amount: 1100, day: 8 },
    ];
    if (spec.rent) recurring.unshift({ name: "Alquiler", slug: "vivienda", amount: spec.rent, day: 3 });
    if (spec.email.startsWith("ana")) recurring.push({ name: "Universidad UNIBE", slug: "educacion", amount: 9500, day: 15 });
    if (spec.email.startsWith("valeria")) recurring.push({ name: "Seguro médico Humano", slug: "salud", amount: 3800, day: 20 });

    let recurringTotal = 0;
    for (const r of recurring) {
      recurringTotal += r.amount;
      await db.recurringPayment.create({
        data: {
          userId: user.id,
          name: r.name,
          categoryId: categories.get(r.slug)!,
          amount: r.amount,
          periodicity: Periodicity.MONTHLY,
          nextDueDate: new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), r.day)),
          accountId: account.id,
        },
      });
    }

    // Presupuesto del mes actual (auto-generado)
    const variable = spec.variableBudget;
    const savings = Math.max(0, Math.round((spec.salary - recurringTotal - variable) * 0.5 / 100) * 100);
    const now = new Date();
    await db.budget.create({
      data: {
        userId: user.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        income: spec.salary,
        recurringExpenses: recurringTotal,
        variableExpenses: variable,
        savings,
        isAutoGenerated: true,
      },
    });

    // Capacidad de ahorro estimada para el plan grupal
    const available = spec.salary - recurringTotal - variable;
    capacities.push({
      userId: user.id,
      name: spec.name,
      monthlyCapacity: Math.max(0, Math.round(available * 0.6)),
    });
  }

  console.log("🎯 Metas personales…");
  const goalSpecs: { email: string; name: string; description: string; target: number; saved: number; monthsAhead: number }[] = [
    { email: "valeria@demo.planea.do", name: "Fondo de emergencia", description: "Reserva equivalente a 3 meses de gastos", target: 150000, saved: 62000, monthsAhead: 10 },
    { email: "valeria@demo.planea.do", name: "Laptop nueva", description: "MacBook para trabajo freelance", target: 85000, saved: 31500, monthsAhead: 5 },
    { email: "ana@demo.planea.do", name: "Inicial del carro", description: "Ahorro para la inicial", target: 200000, saved: 48000, monthsAhead: 14 },
    { email: "luis@demo.planea.do", name: "Curso de inglés", description: "Programa intensivo", target: 30000, saved: 12000, monthsAhead: 4 },
  ];
  for (const g of goalSpecs) {
    const now = new Date();
    await db.savingsGoal.create({
      data: {
        userId: userIds.get(g.email)!,
        name: g.name,
        description: g.description,
        targetAmount: g.target,
        savedAmount: g.saved,
        targetDate: new Date(Date.UTC(now.getFullYear(), now.getMonth() + g.monthsAhead, 1)),
      },
    });
  }

  console.log("👥 Grupos, invitaciones y plan grupal…");
  const valeriaId = userIds.get("valeria@demo.planea.do")!;
  const anaId = userIds.get("ana@demo.planea.do")!;
  const luisId = userIds.get("luis@demo.planea.do")!;

  const japon = await db.group.create({
    data: {
      name: "Viaje a Japón",
      description: "Ahorro conjunto para el viaje de fin de año",
      emoji: "✈️",
      createdById: valeriaId,
      members: {
        create: [
          { userId: valeriaId, role: GroupRole.ADMIN, privacy: PrivacyMode.SHARED },
          { userId: anaId, role: GroupRole.MEMBER, privacy: PrivacyMode.SHARED },
          { userId: luisId, role: GroupRole.MEMBER, privacy: PrivacyMode.PRIVATE },
        ],
      },
    },
  });

  await db.group.create({
    data: {
      name: "Familia",
      description: "Gastos y metas compartidas de la familia",
      emoji: "🏠",
      createdById: anaId,
      members: {
        create: [
          { userId: anaId, role: GroupRole.ADMIN, privacy: PrivacyMode.SHARED },
          { userId: valeriaId, role: GroupRole.MEMBER, privacy: PrivacyMode.PRIVATE },
        ],
      },
    },
  });

  await db.groupInvitation.create({
    data: {
      groupId: japon.id,
      token: "demo-japon-2026",
      createdById: valeriaId,
    },
  });

  // Plan grupal: RD$120,000 en 6 meses, distribuido según capacidad
  const now = new Date();
  const targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 6, 1));
  const allocation = allocatePlan(120000, 6, capacities);

  const plan = await db.groupPlan.create({
    data: {
      groupId: japon.id,
      name: "Vuelos y hoteles",
      description: "Primera fase del viaje: boletos aéreos y hospedaje",
      targetAmount: 120000,
      targetDate,
      createdById: valeriaId,
    },
  });

  for (const m of allocation.members) {
    const planMember = await db.planMember.create({
      data: {
        planId: plan.id,
        userId: m.userId,
        recommendedMonthly: m.recommendedMonthly,
        capacityShare: m.capacityShare,
        rationale: m.rationale,
      },
    });
    // Aportes del primer mes (algunos completos, otros parciales)
    const factor = m.userId === luisId ? 0.5 : 1;
    await db.planContribution.create({
      data: {
        planMemberId: planMember.id,
        amount: Math.round(m.recommendedMonthly * factor),
        date: dayInMonth(0, Math.min(10, now.getUTCDate() || 1)),
        note: factor === 1 ? "Aporte del mes" : "Aporte parcial",
      },
    });
  }

  console.log("✅ Seed completado.");
  console.log("   Usuarios demo (contraseña Demo1234!):");
  for (const u of USERS) console.log(`   - ${u.email}`);
  console.log("   Link de invitación demo: /invitacion/demo-japon-2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
