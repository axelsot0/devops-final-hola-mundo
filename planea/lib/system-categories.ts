/**
 * Categorías del sistema (isSystem: true).
 *
 * Vive fuera del seed porque también las necesita el backfill de correos:
 * si la lista se duplicara, una base sembrada a medias quedaría sin las
 * categorías que la clasificación automática espera encontrar.
 */
export const SYSTEM_CATEGORIES = [
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
];
