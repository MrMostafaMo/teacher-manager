import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryTotals } from "@/features/expenses/application/expense-stats";
import type { Expense } from "@/lib/db/schema";
import { formatMoney } from "@/lib/utils/format";

const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function CategoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-(--popover-shadow)">
      <p className="mb-1 font-medium">{p.name}</p>
      <p className="font-semibold tabular-nums" dir="ltr">
        {formatMoney(Number(p.value))}
      </p>
    </div>
  );
}

/**
 * Donut of the visible month's expenses split by category. Rendered `ltr`
 * so the chart reads naturally regardless of the app direction; `formatMoney`
 * keeps the Arabic values intact inside the tooltip.
 */
export function ExpenseCategoryChart({ rows }: { rows: Expense[] }) {
  const { t } = useTranslation();
  const data = categoryTotals(rows).map((c) => ({
    key: c.category,
    name: t(`expenses.categories.${c.category}`),
    value: c.total,
  }));
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("expenses.byCategory")}</CardTitle>
      </CardHeader>
      <CardContent className="h-56" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
            >
              {data.map((s, i) => (
                <Cell key={s.key} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}