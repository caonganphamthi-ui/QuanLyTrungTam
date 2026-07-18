import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type VaiTro = "admin" | "nhan_vien";
export const VAI_TRO_LABEL: Record<VaiTro, string> = {
  admin: "Quản trị viên",
  nhan_vien: "Nhân viên",
};

interface AuthCtx {
  session: Session | null;
  user: User | null;
  vaiTro: VaiTro | null;
  hoTen: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [vaiTro, setVaiTro] = useState<VaiTro | null>(null);
  const [hoTen, setHoTen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setVaiTro(null);
        setHoTen(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("vai_tro").eq("user_id", userId),
      supabase.from("profiles").select("ho_ten").eq("id", userId).maybeSingle(),
    ]);
    const first = (roles ?? [])[0]?.vai_tro as VaiTro | undefined;
    setVaiTro(first ?? null);
    setHoTen(prof?.ho_ten ?? null);
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        vaiTro,
        hoTen,
        loading,
        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error: error?.message ?? null };
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}