import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/format";

/** Account balance chip for the profile header. Positive = owes money. */
export function BalanceBadge({ balance }: { balance: number }) {
  const { t } = useTranslation();
  if (balance === 0) {
    return <Badge variant="outline">{t("profile.balance.settled")}</Badge>;
  }
  const owed = balance > 0;
  return (
    <Badge variant={owed ? "destructive" : "success"}>
      {owed
        ? `${t("profile.balance.due")} ${formatMoney(balance)}`
        : `${t("profile.balance.credit")} ${formatMoney(-balance)}`}
    </Badge>
  );
}
