"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LogOut, Settings, Sprout } from "lucide-react";

import { NAV_ITEMS, isActivePath } from "./nav-items";
import { logoutAction } from "@/modules/users/actions";
import { BrandLockup } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  user: { name: string; email: string; image: string | null };
}

/** Navegación lateral para escritorio. */
export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/5 bg-card md:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Planea">
          <BrandLockup />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          if (item.central) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "my-2 flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#3E9B94] to-[#206B48] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-transform hover:brightness-105 active:scale-[0.98]",
                  active && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
                )}
              >
                <Sprout className="size-5" strokeWidth={2.2} />
                Crear un Plan
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-6 border-t pt-4">
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Configuración
          </p>
          {[
            { href: "/cuentas", label: "Cuentas conectadas", icon: CreditCard },
            { href: "/perfil", label: "Perfil", icon: Settings },
          ].map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar>
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
