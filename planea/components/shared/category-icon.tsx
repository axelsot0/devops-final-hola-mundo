import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  CircleEllipsis,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  Repeat,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  home: Home,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
  repeat: Repeat,
  "arrow-left-right": ArrowLeftRight,
  briefcase: Briefcase,
  "circle-ellipsis": CircleEllipsis,
};

interface CategoryIconProps {
  icon?: string | null;
  color?: string | null;
  className?: string;
}

/** Icono circular de una categoría con su color asignado. */
export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  const Icon = (icon && ICONS[icon]) || CircleEllipsis;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{
        backgroundColor: `${color ?? "#A1A1A1"}1f`,
        color: color ?? "#6f6f6f",
      }}
    >
      <Icon className="size-4.5" strokeWidth={2} />
    </span>
  );
}
