import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  Wallet,
  CalendarCheck,
  BarChart3,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth, VAI_TRO_LABEL } from "@/hooks/use-auth";

const items = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard },
  { title: "Khóa học", url: "/khoa-hoc", icon: BookOpen },
  { title: "Giáo viên", url: "/giao-vien", icon: GraduationCap },
  { title: "Học viên", url: "/hoc-vien", icon: Users },
  { title: "Lớp học", url: "/lop-hoc", icon: BookOpen },
  { title: "Ghi danh", url: "/ghi-danh", icon: ClipboardList },
  { title: "Điểm danh", url: "/diem-danh", icon: CalendarCheck },
  { title: "Học phí", url: "/hoc-phi", icon: Wallet },
  { title: "Thống kê", url: "/thong-ke", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { hoTen, vaiTro, signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            Q
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">QuanLyTT</span>
            <span className="text-xs text-muted-foreground">Quản lý đào tạo</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
          <div className="text-xs">
            <div className="font-medium truncate">{hoTen ?? user?.email}</div>
            <div className="text-muted-foreground">
              {vaiTro ? VAI_TRO_LABEL[vaiTro] : "Chưa phân quyền"}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-sidebar-accent"
          >
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}