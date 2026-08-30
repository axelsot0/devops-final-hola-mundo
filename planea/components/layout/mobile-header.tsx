"use client";

import Link from "next/link";
import { CreditCard, LogOut, Settings } from "lucide-react";

import { logoutAction } from "@/modules/users/actions";
import { BrandLockup } from "@/components/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

interface MobileHeaderProps {
  user: { name: string; email: string; image: string | null };
}

/** Cabecera fija para móvil con acceso al perfil. */
export function MobileHeader({ user }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-black/5 bg-background/90 px-4 backdrop-blur-md md:hidden">
      <Link href="/" aria-label="Planea">
        <BrandLockup className="[&_span:first-child]:size-8 [&_svg]:size-5" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          <Avatar className="size-8">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm font-medium text-foreground">{user.name}</span>
            <span className="block truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <Settings /> Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/cuentas">
              <CreditCard /> Cuentas conectadas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => logoutAction()}
          >
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
