import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Untyped client for generic CRUD across arbitrary tables.
const db = supabase as any;

export function useList<T = any>(table: string, orderBy = "created_at") {
  return useQuery({
    queryKey: [table, "list"],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useSave(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) => {
      if (id) {
        const { error } = await db.from(table).update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from(table).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success(vars.id ? "Cập nhật thành công" : "Thêm mới thành công");
    },
    onError: (e: any) => toast.error("Lưu thất bại", { description: e.message }),
  });
}

export function useDelete(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Đã xóa");
    },
    onError: (e: any) => toast.error("Xóa thất bại", { description: e.message }),
  });
}