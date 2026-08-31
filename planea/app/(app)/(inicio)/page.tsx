import type { Metadata } from "next";
import { Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listAccounts } from "@/modules/accounts/service";
import { listBanks } from "@/modules/banks/service";
import { listCategories } from "@/modules/categories/service";
import {
  getExpensesByCategory,
  getMonthlySummary,
  listTransactions,
  type TransactionFilters,
} from "@/modules/transactions/service";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ExpensesChart } from "./_dashboard/expenses-chart";
import { TransactionsPanel } from "./_dashboard/transactions-panel";

export const metadata: Metadata = { title: "Inicio · Planea" };

interface SearchParams {
  q?: string;
  categoria?: string;
  cuenta?: string;
  tipo?: string;
  banco?: string;
  mes?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const filters: TransactionFilters = {
    q: params.q,
    categoryId: params.categoria,
    accountId: params.cuenta,
    bankId: params.banco,
    type:
      params.tipo === "INCOME" || params.tipo === "EXPENSE"
        ? params.tipo
        : undefined,
    month: params.mes,
  };

  const [summary, breakdown, transactions, categories, accounts, banks, totalCount] =
    await Promise.all([
      getMonthlySummary(user.id),
      getExpensesByCategory(user.id),
      listTransactions(user.id, filters),
      listCategories(user.id),
      listAccounts(user.id),
      listBanks(),
      db.transaction.count({ where: { userId: user.id } }),
    ]);

  const firstName = user.name.split(" ")[0] || user.name;
  const monthLabel = new Date().toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName} 👋`}
        description={`Así van tus finanzas en ${monthLabel}.`}
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {/*
          Dos cosas distintas, y llamarlas igual confundía: el saldo que
          informa el banco en sus correos es el dinero que tienes; el neto
          registrado es solo la resta de lo que Planea ha logrado detectar, y
          se queda corto en cuanto un ingreso llega por un correo que no
          sabemos leer. Se prefiere el saldo real cuando algún banco lo da.
        */}
        {summary.reportedBalance !== null ? (
          <StatCard
            label="Saldo disponible"
            value={formatMoney(summary.reportedBalance)}
            icon={Wallet}
            hint={
              summary.reportedBalanceAt
                ? `Según tu banco, ${formatDate(summary.reportedBalanceAt)}`
                : undefined
            }
          />
        ) : (
          <StatCard
            label="Neto registrado"
            value={formatMoney(summary.recordedNet)}
            icon={Wallet}
            hint="Ingresos menos gastos detectados"
          />
        )}
        <StatCard
          label="Ingresos del mes"
          value={formatMoney(summary.monthIncome)}
          icon={TrendingUp}
          tone="positive"
        />
        <StatCard
          label="Gastos del mes"
          value={formatMoney(summary.monthExpense)}
          icon={TrendingDown}
          tone="negative"
        />
        <StatCard
          label="Diferencia"
          value={`${summary.difference < 0 ? "−" : "+"}${formatMoney(Math.abs(summary.difference))}`}
          icon={Scale}
          tone={summary.difference >= 0 ? "positive" : "negative"}
          hint={summary.difference >= 0 ? "Vas bien este mes" : "Gastas más de lo que ingresas"}
        />
      </div>

      {/* Gráfico + transacciones */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="order-2 lg:order-1">
          <TransactionsPanel
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            banks={banks}
            hasAnyTransactions={totalCount > 0}
          />
        </div>
        <div className="order-1 lg:order-2">
          <ExpensesChart data={breakdown} activeCategoryId={params.categoria} />
        </div>
      </div>
    </>
  );
}
