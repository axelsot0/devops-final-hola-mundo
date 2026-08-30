/**
 * Distribución proporcional de aportes para planes grupales.
 *
 * La regla central del producto: el aporte de cada miembro NO se divide en
 * partes iguales, sino en proporción a su capacidad de ahorro mensual.
 * Este módulo es puro (sin acceso a datos) para poder probarlo y reutilizarlo
 * desde el seed, los server actions y la UI de previsualización.
 *
 * Privacidad: las capacidades entran como argumento pero NUNCA salen en el
 * resultado. Lo que devuelve esta función se muestra a todo el grupo, así que
 * solo contiene datos del plan (aporte y proporción) y explicaciones
 * cualitativas, nunca los ingresos o gastos de una persona.
 */

export interface MemberCapacity {
  userId: string;
  name: string;
  /** Capacidad de ahorro mensual estimada (RD$) */
  monthlyCapacity: number;
}

export interface AllocationMember {
  userId: string;
  name: string;
  /** Proporción de la capacidad total del grupo (0-1) */
  capacityShare: number;
  /** Aporte mensual recomendado (RD$) */
  recommendedMonthly: number;
  /** Explicación breve de por qué se asignó ese aporte */
  rationale: string;
}

export interface AllocationResult {
  monthlyTarget: number;
  months: number;
  /** true si la capacidad conjunta del grupo alcanza la meta mensual */
  feasible: boolean;
  members: AllocationMember[];
}

const ROUND_TO = 50; // los aportes se redondean a múltiplos de RD$50

export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  return Math.max(1, months);
}

export function allocatePlan(
  targetAmount: number,
  months: number,
  members: MemberCapacity[],
): AllocationResult {
  const safeMonths = Math.max(1, months);
  const monthlyTarget = targetAmount / safeMonths;
  const totalCapacity = members.reduce(
    (sum, m) => sum + Math.max(0, m.monthlyCapacity),
    0,
  );

  // Sin información financiera útil: repartir en partes iguales como respaldo.
  const equalSplit = totalCapacity <= 0 || members.length === 0;

  const raw = members.map((m) => {
    const capacity = Math.max(0, m.monthlyCapacity);
    const share = equalSplit ? 1 / members.length : capacity / totalCapacity;
    return { ...m, share, exact: monthlyTarget * share };
  });

  // Redondear a múltiplos de ROUND_TO repartiendo el residuo al miembro con
  // mayor capacidad para que la suma cubra exactamente la meta mensual.
  const rounded = raw.map((m) => ({
    ...m,
    amount: Math.round(m.exact / ROUND_TO) * ROUND_TO,
  }));
  const diff =
    Math.round(monthlyTarget) - rounded.reduce((s, m) => s + m.amount, 0);
  if (rounded.length > 0 && diff !== 0) {
    const biggest = rounded.reduce((a, b) => (b.share > a.share ? b : a));
    biggest.amount = Math.max(0, biggest.amount + diff);
  }

  const equalShare = members.length > 0 ? 1 / members.length : 0;
  const resultMembers: AllocationMember[] = rounded.map((m) => {
    const pct = Math.round(m.share * 100);
    return {
      userId: m.userId,
      name: m.name,
      capacityShare: round5(m.share),
      recommendedMonthly: m.amount,
      rationale: equalSplit
        ? `Reparto en partes iguales (${pct}%): no hay suficiente información financiera de los miembros para estimar capacidades.`
        : `Aporta el ${pct}% de la meta mensual porque ${describeCapacity(m.share, equalShare)}.`,
    };
  });

  return {
    monthlyTarget: Math.round(monthlyTarget),
    months: safeMonths,
    feasible: !equalSplit && totalCapacity >= monthlyTarget,
    members: resultMembers,
  };
}

/**
 * Describe la capacidad de forma relativa. Se usa en lugar de montos exactos
 * para no revelar los ingresos de quien mantiene sus finanzas privadas: la
 * proporción ya es pública (se deduce del aporte recomendado).
 */
function describeCapacity(share: number, equalShare: number): string {
  if (equalShare <= 0) return "es la proporción que le corresponde";
  if (share >= equalShare * 1.35) {
    return "su capacidad de ahorro es de las más holgadas del grupo";
  }
  if (share <= equalShare * 0.7) {
    return "su capacidad de ahorro es de las más ajustadas del grupo";
  }
  return "su capacidad de ahorro es cercana al promedio del grupo";
}

function round5(n: number) {
  return Math.round(n * 100000) / 100000;
}
