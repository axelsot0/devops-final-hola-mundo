"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategoryBreakdownItem } from "@/modules/transactions/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";

interface ExpensesChartProps {
  data: CategoryBreakdownItem[];
  activeCategoryId?: string;
}

/**
 * Gráfico de pastel con la distribución de gastos del mes.
 * Tocar una categoría (en el gráfico o la leyenda) filtra las transacciones.
 */
export function ExpensesChart({ data, activeCategoryId }: ExpensesChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleCategory = useCallback(
    (categoryId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("categoria") === categoryId) params.delete("categoria");
      else params.set("categoria", categoryId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
        <CardDescription>
          {total > 0
            ? "Toca una categoría para filtrar sus movimientos."
            : "Distribución de tus gastos del mes."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <PieChartIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sin gastos registrados este mes.
            </p>
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-52 w-full max-w-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="95%"
                    paddingAngle={2}
                    strokeWidth={0}
                    onClick={(entry) => {
                      const item = entry as unknown as CategoryBreakdownItem;
                      if (item.categoryId) toggleCategory(item.categoryId);
                    }}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.color ?? "#A1A1A1"}
                        opacity={
                          !activeCategoryId || activeCategoryId === entry.categoryId
                            ? 1
                            : 0.3
                        }
                        className="cursor-pointer outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Total del mes
                </span>
                <span className="text-lg font-bold">{formatMoney(total)}</span>
              </div>
            </div>

            <ul className="mt-4 space-y-1">
              {data.map((item) => {
                const active = activeCategoryId === item.categoryId;
                return (
                  <li key={item.categoryId}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(item.categoryId)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                        active && "bg-accent hover:bg-accent",
                      )}
                    >
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color ?? "#A1A1A1" }}
                      />
                      <span className="min-w-0 flex-1 truncate text-left font-medium">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.percentage}%
                      </span>
                      <span className="w-20 text-right font-semibold tabular-nums">
                        {formatMoney(item.total)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
