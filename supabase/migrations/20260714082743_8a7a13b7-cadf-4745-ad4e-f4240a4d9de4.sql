
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND vai_tro = _role)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Recreate policies that referenced public.has_role
DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['giao_vien','khoa_hoc','hoc_vien','lop_hoc','ghi_danh','hoc_phi'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_admin_all" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_admin_all" ON public.%1$s FOR ALL TO authenticated USING (private.has_role(auth.uid(),''admin'')) WITH CHECK (private.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "hoc_vien_nv_write" ON public.hoc_vien;
DROP POLICY IF EXISTS "ghi_danh_nv_write" ON public.ghi_danh;
DROP POLICY IF EXISTS "hoc_phi_nv_write" ON public.hoc_phi;
CREATE POLICY "hoc_vien_nv_write" ON public.hoc_vien FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'nhan_vien')) WITH CHECK (private.has_role(auth.uid(),'nhan_vien'));
CREATE POLICY "ghi_danh_nv_write" ON public.ghi_danh FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'nhan_vien')) WITH CHECK (private.has_role(auth.uid(),'nhan_vien'));
CREATE POLICY "hoc_phi_nv_write" ON public.hoc_phi FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'nhan_vien')) WITH CHECK (private.has_role(auth.uid(),'nhan_vien'));

-- Drop the public copy
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
