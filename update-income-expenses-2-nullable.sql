-- ================================================
-- income_expenses_2 tablosunda case_id'yi NULL'a izin verecek şekilde güncelle
-- ================================================
-- Bu, genel ofis gelir-giderlerinin dosya ile ilişkilendirilmeden
-- kaydedilmesine olanak tanır.

-- case_id kolonunu NULL'a izin verecek şekilde değiştir
ALTER TABLE public.income_expenses_2 
  ALTER COLUMN case_id DROP NOT NULL;

-- Mevcut foreign key constraint'i kaldır
ALTER TABLE public.income_expenses_2 
  DROP CONSTRAINT IF EXISTS income_expenses_2_case_id_fkey;

-- Yeni foreign key constraint ekle (NULL değerlere izin veren)
ALTER TABLE public.income_expenses_2 
  ADD CONSTRAINT income_expenses_2_case_id_fkey 
  FOREIGN KEY (case_id) 
  REFERENCES public.cases_2(id) 
  ON DELETE CASCADE;

-- description kolonunu da NULL'a izin verecek şekilde güncelle
ALTER TABLE public.income_expenses_2 
  ALTER COLUMN description DROP NOT NULL;

COMMENT ON COLUMN public.income_expenses_2.case_id IS 'Dosya ID (NULL ise genel ofis işlemi)';
COMMENT ON COLUMN public.income_expenses_2.description IS 'İşlem açıklaması (opsiyonel)';

