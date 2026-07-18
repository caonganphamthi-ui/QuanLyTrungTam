import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diem-danh")({
  component: DiemDanhPage,
});

const db = supabase as any;

type Status = "co_mat" | "vang" | "tre" | "phep";
const NEXT: Record<Status, Status> = { co_mat: "vang", vang: "tre", tre: "phep", phep: "co_mat" };
const LABEL: Record<Status, string> = { co_mat: "C", vang: "V", tre: "T", phep: "P" };
const FULL: Record<Status, string> = { co_mat: "Có mặt", vang: "Vắng", tre: "Trễ", phep: "Có phép" };
const CLASS: Record<Status, string> = {
  co_mat: "bg-emerald-500 text-white hover:bg-emerald-600",
  vang: "bg-red-500 text-white hover:bg-red-600",
  tre: "bg-amber-500 text-white hover:bg-amber-600",
  phep: "bg-sky-500 text-white hover:bg-sky-600",
};

function daysInMonth(year: number, month: number) {
  const total = new Date(year, month, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return {
      day: i + 1,
      iso: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      dow: d.getDay(),
    };
  });
}

function DiemDanhPage() {
  const qc = useQueryClient();
  const today = new Date();
  const [lopId, setLopId] = useState<string>("");
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);

  const lopHoc = useQuery({
    queryKey: ["lop_hoc", "diem_danh"],
    queryFn: async () => {
      const { data, error } = await db.from("lop_hoc").select("id, ma_lop, ten_lop").order("ma_lop");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ghiDanh = useQuery({
    enabled: !!lopId,
    queryKey: ["ghi_danh_lop", lopId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ghi_danh")
        .select("hoc_vien_id, hoc_vien:hoc_vien_id(id, ma_hv, ho_ten)")
        .eq("lop_hoc_id", lopId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(year, month, 0);
  const to = `${year}-${String(month).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

  const attendance = useQuery({
    enabled: !!lopId,
    queryKey: ["diem_danh", lopId, year, month],
    queryFn: async () => {
      const { data, error } = await db
        .from("diem_danh")
        .select("id, hoc_vien_id, ngay_hoc, trang_thai")
        .eq("lop_hoc_id", lopId)
        .gte("ngay_hoc", from)
        .lte("ngay_hoc", to);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (v: { hoc_vien_id: string; ngay_hoc: string; trang_thai: Status }) => {
      const { error } = await db
        .from("diem_danh")
        .upsert(
          { lop_hoc_id: lopId, hoc_vien_id: v.hoc_vien_id, ngay_hoc: v.ngay_hoc, trang_thai: v.trang_thai },
          { onConflict: "lop_hoc_id,hoc_vien_id,ngay_hoc" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diem_danh", lopId, year, month] }),
    onError: (e: any) => toast.error("Không lưu được", { description: e.message }),
  });

  const removeCell = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("diem_danh").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diem_danh", lopId, year, month] }),
    onError: (e: any) => toast.error("Không xóa được", { description: e.message }),
  });

  const days = useMemo(() => daysInMonth(year, month), [year, month]);
  const students = useMemo(() => {
    const rows = (ghiDanh.data ?? [])
      .map((r: any) => r.hoc_vien)
      .filter(Boolean);
    const seen = new Set<string>();
    return rows.filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((a: any, b: any) => a.ma_hv.localeCompare(b.ma_hv));
  }, [ghiDanh.data]);

  const map = useMemo(() => {
    const m = new Map<string, { id: string; trang_thai: Status }>();
    for (const r of attendance.data ?? []) m.set(`${r.hoc_vien_id}|${r.ngay_hoc}`, { id: r.id, trang_thai: r.trang_thai });
    return m;
  }, [attendance.data]);

  const years = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 3 + i);

  return (
    <div>
      <PageHeader title="Điểm danh" description="Điểm danh theo lớp và tháng. Click ô để chuyển trạng thái." />

      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Lớp học</Label>
            <Select value={lopId} onValueChange={setLopId}>
              <SelectTrigger><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
              <SelectContent>
                {(lopHoc.data ?? []).map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.ma_lop} - {l.ten_lop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tháng</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Năm</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 flex-wrap text-xs">
            {(["co_mat", "vang", "tre", "phep"] as Status[]).map((s) => (
              <span key={s} className={`px-2 py-1 rounded ${CLASS[s]}`}>{LABEL[s]} = {FULL[s]}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {!lopId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Chọn lớp học để bắt đầu điểm danh</CardContent></Card>
      ) : students.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Lớp này chưa có học viên ghi danh</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 border p-2 text-left min-w-[180px]">Học viên</th>
                  {days.map((d) => (
                    <th key={d.iso} className={`border p-1 text-center min-w-[32px] ${d.dow === 0 ? "text-red-500" : ""}`}>
                      {d.day}
                    </th>
                  ))}
                  <th className="border p-2 text-center bg-emerald-50 dark:bg-emerald-950">Có mặt</th>
                  <th className="border p-2 text-center bg-red-50 dark:bg-red-950">Vắng</th>
                  <th className="border p-2 text-center">Trễ</th>
                  <th className="border p-2 text-center">Phép</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => {
                  let cm = 0, va = 0, tr = 0, ph = 0;
                  for (const d of days) {
                    const c = map.get(`${s.id}|${d.iso}`);
                    if (c?.trang_thai === "co_mat") cm++;
                    else if (c?.trang_thai === "vang") va++;
                    else if (c?.trang_thai === "tre") tr++;
                    else if (c?.trang_thai === "phep") ph++;
                  }
                  return (
                    <tr key={s.id}>
                      <td className="sticky left-0 bg-background border p-2">
                        <div className="font-medium">{s.ho_ten}</div>
                        <div className="text-muted-foreground text-[10px]">{s.ma_hv}</div>
                      </td>
                      {days.map((d) => {
                        const c = map.get(`${s.id}|${d.iso}`);
                        return (
                          <td key={d.iso} className="border p-0 text-center">
                            <button
                              className={`w-full h-8 text-xs font-semibold transition ${c ? CLASS[c.trang_thai] : "hover:bg-muted"}`}
                              onClick={() => {
                                const next: Status = c ? NEXT[c.trang_thai] : "co_mat";
                                upsert.mutate({ hoc_vien_id: s.id, ngay_hoc: d.iso, trang_thai: next });
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (c) removeCell.mutate(c.id);
                              }}
                              title={c ? `${FULL[c.trang_thai]} — Chuột phải để xóa` : "Bấm để điểm danh"}
                            >
                              {c ? LABEL[c.trang_thai] : ""}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border p-2 text-center font-semibold text-emerald-600">{cm}</td>
                      <td className="border p-2 text-center font-semibold text-red-600">{va}</td>
                      <td className="border p-2 text-center">{tr}</td>
                      <td className="border p-2 text-center">{ph}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex flex-wrap gap-2 text-xs text-muted-foreground border-t">
            <Badge variant="secondary">Click ô: chuyển C → V → T → P → C</Badge>
            <Badge variant="secondary">Chuột phải: xóa điểm danh của ô</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}