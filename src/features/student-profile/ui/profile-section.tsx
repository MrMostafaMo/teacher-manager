import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
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
