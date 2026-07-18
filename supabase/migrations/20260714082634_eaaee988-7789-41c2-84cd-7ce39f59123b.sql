
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'nhan_vien');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ho_ten TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vai_tro public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, vai_tro)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND vai_tro = _role)
$$;

CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, ho_ten, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'ho_ten', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, vai_tro)
  VALUES (NEW.id, CASE WHEN NEW.email = 'ptcngan77@gmail.com' THEN 'admin'::app_role ELSE 'nhan_vien'::app_role END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ DOMAIN TABLES ============
CREATE TABLE public.giao_vien (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_gv TEXT UNIQUE NOT NULL,
  ho_ten TEXT NOT NULL,
  sdt TEXT,
  email TEXT,
  chuyen_mon TEXT,
  trang_thai TEXT NOT NULL DEFAULT 'dang_day',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.khoa_hoc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_khoa TEXT UNIQUE NOT NULL,
  ten_khoa TEXT NOT NULL,
  hoc_phi NUMERIC(12,0) NOT NULL DEFAULT 0,
  so_buoi INT NOT NULL DEFAULT 0,
  mo_ta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hoc_vien (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_hv TEXT UNIQUE NOT NULL,
  ho_ten TEXT NOT NULL,
  ngay_sinh DATE,
  gioi_tinh TEXT,
  sdt TEXT,
  email TEXT,
  dia_chi TEXT,
  ngay_nhap_hoc DATE NOT NULL DEFAULT CURRENT_DATE,
  trang_thai TEXT NOT NULL DEFAULT 'dang_hoc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lop_hoc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_lop TEXT UNIQUE NOT NULL,
  ten_lop TEXT NOT NULL,
  khoa_hoc_id UUID REFERENCES public.khoa_hoc(id) ON DELETE SET NULL,
  giao_vien_id UUID REFERENCES public.giao_vien(id) ON DELETE SET NULL,
  ngay_khai_giang DATE,
  lich_hoc TEXT,
  phong_hoc TEXT,
  si_so INT NOT NULL DEFAULT 0,
  trang_thai TEXT NOT NULL DEFAULT 'dang_hoc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ghi_danh (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoc_vien_id UUID NOT NULL REFERENCES public.hoc_vien(id) ON DELETE CASCADE,
  lop_hoc_id UUID NOT NULL REFERENCES public.lop_hoc(id) ON DELETE CASCADE,
  ngay_ghi_danh DATE NOT NULL DEFAULT CURRENT_DATE,
  trang_thai TEXT NOT NULL DEFAULT 'dang_hoc',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hoc_vien_id, lop_hoc_id)
);

CREATE TABLE public.hoc_phi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoc_vien_id UUID NOT NULL REFERENCES public.hoc_vien(id) ON DELETE CASCADE,
  ghi_danh_id UUID REFERENCES public.ghi_danh(id) ON DELETE SET NULL,
  so_tien NUMERIC(12,0) NOT NULL DEFAULT 0,
  ngay_thu DATE NOT NULL DEFAULT CURRENT_DATE,
  hinh_thuc TEXT NOT NULL DEFAULT 'tien_mat',
  trang_thai TEXT NOT NULL DEFAULT 'da_thu',
  ghi_chu TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants + RLS: authenticated read all, admin all, nhan_vien write on students/enrollments/fees
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['giao_vien','khoa_hoc','hoc_vien','lop_hoc','ghi_danh','hoc_phi']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%1$s_read_auth" ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "%1$s_admin_all" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

-- nhan_vien can CRUD on operational tables
CREATE POLICY "hoc_vien_nv_write" ON public.hoc_vien FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nhan_vien')) WITH CHECK (public.has_role(auth.uid(),'nhan_vien'));
CREATE POLICY "ghi_danh_nv_write" ON public.ghi_danh FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nhan_vien')) WITH CHECK (public.has_role(auth.uid(),'nhan_vien'));
CREATE POLICY "hoc_phi_nv_write" ON public.hoc_phi FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nhan_vien')) WITH CHECK (public.has_role(auth.uid(),'nhan_vien'));

-- ============ SEED DATA ============
INSERT INTO public.giao_vien (ma_gv, ho_ten, sdt, email, chuyen_mon) VALUES
 ('GV001','Nguyễn Văn An','0901111001','an.nv@edu.vn','Toán'),
 ('GV002','Trần Thị Bình','0901111002','binh.tt@edu.vn','Tiếng Anh'),
 ('GV003','Lê Minh Châu','0901111003','chau.lm@edu.vn','Tin học'),
 ('GV004','Phạm Quốc Dũng','0901111004','dung.pq@edu.vn','Vật lý'),
 ('GV005','Hoàng Thị Em','0901111005','em.ht@edu.vn','Hóa học'),
 ('GV006','Vũ Văn Phúc','0901111006','phuc.vv@edu.vn','Tiếng Anh'),
 ('GV007','Đỗ Thị Giang','0901111007','giang.dt@edu.vn','Tin học'),
 ('GV008','Bùi Văn Hải','0901111008','hai.bv@edu.vn','Toán'),
 ('GV009','Ngô Thị Yến','0901111009','yen.nt@edu.vn','Ngữ văn'),
 ('GV010','Đặng Quang Khải','0901111010','khai.dq@edu.vn','Vật lý');

INSERT INTO public.khoa_hoc (ma_khoa, ten_khoa, hoc_phi, so_buoi, mo_ta) VALUES
 ('KH001','Tiếng Anh Giao Tiếp Cơ Bản', 3500000, 24, 'Khóa nền tảng giao tiếp Anh ngữ'),
 ('KH002','Tiếng Anh IELTS 6.5+',       6500000, 40, 'Luyện thi IELTS mục tiêu 6.5'),
 ('KH003','Toán Tư Duy Lớp 6-9',        2800000, 30, 'Phát triển tư duy Toán'),
 ('KH004','Lập trình Python Cơ Bản',    4200000, 28, 'Nhập môn lập trình với Python'),
 ('KH005','Lập trình Web Fullstack',    8500000, 48, 'HTML/CSS/JS + React + Node'),
 ('KH006','Luyện thi THPT Vật Lý',      3900000, 32, 'Ôn thi THPT môn Vật lý');

INSERT INTO public.lop_hoc (ma_lop, ten_lop, khoa_hoc_id, giao_vien_id, ngay_khai_giang, lich_hoc, phong_hoc, si_so, trang_thai)
SELECT
  'LOP' || LPAD(g::text,3,'0'),
  CASE (g%6) WHEN 0 THEN 'Anh Giao Tiếp' WHEN 1 THEN 'IELTS 6.5' WHEN 2 THEN 'Toán Tư Duy' WHEN 3 THEN 'Python' WHEN 4 THEN 'Web Fullstack' ELSE 'Lý THPT' END || ' K' || g,
  (SELECT id FROM public.khoa_hoc ORDER BY ma_khoa OFFSET (g%6) LIMIT 1),
  (SELECT id FROM public.giao_vien ORDER BY ma_gv OFFSET (g%10) LIMIT 1),
  CURRENT_DATE - ((g*7) || ' days')::interval,
  CASE (g%3) WHEN 0 THEN 'T2-4-6 (18:00-20:00)' WHEN 1 THEN 'T3-5-7 (18:00-20:00)' ELSE 'T7-CN (08:00-11:00)' END,
  'P' || (100 + g),
  0,
  CASE WHEN g <= 8 THEN 'dang_hoc' WHEN g <= 11 THEN 'sap_khai_giang' ELSE 'da_ket_thuc' END
FROM generate_series(1,12) g;

-- 100 students
INSERT INTO public.hoc_vien (ma_hv, ho_ten, ngay_sinh, gioi_tinh, sdt, email, dia_chi, ngay_nhap_hoc, trang_thai)
SELECT
  'HV' || LPAD(g::text,4,'0'),
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'])[1 + (g % 13)]
    || ' ' || (ARRAY['Văn','Thị','Minh','Quốc','Ngọc','Hữu','Kim','Xuân','Thu','Hải'])[1 + (g % 10)]
    || ' ' || (ARRAY['An','Bình','Châu','Dũng','Em','Phúc','Giang','Hải','Yến','Khải','Lan','Mai','Nam','Oanh','Phong','Quân','Rạng','Sơn','Trang','Uyên'])[1 + (g % 20)],
  DATE '2005-01-01' - ((g*37) % 3000)::int,
  CASE WHEN g % 2 = 0 THEN 'Nữ' ELSE 'Nam' END,
  '09' || LPAD((10000000 + g*173)::text, 8, '0'),
  'hv' || g || '@student.edu.vn',
  (ARRAY['Hà Nội','TP.HCM','Đà Nẵng','Cần Thơ','Hải Phòng','Nha Trang','Vũng Tàu'])[1 + (g % 7)],
  CURRENT_DATE - ((g*3) % 400)::int,
  CASE WHEN g % 20 = 0 THEN 'da_nghi' WHEN g % 15 = 0 THEN 'tot_nghiep' ELSE 'dang_hoc' END
FROM generate_series(1,100) g;

-- Enrollments: each student in 2-3 classes
WITH hv AS (SELECT id, row_number() OVER (ORDER BY ma_hv) rn FROM public.hoc_vien),
     lh AS (SELECT id, row_number() OVER (ORDER BY ma_lop) rn, count(*) OVER () c FROM public.lop_hoc)
INSERT INTO public.ghi_danh (hoc_vien_id, lop_hoc_id, ngay_ghi_danh, trang_thai)
SELECT hv.id, lh.id, CURRENT_DATE - ((hv.rn*7 + k) % 300)::int,
       CASE WHEN (hv.rn + k) % 25 = 0 THEN 'da_nghi' ELSE 'dang_hoc' END
FROM hv
CROSS JOIN LATERAL generate_series(0,2) k
JOIN lh ON lh.rn = 1 + ((hv.rn * 5 + k * 3) % lh.c)
ON CONFLICT (hoc_vien_id, lop_hoc_id) DO NOTHING;

-- Payments: for each enrollment, 1-2 payments partial of course fee
INSERT INTO public.hoc_phi (hoc_vien_id, ghi_danh_id, so_tien, ngay_thu, hinh_thuc, trang_thai, ghi_chu)
SELECT
  gd.hoc_vien_id,
  gd.id,
  ROUND(kh.hoc_phi / 2.0),
  gd.ngay_ghi_danh + (k * 30),
  CASE k WHEN 0 THEN 'chuyen_khoan' ELSE 'tien_mat' END,
  'da_thu',
  'Đợt ' || (k+1)
FROM public.ghi_danh gd
JOIN public.lop_hoc lh ON lh.id = gd.lop_hoc_id
JOIN public.khoa_hoc kh ON kh.id = lh.khoa_hoc_id
CROSS JOIN generate_series(0,1) k
WHERE gd.trang_thai = 'dang_hoc';

-- Update si_so
UPDATE public.lop_hoc l SET si_so = (SELECT count(*) FROM public.ghi_danh g WHERE g.lop_hoc_id = l.id);
