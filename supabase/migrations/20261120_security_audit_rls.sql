-- =========================================================================
-- SUPABASE SECURITY AUDIT & RLS HARDENING MIGRATION
-- Memastikan semua tabel & bucket Storage mengaktifkan RLS penuh,
-- mencegah kebocoran data multi-tenant, dan memperbaiki temuan Security Advisor.
-- =========================================================================

-- 1. AKTIFKAN RLS DI SEMUA TABEL UTAMA
ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payday_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_insights ENABLE ROW LEVEL SECURITY;

-- 2. KEBIJAKAN AKSES (RLS POLICIES) TABEL USER-OWNED
-- Tabel: wallets
DROP POLICY IF EXISTS "Users can manage own wallets" ON public.wallets;
CREATE POLICY "Users can manage own wallets"
  ON public.wallets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: categories (bisa baca default atau milik sendiri)
DROP POLICY IF EXISTS "Users can view default or own categories" ON public.categories;
CREATE POLICY "Users can view default or own categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_default = true);

DROP POLICY IF EXISTS "Users can manage own custom categories" ON public.categories;
CREATE POLICY "Users can manage own custom categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom categories" ON public.categories;
CREATE POLICY "Users can update own custom categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom categories" ON public.categories;
CREATE POLICY "Users can delete own custom categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_default = false);

-- Tabel: savings_goals
DROP POLICY IF EXISTS "Users can manage own savings goals" ON public.savings_goals;
CREATE POLICY "Users can manage own savings goals"
  ON public.savings_goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: budgets
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users can manage own budgets"
  ON public.budgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: recurring_transactions
DROP POLICY IF EXISTS "Users can manage own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can manage own recurring transactions"
  ON public.recurring_transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: payday_schedule
DROP POLICY IF EXISTS "Users can manage own payday schedule" ON public.payday_schedule;
CREATE POLICY "Users can manage own payday schedule"
  ON public.payday_schedule
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings"
  ON public.user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabel: ai_insights
DROP POLICY IF EXISTS "Users can manage own insights" ON public.ai_insights;
CREATE POLICY "Users can manage own insights"
  ON public.ai_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. STORAGE BUCKET SECURITY ('receipts')
-- Buat bucket private jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Kebijakan akses Storage: hanya pemilik folder {user_id}/ yang boleh mengakses
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own receipts" ON storage.objects;
CREATE POLICY "Users can delete own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. FIX SECURITY DEFINER FUNCTIONS (Supabase Advisor Recommendation: set search_path)
ALTER FUNCTION IF EXISTS public.get_financial_analytics(DATE, DATE)
  SET search_path = public, pg_temp;
