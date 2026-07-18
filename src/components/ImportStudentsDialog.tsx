import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Download, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const db = supabase as any;

interface Row {
  "Mã HV"?: string;
  "Họ tên"?: string;
  "Ngày sinh"?: string | number;
  "Giới tính"?: string;
  "SĐT"?: string | number;
  "Email"?: string;
  "Địa chỉ"?: string;
  "Lớp học"?: string;
  "Đã đóng"?: string | number;
}

interface Result {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

function excelDateToISO(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

export function ImportStudentsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) {
      toast.error("Chỉ hỗ trợ file .xlsx hoặc .xls");
      return;
    }
    setFile(f);
    setResult(null);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Mã HV": "HV001",
        "Họ tên": "Nguyễn Văn A",
        "Ngày sinh": "01/01/2000",
        "Giới tính": "Nam",
        "SĐT": "0901234567",
        "Email": "a@example.com",
        "Địa chỉ": "Hà Nội",
        "Lớp học": "Tên lớp học",
        "Đã đóng": 1000000,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HocVien");
    XLSX.writeFile(wb, "mau-import-hoc-vien.xlsx");
  }

  async function doImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;
    let total = 0;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      total = rows.length;

      // Preload classes with course tuition
      const { data: classes, error: cErr } = await db
        .from("lop_hoc")
        .select("id, ten_lop, khoa_hoc_id, khoa_hoc:khoa_hoc_id(hoc_phi)");
      if (cErr) throw cErr;
      const classMap = new Map<string, { id: string; hoc_phi: number }>();
      for (const c of classes ?? []) {
        classMap.set(String(c.ten_lop).trim().toLowerCase(), {
          id: c.id,
          hoc_phi: Number(c.khoa_hoc?.hoc_phi ?? 0),
        });
      }

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 2;
        try {
          const ma_hv = String(r["Mã HV"] ?? "").trim();
          const ho_ten = String(r["Họ tên"] ?? "").trim();
          const ten_lop = String(r["Lớp học"] ?? "").trim();
          if (!ma_hv || !ho_ten) throw new Error("Thiếu Mã HV hoặc Họ tên");
          if (!ten_lop) throw new Error("Thiếu Lớp học");
          const lop = classMap.get(ten_lop.toLowerCase());
          if (!lop) throw new Error(`Không tìm thấy lớp "${ten_lop}"`);

          const hvValues = {
            ma_hv,
            ho_ten,
            ngay_sinh: excelDateToISO(r["Ngày sinh"]),
            gioi_tinh: String(r["Giới tính"] ?? "").trim() || null,
            sdt: r["SĐT"] != null && r["SĐT"] !== "" ? String(r["SĐT"]).trim() : null,
            email: String(r["Email"] ?? "").trim() || null,
            dia_chi: String(r["Địa chỉ"] ?? "").trim() || null,
            trang_thai: "dang_hoc",
          };

          // Upsert học viên theo ma_hv
          const { data: existing } = await db.from("hoc_vien").select("id").eq("ma_hv", ma_hv).maybeSingle();
          let hocVienId: string;
          if (existing?.id) {
            hocVienId = existing.id;
            const { error } = await db.from("hoc_vien").update(hvValues).eq("id", hocVienId);
            if (error) throw error;
          } else {
            const { data: inserted, error } = await db
              .from("hoc_vien")
              .insert({ ...hvValues, ngay_nhap_hoc: new Date().toISOString().slice(0, 10) })
              .select("id")
              .single();
            if (error) throw error;
            hocVienId = inserted.id;
          }

          // Ghi danh (không trùng)
          const { data: existingGd } = await db
            .from("ghi_danh")
            .select("id")
            .eq("hoc_vien_id", hocVienId)
            .eq("lop_hoc_id", lop.id)
            .maybeSingle();
          let ghiDanhId: string;
          if (existingGd?.id) {
            ghiDanhId = existingGd.id;
          } else {
            const { data: gd, error } = await db
              .from("ghi_danh")
              .insert({
                hoc_vien_id: hocVienId,
                lop_hoc_id: lop.id,
                ngay_ghi_danh: new Date().toISOString().slice(0, 10),
                trang_thai: "dang_hoc",
              })
              .select("id")
              .single();
            if (error) throw error;
            ghiDanhId = gd.id;
          }

          // Học phí: tự tính từ khóa học của lớp
          const daDong = Number(r["Đã đóng"] ?? 0) || 0;
          const tong = lop.hoc_phi;
          const conNo = Math.max(tong - daDong, 0);
          const trangThai = daDong <= 0 ? "chua_thu" : daDong >= tong ? "da_thu" : "chua_thu";
          const ghiChu = `Tổng: ${tong.toLocaleString("vi-VN")} - Đã đóng: ${daDong.toLocaleString("vi-VN")} - Còn nợ: ${conNo.toLocaleString("vi-VN")}`;

          const { data: existingHp } = await db
            .from("hoc_phi")
            .select("id")
            .eq("ghi_danh_id", ghiDanhId)
            .maybeSingle();
          const hpValues = {
            hoc_vien_id: hocVienId,
            ghi_danh_id: ghiDanhId,
            so_tien: daDong,
            ngay_thu: new Date().toISOString().slice(0, 10),
            hinh_thuc: "tien_mat",
            trang_thai: trangThai,
            ghi_chu: ghiChu,
          };
          if (existingHp?.id) {
            const { error } = await db.from("hoc_phi").update(hpValues).eq("id", existingHp.id);
            if (error) throw error;
          } else {
            const { error } = await db.from("hoc_phi").insert(hpValues);
            if (error) throw error;
          }

          success++;
        } catch (e: any) {
          errors.push(`Dòng ${rowNum}: ${e.message ?? e}`);
        }
      }

      setResult({ total, success, failed: total - success, errors });
      qc.invalidateQueries();
      if (errors.length === 0) {
        toast.success(`Import thành công ${success}/${total} dòng`);
        setTimeout(() => handleClose(false), 800);
      } else {
        toast.warning(`Import ${success}/${total} dòng, ${errors.length} lỗi`);
      }
    } catch (e: any) {
      toast.error("Không đọc được file", { description: e.message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import học viên từ Excel</DialogTitle>
          <DialogDescription>Chọn hoặc kéo thả file .xlsx / .xls theo mẫu.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Tải file mẫu
          </Button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
          }`}
        >
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-green-600" />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="font-medium">{file.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Kéo thả file vào đây, hoặc <span className="text-primary underline">chọn file</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {result && (
          <Alert variant={result.failed > 0 ? "destructive" : "default"}>
            <AlertTitle>Kết quả import</AlertTitle>
            <AlertDescription>
              <div>Tổng số dòng: {result.total}</div>
              <div>Thành công: {result.success}</div>
              <div>Thất bại: {result.failed}</div>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-auto list-disc pl-5 text-xs">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Hủy
          </Button>
          <Button type="button" onClick={doImport} disabled={!file || importing} className="bg-green-600 hover:bg-green-700">
            <Upload className="h-4 w-4 mr-1" />
            {importing ? "Đang import..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}