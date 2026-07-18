import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable } from "@/components/CrudTable";
import { FormDialog } from "@/components/FormDialog";
import { useList, useSave, useDelete } from "@/lib/crud-hooks";

export const Route = createFileRoute("/_authenticated/hoc-phi")({
  component: HocPhiPage,
});

interface HocPhi {
  id: string;
  hoc_vien_id: string;
  ghi_danh_id?: string;
  so_tien: number;
  ngay_thu: string;
  hinh_thuc: string;
  trang_thai: string;
  ghi_chu?: string;
}

const HINH_THUC: Record<string, string> = { tien_mat: "Tiền mặt", chuyen_khoan: "Chuyển khoản", the: "Thẻ" };
const STATUS: Record<string, string> = { da_thu: "Đã thu", chua_thu: "Chưa thu", hoan: "Hoàn tiền" };
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function HocPhiPage() {
  const { data = [], isLoading } = useList<HocPhi>("hoc_phi");
  const hv = useList<any>("hoc_vien");
  const gd = useList<any>("ghi_danh");
  const save = useSave("hoc_phi");
  const del = useDelete("hoc_phi");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HocPhi | null>(null);
  const [hvId, setHvId] = useState("");
  const [gdId, setGdId] = useState("");
  const [ht, setHt] = useState("tien_mat");
  const [tt, setTt] = useState("da_thu");

  const hvMap = new Map((hv.data ?? []).map((r: any) => [r.id, `${r.ma_hv} - ${r.ho_ten}`]));

  function openNew() { setEditing(null); setHvId(""); setGdId(""); setHt("tien_mat"); setTt("da_thu"); setOpen(true); }
  function openEdit(r: HocPhi) { setEditing(r); setHvId(r.hoc_vien_id); setGdId(r.ghi_danh_id ?? ""); setHt(r.hinh_thuc); setTt(r.trang_thai); setOpen(true); }

  const gdOptions = (gd.data ?? []).filter((g: any) => !hvId || g.hoc_vien_id === hvId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      hoc_vien_id: hvId,
      ghi_danh_id: gdId || null,
      so_tien: Number(fd.get("so_tien") || 0),
      ngay_thu: fd.get("ngay_thu") || new Date().toISOString().slice(0, 10),
      hinh_thuc: ht,
      trang_thai: tt,
      ghi_chu: fd.get("ghi_chu") || null,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  const total = data.reduce((s, r) => s + Number(r.so_tien || 0), 0);

  return (
    <div>
      <PageHeader
        title="Học phí"
        description={`Quản lý thu học phí — Tổng: ${fmtVND(total)}`}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm phiếu thu</Button>}
      />
      <CrudTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: "hoc_vien_id", header: "Học viên", render: (r) => hvMap.get(r.hoc_vien_id) ?? "—" },
          { key: "so_tien", header: "Số tiền", render: (r) => fmtVND(Number(r.so_tien)) },
          { key: "ngay_thu", header: "Ngày thu" },
          { key: "hinh_thuc", header: "Hình thức", render: (r) => HINH_THUC[r.hinh_thuc] ?? r.hinh_thuc },
          { key: "trang_thai", header: "Trạng thái", render: (r) => <Badge variant="secondary">{STATUS[r.trang_thai] ?? r.trang_thai}</Badge> },
          { key: "ghi_chu", header: "Ghi chú" },
        ]}
        onEdit={openEdit}
        onDelete={(r) => confirm("Xóa phiếu thu này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa phiếu thu" : "Thêm phiếu thu"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="space-y-2">
          <Label>Học viên *</Label>
          <Select value={hvId} onValueChange={(v) => { setHvId(v); setGdId(""); }}>
            <SelectTrigger><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
            <SelectContent>{(hv.data ?? []).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.ma_hv} - {r.ho_ten}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ghi danh (tùy chọn)</Label>
          <Select value={gdId} onValueChange={setGdId}>
            <SelectTrigger><SelectValue placeholder="Chọn ghi danh" /></SelectTrigger>
            <SelectContent>{gdOptions.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.ngay_ghi_danh}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Số tiền (VND) *</Label><Input name="so_tien" type="number" required defaultValue={editing?.so_tien ?? 0} /></div>
          <div className="space-y-2"><Label>Ngày thu</Label><Input name="ngay_thu" type="date" defaultValue={editing?.ngay_thu ?? new Date().toISOString().slice(0, 10)} /></div>
          <div className="space-y-2">
            <Label>Hình thức</Label>
            <Select value={ht} onValueChange={setHt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(HINH_THUC).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={tt} onValueChange={setTt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Ghi chú</Label><Textarea name="ghi_chu" defaultValue={editing?.ghi_chu ?? ""} /></div>
      </FormDialog>
    </div>
  );
}
