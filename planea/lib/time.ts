/**
 * El servidor corre en UTC y los usuarios están en República Dominicana.
 *
 * Sin corregirlo, a partir de las 8 de la noche el servidor ya está en el día
 * siguiente: el panel cambiaba de mes y ponía los contadores a cero cuatro
 * horas antes de que terminara el mes de verdad.
 *
 * AST no tiene horario de verano, así que el desfase es fijo y no hace falta
 * arrastrar una base de zonas horarias.
 */
export const AST_OFFSET_MS = 4 * 60 * 60 * 1000;

/** El instante actual visto desde República Dominicana. */
export function nowInAst(now: Date = new Date()): Date {
  return new Date(now.getTime() - AST_OFFSET_MS);
}

/** Año y mes que el usuario tiene en su calendario ahora mismo. */
export function currentYearMonth(now: Date = new Date()) {
  const local = nowInAst(now);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}

/**
 * Límites de un mes en hora local: del día 1 a las 00:00 AST hasta el día 1
 * del mes siguiente a la misma hora, expresados en UTC para consultar.
 */
export function monthBoundsInAst(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month, 1) + AST_OFFSET_MS),
    lt: new Date(Date.UTC(year, month + 1, 1) + AST_OFFSET_MS),
  };
}
