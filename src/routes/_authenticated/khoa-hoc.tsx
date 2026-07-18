import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable } from "@/components/CrudTable";
import { FormDialog } from "@/components/FormDialog";
import { useList, useSave, useDelete } from "@/lib/crud-hooks";

export const Route = createFileRoute("/_authenticated/khoa-hoc")({
  component: KhoaHocPage,
});

interface KhoaHoc {
  id: string;
  ma_khoa: string;
  ten_khoa: string;
  hoc_phi: number;
  so_buoi: number;
  mo_ta?: string;
}

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function KhoaHocPage() {
  const { data = [], isLoading } = useList<KhoaHoc>("khoa_hoc");
  const save = useSave("khoa_hoc");
  const del = useDelete("khoa_hoc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHoc | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      ma_khoa: fd.get("ma_khoa"),
      ten_khoa: fd.get("ten_khoa"),
      hoc_phi: Number(fd.get("hoc_phi") || 0),
      so_buoi: Number(fd.get("so_buoi") || 0),
      mo_ta: fd.get("mo_ta") || null,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Khóa học"
        description="Danh mục khóa đào tạo"
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Thêm khóa học
          </Button>
        }
      />
      <CrudTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: "ma_khoa", header: "Mã" },
          { key: "ten_khoa", header: "Tên khóa" },
          { key: "so_buoi", header: "Số buổi" },
          { key: "hoc_phi", header: "Học phí", render: (r) => fmtVND(Number(r.hoc_phi)) },
          { key: "mo_ta", header: "Mô tả" },
        ]}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={(r) => confirm("Xóa khóa học này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa khóa học" : "Thêm khóa học"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Mã khóa *</Label>
            <Input name="ma_khoa" required defaultValue={editing?.ma_khoa ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Tên khóa *</Label>
            <Input name="ten_khoa" required defaultValue={editing?.ten_khoa ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Học phí (VND)</Label>
            <Input name="hoc_phi" type="number" defaultValue={editing?.hoc_phi ?? 0} />
          </div>
          <div className="space-y-2">
            <Label>Số buổi</Label>
            <Input name="so_buoi" type="number" defaultValue={editing?.so_buoi ?? 0} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Mô tả</Label>
          <Textarea name="mo_ta" defaultValue={editing?.mo_ta ?? ""} />
        </div>
      </FormDialog>
    </div>
  );
}
