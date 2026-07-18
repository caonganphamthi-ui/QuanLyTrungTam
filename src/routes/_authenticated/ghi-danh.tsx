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

export const Route = createFileRoute("/_authenticated/ghi-danh")({
  component: GhiDanhPage,
});

interface GhiDanh {
  id: string;
  hoc_vien_id: string;
  lop_hoc_id: string;
  ngay_ghi_danh: string;
  trang_thai: string;
}

const STATUS: Record<string, string> = { dang_hoc: "Đang học", hoan_thanh: "Hoàn thành", da_nghi: "Đã nghỉ", bao_luu: "Bảo lưu" };

function GhiDanhPage() {
  const { data = [], isLoading } = useList<GhiDanh>("ghi_danh");
  const hv = useList<any>("hoc_vien");
  const lh = useList<any>("lop_hoc");
  const save = useSave("ghi_danh");
  const del = useDelete("ghi_danh");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GhiDanh | null>(null);
  const [hvId, setHvId] = useState("");
  const [lhId, setLhId] = useState("");
  const [st, setSt] = useState("dang_hoc");

  const hvMap = new Map((hv.data ?? []).map((r: any) => [r.id, `${r.ma_hv} - ${r.ho_ten}`]));
  const lhMap = new Map((lh.data ?? []).map((r: any) => [r.id, `${r.ma_lop} - ${r.ten_lop}`]));

  function openNew() { setEditing(null); setHvId(""); setLhId(""); setSt("dang_hoc"); setOpen(true); }
  function openEdit(r: GhiDanh) { setEditing(r); setHvId(r.hoc_vien_id); setLhId(r.lop_hoc_id); setSt(r.trang_thai); setOpen(true); }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      hoc_vien_id: hvId,
      lop_hoc_id: lhId,
      ngay_ghi_danh: fd.get("ngay_ghi_danh") || new Date().toISOString().slice(0, 10),
      trang_thai: st,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Ghi danh"
        description="Đăng ký học viên vào lớp học"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm ghi danh</Button>}
      />
      <CrudTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: "hoc_vien_id", header: "Học viên", render: (r) => hvMap.get(r.hoc_vien_id) ?? "—" },
          { key: "lop_hoc_id", header: "Lớp học", render: (r) => lhMap.get(r.lop_hoc_id) ?? "—" },
          { key: "ngay_ghi_danh", header: "Ngày ghi danh" },
          { key: "trang_thai", header: "Trạng thái", render: (r) => <Badge variant="secondary">{STATUS[r.trang_thai] ?? r.trang_thai}</Badge> },
        ]}
        onEdit={openEdit}
        onDelete={(r) => confirm("Xóa ghi danh này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa ghi danh" : "Thêm ghi danh"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="space-y-2">
          <Label>Học viên *</Label>
          <Select value={hvId} onValueChange={setHvId}>
            <SelectTrigger><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
            <SelectContent>{(hv.data ?? []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.ma_hv} - {r.ho_ten}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lớp học *</Label>
          <Select value={lhId} onValueChange={setLhId}>
            <SelectTrigger><SelectValue placeholder="Chọn lớp học" /></SelectTrigger>
            <SelectContent>{(lh.data ?? []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.ma_lop} - {r.ten_lop}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Ngày ghi danh</Label><Input name="ngay_ghi_danh" type="date" defaultValue={editing?.ngay_ghi_danh ?? new Date().toISOString().slice(0, 10)} /></div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={st} onValueChange={setSt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
