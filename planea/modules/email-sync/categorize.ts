/**
 * Clasificación automática de transacciones por comercio.
 * Asigna una categoría del sistema según palabras clave del comercio;
 * el usuario siempre puede recategorizar manualmente después.
 */

const RULES: { slug: string; keywords: string[] }[] = [
  { slug: "comida", keywords: ["supermercado", "sirena", "jumbo", "pizzarelli", "café", "cafe", "restaurante", "mcdonald", "burger"] },
  { slug: "transporte", keywords: ["uber", "shell", "texaco", "caribe tours", "gasolina", "estación", "estacion"] },
  { slug: "vivienda", keywords: ["alquiler", "edeeste", "edenorte", "edesur", "caasd", "condominio"] },
  { slug: "entretenimiento", keywords: ["cinema", "cine", "steam", "teatro", "playstation"] },
  { slug: "salud", keywords: ["farmacia", "clínica", "clinica", "médico", "medico", "laboratorio", "humano", "senasa"] },
  { slug: "compras", keywords: ["amazon", "zara", "ikea", "ferretería", "ferreteria", "tienda"] },
  { slug: "educacion", keywords: ["universidad", "unibe", "intec", "pucmm", "udemy", "colegio"] },
  { slug: "suscripciones", keywords: ["netflix", "spotify", "icloud", "claro", "altice", "disney", "hbo"] },
  { slug: "transferencias", keywords: ["transferencia", "depósito", "deposito"] },
  { slug: "salario", keywords: ["nómina", "nomina", "salario", "payroll"] },
];

export function inferCategorySlug(
  merchant: string | null,
  description: string,
): string {
  const text = `${merchant ?? ""} ${description}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.slug;
  }
  return "otros";
}
