import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ClipboardList, Wallet, UserCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const db = supabase as any;

function useCount(table: string) {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function Dashboard() {
  const khoaHoc = useCount("khoa_hoc");
  const hocVien = useCount("hoc_vien");
  const giaoVien = useCount("giao_vien");
  const lopHoc = useCount("lop_hoc");
  const ghiDanh = useCount("ghi_danh");

  const hocPhi = useQuery({
    queryKey: ["hoc_phi_all"],
    queryFn: async () => {
      const { data, error } = await db.from("hoc_phi").select("so_tien, ngay_thu");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lopList = useQuery({
    queryKey: ["lop_hoc_chart"],
    queryFn: async () => {
      const { data, error } = await db.from("lop_hoc").select("ten_lop, si_so, trang_thai");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalRevenue = (hocPhi.data ?? []).reduce((s: number, r: any) => s + Number(r.so_tien ?? 0), 0);

  const lopByStatus = Object.entries(
    (lopList.data ?? []).reduce((acc: Record<string, number>, l: any) => {
      const k = l.trang_thai ?? "khac";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).map(([name, value]) => ({ name, value: value as number }));

  const topLop = [...(lopList.data ?? [])]
    .sort((a: any, b: any) => (b.si_so ?? 0) - (a.si_so ?? 0))
    .slice(0, 8)
    .map((l: any) => ({ name: l.ten_lop, si_so: l.si_so ?? 0 }));

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#ec4899"];

  const stats = [
    { label: "Khóa học", value: khoaHoc.data ?? 0, icon: BookOpen, color: "bg-blue-500" },
    { label: "Giáo viên", value: giaoVien.data ?? 0, icon: UserCheck, color: "bg-pink-500" },
    { label: "Học viên", value: hocVien.data ?? 0, icon: Users, color: "bg-emerald-500" },
    { label: "Lớp học", value: lopHoc.data ?? 0, icon: GraduationCap, color: "bg-violet-500" },
    { label: "Ghi danh", value: ghiDanh.data ?? 0, icon: ClipboardList, color: "bg-amber-500" },
    { label: "Doanh thu", value: fmtVND(totalRevenue), icon: Wallet, color: "bg-primary" },
  ];

  return (
    <div>
      <PageHeader title="Tổng quan" description="Thống kê tổng hợp trung tâm đào tạo" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`${s.color} text-white inline-flex p-2 rounded-lg mb-2`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-xl font-bold mt-0.5 truncate">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top lớp đông học viên</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topLop}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="si_so" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Trạng thái lớp học</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={lopByStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                  {lopByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
