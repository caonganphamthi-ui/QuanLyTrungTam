import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/thong-ke")({
  component: ThongKePage,
});

const db = supabase as any;
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function ThongKePage() {
  const lop = useQuery({
    queryKey: ["tk_lop"],
    queryFn: async () => {
      const { data, error } = await db
        .from("lop_hoc")
        .select("id, ma_lop, ten_lop, si_so, khoa_hoc:khoa_hoc_id(id, ten_khoa, hoc_phi)")
        .order("ma_lop");
      if (error) throw error;
      return data ?? [];
    },
  });

  const gd = useQuery({
    queryKey: ["tk_gd"],
    queryFn: async () => {
      const { data, error } = await db.from("ghi_danh").select("id, lop_hoc_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const hp = useQuery({
    queryKey: ["tk_hp"],
    queryFn: async () => {
      const { data, error } = await db.from("hoc_phi").select("so_tien, trang_thai, ghi_danh_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = lop.isLoading || gd.isLoading || hp.isLoading;

  const gdByLop = new Map<string, string[]>();
  for (const g of gd.data ?? []) {
    const arr = gdByLop.get(g.lop_hoc_id) ?? [];
    arr.push(g.id);
    gdByLop.set(g.lop_hoc_id, arr);
  }
  const hpByGd = new Map<string, { thu: number; chua: number }>();
  for (const p of hp.data ?? []) {
    if (!p.ghi_danh_id) continue;
    const cur = hpByGd.get(p.ghi_danh_id) ?? { thu: 0, chua: 0 };
    const amt = Number(p.so_tien || 0);
    if (p.trang_thai === "da_thu") cur.thu += amt;
    else if (p.trang_thai === "chua_thu") cur.chua += amt;
    else if (p.trang_thai === "hoan") cur.thu -= amt;
    hpByGd.set(p.ghi_danh_id, cur);
  }

  type Row = { id: string; ma_lop: string; ten_lop: string; khoa: string; si_so: number; hoc_phi_khoa: number; du_kien: number; da_thu: number; con_no: number; chenh_lech: number };
  const rows: Row[] = (lop.data ?? []).map((l: any) => {
    const gdIds = gdByLop.get(l.id) ?? [];
    const hocPhiKhoa = Number(l.khoa_hoc?.hoc_phi ?? 0);
    const duKien = gdIds.length * hocPhiKhoa;
    let daThu = 0;
    let conNo = 0;
    for (const gid of gdIds) {
      const s = hpByGd.get(gid);
      if (s) {
        daThu += s.thu;
        conNo += s.chua;
      }
    }
    return {
      id: l.id,
      ma_lop: l.ma_lop,
      ten_lop: l.ten_lop,
      khoa: l.khoa_hoc?.ten_khoa ?? "—",
      si_so: gdIds.length,
      hoc_phi_khoa: hocPhiKhoa,
      du_kien: duKien,
      da_thu: daThu,
      con_no: conNo,
      chenh_lech: duKien - daThu,
    };
  });

  const total = rows.reduce(
    (a: { du_kien: number; da_thu: number; con_no: number; chenh_lech: number }, r: Row) => ({
      du_kien: a.du_kien + r.du_kien,
      da_thu: a.da_thu + r.da_thu,
      con_no: a.con_no + r.con_no,
      chenh_lech: a.chenh_lech + r.chenh_lech,
    }),
    { du_kien: 0, da_thu: 0, con_no: 0, chenh_lech: 0 },
  );

  const chartData = rows.map((r: Row) => ({ name: r.ma_lop, "Đã thu": r.da_thu, "Còn nợ": r.con_no, "Dự kiến": r.du_kien }));

  return (
    <div>
      <PageHeader title="Thống kê học phí" description="Doanh thu và công nợ học phí theo từng lớp" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Dự kiến</div><div className="text-lg font-bold mt-1">{fmtVND(total.du_kien)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Đã thu</div><div className="text-lg font-bold mt-1 text-emerald-600">{fmtVND(total.da_thu)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Còn nợ</div><div className="text-lg font-bold mt-1 text-amber-600">{fmtVND(total.con_no)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Chênh lệch</div><div className="text-lg font-bold mt-1 text-red-600">{fmtVND(total.chenh_lech)}</div></CardContent></Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Biểu đồ học phí theo lớp</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} />
              <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              <Bar dataKey="Đã thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Còn nợ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã lớp</TableHead>
              <TableHead>Tên lớp</TableHead>
              <TableHead>Khóa học</TableHead>
              <TableHead className="text-right">Số HV</TableHead>
              <TableHead className="text-right">HP/HV</TableHead>
              <TableHead className="text-right">Dự kiến</TableHead>
              <TableHead className="text-right">Đã thu</TableHead>
              <TableHead className="text-right">Còn nợ</TableHead>
              <TableHead className="text-right">Tình trạng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            ) : rows.map((r: Row) => {
              const done = r.du_kien > 0 && r.da_thu >= r.du_kien;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.ma_lop}</TableCell>
                  <TableCell>{r.ten_lop}</TableCell>
                  <TableCell className="text-muted-foreground">{r.khoa}</TableCell>
                  <TableCell className="text-right">{r.si_so}</TableCell>
                  <TableCell className="text-right">{fmtVND(r.hoc_phi_khoa)}</TableCell>
                  <TableCell className="text-right">{fmtVND(r.du_kien)}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">{fmtVND(r.da_thu)}</TableCell>
                  <TableCell className="text-right text-amber-600">{fmtVND(r.con_no)}</TableCell>
                  <TableCell className="text-right">
                    {done ? <Badge className="bg-emerald-500">Đủ</Badge> : <Badge variant="secondary">Còn thiếu</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}