import { Home, PiggyBank, Target, Users, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Botón central de la marca */
  central?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/presupuesto", label: "Presupuesto", icon: Wallet },
  { href: "/plan", label: "Plan", icon: PiggyBank, central: true },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/grupo", label: "Grupo", icon: Users },
];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
