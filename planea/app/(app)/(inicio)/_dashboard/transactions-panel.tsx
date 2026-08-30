"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Inbox, Mail, Plus, Search, SearchX, X } from "lucide-react";

import type { TransactionDTO } from "@/modules/transactions/service";
import type { CategoryDTO } from "@/modules/categories/service";
import type { AccountDTO } from "@/modules/accounts/service";
import type { BankDTO } from "@/modules/banks/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDateShort, formatMoney } from "@/lib/utils";
import { TransactionFormDialog } from "./transaction-form-dialog";

const ALL = "todas";

interface TransactionsPanelProps {
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  banks: BankDTO[];
  hasAnyTransactions: boolean;
}

export function TransactionsPanel({
  transactions,
  categories,
  accounts,
  banks,
  hasAnyTransactions,
}: TransactionsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === ALL || value === "") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam("q", value || null), 350);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const activeFilters = ["categoria", "cuenta", "tipo", "banco", "mes", "q"].filter(
    (k) => searchParams.get(k),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Transacciones</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Agregar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Búsqueda y filtros */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por comercio o descripción…"
              className="pl-9"
              aria-label="Buscar transacciones"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Select
              value={searchParams.get("tipo") ?? ALL}
              onValueChange={(v) => setParam("tipo", v)}
            >
              <SelectTrigger className="h-9 md:h-9 text-sm" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                <SelectItem value="INCOME">Ingresos</SelectItem>
                <SelectItem value="EXPENSE">Gastos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={searchParams.get("categoria") ?? ALL}
              onValueChange={(v) => setParam("categoria", v)}
            >
              <SelectTrigger className="h-9 md:h-9 text-sm" aria-label="Filtrar por categoría">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={searchParams.get("cuenta") ?? ALL}
              onValueChange={(v) => setParam("cuenta", v)}
            >
              <SelectTrigger className="h-9 md:h-9 text-sm" aria-label="Filtrar por cuenta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las cuentas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nickname || a.bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={searchParams.get("banco") ?? ALL}
              onValueChange={(v) => setParam("banco", v)}
            >
              <SelectTrigger className="h-9 md:h-9 text-sm" aria-label="Filtrar por banco">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los bancos</SelectItem>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={searchParams.get("mes") ?? ""}
              onChange={(e) => setParam("mes", e.target.value || null)}
              className="col-span-2 h-9 md:h-9 text-sm sm:col-span-1"
              aria-label="Filtrar por mes"
            />
          </div>
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                router.replace(pathname, { scroll: false });
              }}
              className="inline-flex w-fit cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <X className="size-3.5" /> Limpiar filtros ({activeFilters.length})
            </button>
          )}
        </div>

        {/* Lista */}
        {transactions.length === 0 ? (
          hasAnyTransactions ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              description="Ningún movimiento coincide con los filtros seleccionados."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No encontramos movimientos todavía"
              description="Conecta una cuenta para comenzar a organizar tus finanzas."
            >
              <Button asChild variant="secondary">
                <Link href="/cuentas">Conectar una cuenta</Link>
              </Button>
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-border/70">
            {transactions.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="flex w-full cursor-pointer items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50 sm:rounded-lg sm:px-2"
                >
                  <CategoryIcon icon={t.category?.icon} color={t.category?.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.merchant || t.description || t.category?.name || "Movimiento"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{formatDateShort(t.date)}</span>
                      {t.category && <span>· {t.category.name}</span>}
                      {t.account && (
                        <span className="hidden sm:inline">· {t.account.bankName}</span>
                      )}
                      {t.source === "EMAIL" && (
                        <Badge variant="secondary" className="px-1.5 py-0">
                          <Mail /> correo
                        </Badge>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold tabular-nums",
                      t.type === "INCOME" ? "text-success" : "text-foreground",
                    )}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <TransactionFormDialog
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        accounts={accounts}
      />
      <TransactionFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        categories={categories}
        accounts={accounts}
        transaction={editing}
      />
    </Card>
  );
}
