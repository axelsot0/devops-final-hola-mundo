import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { getCurrentBudget } from "@/modules/budgets/service";
import {
  getMonthlyRecurringTotal,
  listRecurringPayments,
} from "@/modules/recurring-payments/service";
import { listCategories } from "@/modules/categories/service";
import { listAccounts } from "@/modules/accounts/service";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetCard } from "./budget-card";
import { RecurringSection } from "./recurring-section";

export const metadata: Metadata = { title: "Presupuesto · Planea" };

export default async function BudgetPage() {
  const user = await requireUser();
  const [budget, payments, monthlyTotal, categories, accounts] =
    await Promise.all([
      getCurrentBudget(user.id),
      listRecurringPayments(user.id),
      getMonthlyRecurringTotal(user.id),
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
      </div>
    </>
  );
}
