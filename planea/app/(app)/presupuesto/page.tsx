import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { getCurrentBudget } from "@/modules/budgets/service";
import {
  listRecurringPayments,
  monthlyEquivalent,
} from "@/modules/recurring-payments/service";
import {
  getMonthlyIncomeTotal,
  listRecurringIncomes,
} from "@/modules/recurring-incomes/service";
import { listCategories } from "@/modules/categories/service";
import { listAccounts } from "@/modules/accounts/service";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetCard } from "./budget-card";
import { RecurringSection } from "./recurring-section";
import { IncomesSection } from "./incomes-section";

export const metadata: Metadata = { title: "Presupuesto · Planea" };

export default async function BudgetPage() {
  const user = await requireUser();
  const budget = await getCurrentBudget(user.id);
  const payments = await listRecurringPayments(user.id);
  const monthlyTotal = payments.reduce(
    (sum, payment) =>
      payment.status === "ACTIVE"
        ? sum + monthlyEquivalent(payment.amount, payment.periodicity)
        : sum,
    0,
  );
  const incomes = await listRecurringIncomes(user.id);
  const incomeTotal = await getMonthlyIncomeTotal(user.id);
  const [categories, accounts] = await Promise.all([
    listCategories(user.id),
    listAccounts(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Presupuesto"
        description="Organiza tus compromisos y decide cuánto ahorrar cada mes."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <BudgetCard budget={budget} />
        <RecurringSection
          payments={payments}
          categories={categories}
          accounts={accounts}
          monthlyTotal={monthlyTotal}
        />
        <IncomesSection
          incomes={incomes}
          categories={categories}
          accounts={accounts}
          monthlyTotal={incomeTotal}
        />
      </div>
    </>
  );
}
