import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable } from "@/components/CrudTable";
import { FormDialog } from "@/components/FormDialog";
import { useList, useSave, useDelete } from "@/lib/crud-hooks";

export const Route = createFileRoute("/_authenticated/giao-vien")({
  component: GiaoVienPage,
});

interface GiaoVien {
  id: string;
  ma_gv: string;
  ho_ten: string;
  sdt?: string;
  email?: string;
  chuyen_mon?: string;
  trang_thai: string;
}

const STATUS: Record<string, string> = { dang_day: "Đang giảng dạy", tam_nghi: "Tạm nghỉ", da_nghi: "Đã nghỉ" };

function GiaoVienPage() {
  const { data = [], isLoading } = useList<GiaoVien>("giao_vien");
  const save = useSave("giao_vien");
  const del = useDelete("giao_vien");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GiaoVien | null>(null);
  const [tt, setTt] = useState("dang_day");

  function openNew() { setEditing(null); setTt("dang_day"); setOpen(true); }
  function openEdit(r: GiaoVien) { setEditing(r); setTt(r.trang_thai ?? "dang_day"); setOpen(true); }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      ma_gv: fd.get("ma_gv"),
      ho_ten: fd.get("ho_ten"),
      sdt: fd.get("sdt") || null,
      email: fd.get("email") || null,
      chuyen_mon: fd.get("chuyen_mon") || null,
      trang_thai: tt,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Giáo viên"
        description="Danh sách giáo viên và chuyên môn"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm giáo viên</Button>}
      />
      <CrudTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: "ma_gv", header: "Mã" },
          { key: "ho_ten", header: "Họ tên" },
          { key: "chuyen_mon", header: "Chuyên môn" },
          { key: "sdt", header: "SĐT" },
          { key: "email", header: "Email" },
          { key: "trang_thai", header: "Trạng thái", render: (r) => <Badge variant="secondary">{STATUS[r.trang_thai] ?? r.trang_thai}</Badge> },
        ]}
        onEdit={openEdit}
        onDelete={(r) => confirm("Xóa giáo viên này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa giáo viên" : "Thêm giáo viên"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Mã GV *</Label><Input name="ma_gv" required defaultValue={editing?.ma_gv ?? ""} /></div>
          <div className="space-y-2"><Label>Họ tên *</Label><Input name="ho_ten" required defaultValue={editing?.ho_ten ?? ""} /></div>
          <div className="space-y-2"><Label>Chuyên môn</Label><Input name="chuyen_mon" defaultValue={editing?.chuyen_mon ?? ""} /></div>
          <div className="space-y-2"><Label>SĐT</Label><Input name="sdt" defaultValue={editing?.sdt ?? ""} /></div>
          <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={tt} onValueChange={setTt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
