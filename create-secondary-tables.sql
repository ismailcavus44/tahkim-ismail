-- ================================================
-- DOSYALAR-2 VE GELİR-GİDER-2 İÇİN AYRI TABLOLAR
-- ================================================
-- Bu SQL, dosyalar-2 ve gelir-gider-2 sayfaları için
-- orijinal tablolarla aynı yapıda yeni tablolar oluşturur.

-- 1. DOSYALAR (CASES_2) TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS public.cases_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  case_no text,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open',
  vehicle_plate text,
  car_dealer_id uuid, -- Daha sonra car_dealers_2'ye bağlanacak
  damage_amount numeric(15,2),
  court_name text,
  sub_category text, -- Tahkim için DK veya HF
  insurance_application_date timestamptz,
  countdown_expires_at timestamptz,
  is_countdown_active boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Cases_2 için indeksler
CREATE INDEX IF NOT EXISTS idx_cases_2_client_id ON public.cases_2(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_2_created_by ON public.cases_2(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_2_status ON public.cases_2(status);
CREATE INDEX IF NOT EXISTS idx_cases_2_car_dealer_id ON public.cases_2(car_dealer_id);

-- Cases_2 için açıklamalar
COMMENT ON TABLE public.cases_2 IS 'Dosyalar-2 sayfası için dosya kayıtları';
COMMENT ON COLUMN public.cases_2.court_name IS 'Mahkeme adı (Mahrumiyet İcra Dosyası için)';
COMMENT ON COLUMN public.cases_2.sub_category IS 'Tahkim Başvurusu için alt kategori (DK veya HF)';


-- 2. KAPORTACI (CAR_DEALERS_2) TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS public.car_dealers_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Car_dealers_2 için indeksler
CREATE INDEX IF NOT EXISTS idx_car_dealers_2_created_by ON public.car_dealers_2(created_by);
CREATE INDEX IF NOT EXISTS idx_car_dealers_2_name ON public.car_dealers_2(name);

-- Car_dealers_2 için açıklama
COMMENT ON TABLE public.car_dealers_2 IS 'Dosyalar-2 sayfası için kaportacı kayıtları';

-- Cases_2 tablosundaki car_dealer_id foreign key'ini güncelle
ALTER TABLE public.cases_2 
  DROP CONSTRAINT IF EXISTS cases_2_car_dealer_id_fkey;

ALTER TABLE public.cases_2 
  ADD CONSTRAINT cases_2_car_dealer_id_fkey 
  FOREIGN KEY (car_dealer_id) 
  REFERENCES public.car_dealers_2(id) 
  ON DELETE SET NULL;


-- 3. DOSYA SAFAHAT (CASE_PROGRESS_2) TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS public.case_progress_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases_2(id) ON DELETE CASCADE,
  progress_type text NOT NULL,
  custom_description text,
  progress_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Case_progress_2 için indeksler
CREATE INDEX IF NOT EXISTS idx_case_progress_2_case_id ON public.case_progress_2(case_id);
CREATE INDEX IF NOT EXISTS idx_case_progress_2_created_by ON public.case_progress_2(created_by);
CREATE INDEX IF NOT EXISTS idx_case_progress_2_progress_date ON public.case_progress_2(progress_date);
CREATE INDEX IF NOT EXISTS idx_case_progress_2_progress_type ON public.case_progress_2(progress_type);

-- Case_progress_2 için açıklama
COMMENT ON TABLE public.case_progress_2 IS 'Dosyalar-2 sayfası için safahat kayıtları';


-- 4. GELİR-GİDER (INCOME_EXPENSES_2) TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS public.income_expenses_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases_2(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric(15,2) NOT NULL,
  description text,
  transaction_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Income_expenses_2 için indeksler
CREATE INDEX IF NOT EXISTS idx_income_expenses_2_case_id ON public.income_expenses_2(case_id);
CREATE INDEX IF NOT EXISTS idx_income_expenses_2_created_by ON public.income_expenses_2(created_by);
CREATE INDEX IF NOT EXISTS idx_income_expenses_2_transaction_date ON public.income_expenses_2(transaction_date);
CREATE INDEX IF NOT EXISTS idx_income_expenses_2_type ON public.income_expenses_2(type);
CREATE INDEX IF NOT EXISTS idx_income_expenses_2_category ON public.income_expenses_2(category);

-- Income_expenses_2 için açıklama
COMMENT ON TABLE public.income_expenses_2 IS 'Gelir-Gider-2 sayfası için işlem kayıtları (case_id NULL ise genel ofis işlemi)';
COMMENT ON COLUMN public.income_expenses_2.case_id IS 'Dosya ID (NULL ise genel ofis işlemi)';
COMMENT ON COLUMN public.income_expenses_2.description IS 'İşlem açıklaması (opsiyonel)';


-- 5. DÖKÜMANLAR (DOCUMENTS_2) TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS public.documents_2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases_2(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Documents_2 için indeksler
CREATE INDEX IF NOT EXISTS idx_documents_2_case_id ON public.documents_2(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_2_uploaded_by ON public.documents_2(uploaded_by);

-- Documents_2 için açıklama
COMMENT ON TABLE public.documents_2 IS 'Dosyalar-2 sayfası için döküman kayıtları';


-- ================================================
-- RLS (ROW LEVEL SECURITY) POLİTİKALARI
-- ================================================

-- CASES_2 için RLS
ALTER TABLE public.cases_2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_2_select_own" ON public.cases_2;
CREATE POLICY "cases_2_select_own" ON public.cases_2
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "cases_2_insert_own" ON public.cases_2;
CREATE POLICY "cases_2_insert_own" ON public.cases_2
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "cases_2_update_own" ON public.cases_2;
CREATE POLICY "cases_2_update_own" ON public.cases_2
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "cases_2_delete_own" ON public.cases_2;
CREATE POLICY "cases_2_delete_own" ON public.cases_2
  FOR DELETE USING (auth.uid() = created_by);


-- CAR_DEALERS_2 için RLS
ALTER TABLE public.car_dealers_2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "car_dealers_2_select_own" ON public.car_dealers_2;
CREATE POLICY "car_dealers_2_select_own" ON public.car_dealers_2
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "car_dealers_2_insert_own" ON public.car_dealers_2;
CREATE POLICY "car_dealers_2_insert_own" ON public.car_dealers_2
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "car_dealers_2_update_own" ON public.car_dealers_2;
CREATE POLICY "car_dealers_2_update_own" ON public.car_dealers_2
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "car_dealers_2_delete_own" ON public.car_dealers_2;
CREATE POLICY "car_dealers_2_delete_own" ON public.car_dealers_2
  FOR DELETE USING (auth.uid() = created_by);


-- CASE_PROGRESS_2 için RLS
ALTER TABLE public.case_progress_2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_progress_2_select_own" ON public.case_progress_2;
CREATE POLICY "case_progress_2_select_own" ON public.case_progress_2
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "case_progress_2_insert_own" ON public.case_progress_2;
CREATE POLICY "case_progress_2_insert_own" ON public.case_progress_2
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "case_progress_2_update_own" ON public.case_progress_2;
CREATE POLICY "case_progress_2_update_own" ON public.case_progress_2
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "case_progress_2_delete_own" ON public.case_progress_2;
CREATE POLICY "case_progress_2_delete_own" ON public.case_progress_2
  FOR DELETE USING (auth.uid() = created_by);

-- Salt okunur kullanıcılar için politika (varsa)
DROP POLICY IF EXISTS "readonly_case_progress_2_select" ON public.case_progress_2;
CREATE POLICY "readonly_case_progress_2_select" ON public.case_progress_2
  FOR SELECT USING (true);


-- INCOME_EXPENSES_2 için RLS
ALTER TABLE public.income_expenses_2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "income_expenses_2_select_own" ON public.income_expenses_2;
CREATE POLICY "income_expenses_2_select_own" ON public.income_expenses_2
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "income_expenses_2_insert_own" ON public.income_expenses_2;
CREATE POLICY "income_expenses_2_insert_own" ON public.income_expenses_2
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "income_expenses_2_update_own" ON public.income_expenses_2;
CREATE POLICY "income_expenses_2_update_own" ON public.income_expenses_2
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "income_expenses_2_delete_own" ON public.income_expenses_2;
CREATE POLICY "income_expenses_2_delete_own" ON public.income_expenses_2
  FOR DELETE USING (auth.uid() = created_by);


-- DOCUMENTS_2 için RLS
ALTER TABLE public.documents_2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_2_select_own" ON public.documents_2;
CREATE POLICY "documents_2_select_own" ON public.documents_2
  FOR SELECT USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "documents_2_insert_own" ON public.documents_2;
CREATE POLICY "documents_2_insert_own" ON public.documents_2
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "documents_2_delete_own" ON public.documents_2;
CREATE POLICY "documents_2_delete_own" ON public.documents_2
  FOR DELETE USING (auth.uid() = uploaded_by);


-- ================================================
-- TAMAMLANDI
-- ================================================
-- Bu SQL dosyasını Supabase SQL Editor'de çalıştırarak
-- dosyalar-2 ve gelir-gider-2 sayfaları için gerekli
-- tabloları oluşturabilirsiniz.

