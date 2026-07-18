
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.diem_danh (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lop_hoc_id UUID NOT NULL REFERENCES public.lop_hoc(id) ON DELETE CASCADE,
  hoc_vien_id UUID NOT NULL REFERENCES public.hoc_vien(id) ON DELETE CASCADE,
  ngay_hoc DATE NOT NULL,
  trang_thai TEXT NOT NULL DEFAULT 'co_mat',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lop_hoc_id, hoc_vien_id, ngay_hoc)
);
CREATE INDEX diem_danh_lop_ngay_idx ON public.diem_danh (lop_hoc_id, ngay_hoc);
CREATE INDEX diem_danh_hv_idx ON public.diem_danh (hoc_vien_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diem_danh TO authenticated;
GRANT ALL ON public.diem_danh TO service_role;

ALTER TABLE public.diem_danh ENABLE ROW LEVEL SECURITY;

CREATE POLICY diem_danh_read_auth ON public.diem_danh FOR SELECT TO authenticated USING (true);
CREATE POLICY diem_danh_admin_all ON public.diem_danh FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY diem_danh_nv_write ON public.diem_danh FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'nhan_vien'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'nhan_vien'::app_role));

CREATE TRIGGER diem_danh_updated_at BEFORE UPDATE ON public.diem_danh
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
