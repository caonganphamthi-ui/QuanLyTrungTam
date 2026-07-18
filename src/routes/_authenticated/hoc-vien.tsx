import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportStudentsDialog } from "@/components/ImportStudentsDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable } from "@/components/CrudTable";
import { FormDialog } from "@/components/FormDialog";
import { useList, useSave, useDelete } from "@/lib/crud-hooks";

export const Route = createFileRoute("/_authenticated/hoc-vien")({
  component: HocVienPage,
});

interface HocVien {
  id: string;
  ma_hv: string;
  ho_ten: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  sdt?: string;
  email?: string;
  dia_chi?: string;
  ngay_nhap_hoc?: string;
  trang_thai: string;
}

const STATUS_LABEL: Record<string, string> = {
  dang_hoc: "Đang học",
  tot_nghiep: "Tốt nghiệp",
  da_nghi: "Đã nghỉ",
};

function HocVienPage() {
  const { data = [], isLoading } = useList<HocVien>("hoc_vien");
  const save = useSave("hoc_vien");
  const del = useDelete("hoc_vien");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HocVien | null>(null);
  const [gioiTinh, setGioiTinh] = useState("Nam");
  const [trangThai, setTrangThai] = useState("dang_hoc");
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const filtered = data.filter(
    (r) =>
      !q ||
      r.ho_ten.toLowerCase().includes(q.toLowerCase()) ||
      r.ma_hv.toLowerCase().includes(q.toLowerCase()) ||
      (r.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (r.sdt ?? "").includes(q),
  );

  function openNew() {
    setEditing(null);
    setGioiTinh("Nam");
    setTrangThai("dang_hoc");
    setOpen(true);
  }
  function openEdit(r: HocVien) {
    setEditing(r);
    setGioiTinh(r.gioi_tinh ?? "Nam");
    setTrangThai(r.trang_thai ?? "dang_hoc");
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const values: any = {
      ma_hv: fd.get("ma_hv"),
      ho_ten: fd.get("ho_ten"),
      ngay_sinh: fd.get("ngay_sinh") || null,
      gioi_tinh: gioiTinh,
      sdt: fd.get("sdt") || null,
      email: fd.get("email") || null,
      dia_chi: fd.get("dia_chi") || null,
      ngay_nhap_hoc: fd.get("ngay_nhap_hoc") || new Date().toISOString().slice(0, 10),
      trang_thai: trangThai,
    };
    save.mutate({ id: editing?.id, values }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div>
      <PageHeader
        title="Học viên"
        description="Quản lý hồ sơ học viên"
        actions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setImportOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Import Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import học viên từ Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Thêm học viên
            </Button>
          </>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Tìm mã, tên, email, SĐT..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <CrudTable
        rows={filtered}
        loading={isLoading}
        columns={[
          { key: "ma_hv", header: "Mã HV" },
          { key: "ho_ten", header: "Họ tên" },
          { key: "gioi_tinh", header: "Giới tính" },
          { key: "sdt", header: "SĐT" },
          { key: "email", header: "Email" },
          {
            key: "trang_thai",
            header: "Trạng thái",
            render: (r) => <Badge variant="secondary">{STATUS_LABEL[r.trang_thai] ?? r.trang_thai}</Badge>,
          },
        ]}
        onEdit={openEdit}
        onDelete={(r) => confirm("Xóa học viên này?") && del.mutate(r.id)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa học viên" : "Thêm học viên"}
        onSubmit={onSubmit}
        submitting={save.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Mã HV *</Label>
            <Input name="ma_hv" required defaultValue={editing?.ma_hv ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Họ tên *</Label>
            <Input name="ho_ten" required defaultValue={editing?.ho_ten ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Ngày sinh</Label>
            <Input name="ngay_sinh" type="date" defaultValue={editing?.ngay_sinh ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Giới tính</Label>
            <Select value={gioiTinh} onValueChange={setGioiTinh}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Nam">Nam</SelectItem>
                <SelectItem value="Nữ">Nữ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SĐT</Label>
            <Input name="sdt" defaultValue={editing?.sdt ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Ngày nhập học</Label>
            <Input name="ngay_nhap_hoc" type="date" defaultValue={editing?.ngay_nhap_hoc ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={trangThai} onValueChange={setTrangThai}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Địa chỉ</Label>
          <Textarea name="dia_chi" defaultValue={editing?.dia_chi ?? ""} />
        </div>
      </FormDialog>
      <ImportStudentsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
