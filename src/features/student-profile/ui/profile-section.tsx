import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";

export function ProfileSection({
  title,
  meta,
  actions,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <CollapsibleSection
      title={title}
      meta={meta}
      actions={actions}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {children}
    </CollapsibleSection>
  );
}

export function ProfileEmpty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}

interface ProfileTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
}

export function ProfileTable<T>({ columns, rows, getRowKey }: ProfileTableProps<T>) {
  return (
    <Card>
      <CardContent className="p-0">
        <DataTable<T> columns={columns} rows={rows} getRowKey={getRowKey} />
      </CardContent>
    </Card>
  );
}
