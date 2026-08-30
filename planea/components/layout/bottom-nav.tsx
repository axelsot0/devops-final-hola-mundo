"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";

import { NAV_ITEMS, isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Barra de navegación inferior fija para móvil.
 * El botón central "Plan" usa el isotipo de la marca y tiene mayor jerarquía.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          if (item.central) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex flex-col items-center justify-center"
              >
                <span
                  className={cn(
                    "-mt-7 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#3E9B94] to-[#206B48] text-white shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95",
                    active && "from-[#206B48] to-[#14533a]",
                  )}
                >
                  <Sprout className="size-7" strokeWidth={2.2} />
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[10px] font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5.5", active && "fill-primary/15")} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
