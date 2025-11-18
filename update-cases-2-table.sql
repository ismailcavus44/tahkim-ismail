-- Cases_2 tablosunu güncelle (Dava Dosyaları için)
-- Gereksiz kolonları kaldır ve yeni case_type kolonunu ekle

-- Case_type kolonunu ekle (dosya türü için)
ALTER TABLE public.cases_2 
ADD COLUMN IF NOT EXISTS case_type text;

-- Eski kolonları kaldır (artık kullanılmıyor)
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS title;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS vehicle_plate;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS car_dealer_id;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS damage_amount;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS sub_category;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS insurance_application_date;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS countdown_expires_at;
ALTER TABLE public.cases_2 DROP COLUMN IF EXISTS is_countdown_active;

-- Case_type için index ekle
CREATE INDEX IF NOT EXISTS idx_cases_2_case_type ON public.cases_2(case_type);

-- Açıklama ekle
COMMENT ON COLUMN public.cases_2.case_type IS 'Dosya türü (Boşanma Davası, İcra Takibi, vb.)';
COMMENT ON COLUMN public.cases_2.case_no IS 'Esas numarası';
COMMENT ON COLUMN public.cases_2.court_name IS 'Mahkeme adı';

