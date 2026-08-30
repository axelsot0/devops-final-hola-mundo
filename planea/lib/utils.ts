import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const currencyFormatterCents = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto en pesos dominicanos: RD$12,500 */
export function formatMoney(amount: number, opts?: { cents?: boolean }) {
  const formatted = opts?.cents
    ? currencyFormatterCents.format(amount)
    : currencyFormatter.format(Math.round(amount));
  return formatted.replace("$", "RD$");
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

export function formatDateShort(date: Date | string) {
  return formatDate(date, { year: undefined });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
