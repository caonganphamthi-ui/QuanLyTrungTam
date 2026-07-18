import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function CrudTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  onEdit,
  onDelete,
}: {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
            {(onEdit || onDelete) && <TableHead className="text-right w-32">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                Đang tải...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.render ? c.render(row) : ((row as any)[c.key] ?? "—")}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {onEdit && (
                        <Button size="icon" variant="ghost" onClick={() => onEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button size="icon" variant="ghost" onClick={() => onDelete(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}