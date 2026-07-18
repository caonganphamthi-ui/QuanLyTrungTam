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

export const Route = createFileRoute("/_authenticated/lop-hoc")({
  component: LopHocPage,
});

interface LopHoc {
  id: string;
  ma_lop: string;
  ten_lop: string;
  khoa_hoc_id?: string;
  giao_vien_id?: string;
  ngay_khai_giang?: string;
  lich_hoc?: string;
  phong_hoc?: string;
  si_so?: number;
  trang_thai: string;
}

const STATUS: Record<string, string> = {
  sap_khai_giang: "Sắp khai giảng",
  dang_hoc: "Đang học",
  da_ket_thuc: "Đã kết thúc",
  tam_dung: "Tạm dừng",
};

function LopHocPage() {
  const { data = [], isLoading } = useList<LopHoc>("lop_hoc");
  const kh = useList<any>("khoa_hoc");
  const gv = useList<any>("giao_vien");
  const save = useSave("lop_hoc");
  const del = useDelete("lop_hoc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LopHoc | null>(null);
  const [khoaId, setKhoaId] = useState("");
  const [gvId, setGvId] = useState("");
  const [tt, setTt] = useState("sap_khai_giang");

  const khMap = new Map((kh.data ?? []).map((k: any) => [k.id, k.ten_khoa]));
  const gvMap = new Map((gv.data ?? []).map((g: any) => [g.id, g.ho_ten]));

  function openNew() { setEditing(null); setKhoaId(""); setGvId(""); setTt("sap_khai_giang"); setOpen(true); }
  function openEdit(r: LopHoc) {
    setEditing(r);
    setKhoaId(r.khoa_hoc_id ?? "");
    setGvId(r.giao_vien_id ?? "");
    setTt(r.trang_thai ?? "sap_khai_giang");
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      ma_lop: fd.get("ma_lop"),
      ten_lop: fd.get("ten_lop"),
      khoa_hoc_id: khoaId || null,
      giao_vien_id: gvId || null,
      ngay_khai_giang: fd.get("ngay_khai_giang") || null,
      lich_hoc: fd.get("lich_hoc") || null,
      phong_hoc: fd.get("phong_hoc") || null,
      trang_thai: tt,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Lớp học"
        description="Quản lý lớp học và lịch giảng"
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm lớp học</Button>}
      />
      <CrudTable
        rows={data}
        loading={isLoading}
        columns={[
          { key: "ma_lop", header: "Mã" },
          { key: "ten_lop", header: "Tên lớp" },
          { key: "khoa_hoc_id", header: "Khóa học", render: (r) => khMap.get(r.khoa_hoc_id ?? "") ?? "—" },
          { key: "giao_vien_id", header: "Giáo viên", render: (r) => gvMap.get(r.giao_vien_id ?? "") ?? "—" },
          { key: "lich_hoc", header: "Lịch học" },
          { key: "phong_hoc", header: "Phòng" },
          { key: "si_so", header: "Sĩ số" },
          { key: "trang_thai", header: "Trạng thái", render: (r) => <Badge variant="secondary">{STATUS[r.trang_thai] ?? r.trang_thai}</Badge> },
        ]}
        onEdit={openEdit}
        onDelete={(r) => confirm("Xóa lớp học này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa lớp học" : "Thêm lớp học"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Mã lớp *</Label><Input name="ma_lop" required defaultValue={editing?.ma_lop ?? ""} /></div>
          <div className="space-y-2"><Label>Tên lớp *</Label><Input name="ten_lop" required defaultValue={editing?.ten_lop ?? ""} /></div>
          <div className="space-y-2">
            <Label>Khóa học</Label>
            <Select value={khoaId} onValueChange={setKhoaId}>
              <SelectTrigger><SelectValue placeholder="Chọn khóa học" /></SelectTrigger>
              <SelectContent>{(kh.data ?? []).map((k: any) => <SelectItem key={k.id} value={k.id}>{k.ten_khoa}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Giáo viên</Label>
            <Select value={gvId} onValueChange={setGvId}>
              <SelectTrigger><SelectValue placeholder="Chọn giáo viên" /></SelectTrigger>
              <SelectContent>{(gv.data ?? []).map((g: any) => <SelectItem key={g.id} value={g.id}>{g.ho_ten}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Ngày khai giảng</Label><Input name="ngay_khai_giang" type="date" defaultValue={editing?.ngay_khai_giang ?? ""} /></div>
          <div className="space-y-2"><Label>Phòng học</Label><Input name="phong_hoc" defaultValue={editing?.phong_hoc ?? ""} /></div>
          <div className="col-span-2 space-y-2"><Label>Lịch học</Label><Input name="lich_hoc" placeholder="VD: T2-4-6 (18:00-20:00)" defaultValue={editing?.lich_hoc ?? ""} /></div>
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
