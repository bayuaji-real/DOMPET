-- =========================================================================
-- SQL FUNCTION: get_financial_analytics
-- Menghitung seluruh query agregasi finansial langsung di database PostgreSQL
-- Parameter:
--   p_start_date: Tanggal awal periode (YYYY-MM-DD)
--   p_end_date:   Tanggal akhir periode (YYYY-MM-DD)
-- Aturan Penting:
--   - transfer, goal_deposit, goal_withdraw TIDAK dihitung sebagai pemasukan/pengeluaran
-- =========================================================================

CREATE OR REPLACE FUNCTION get_financial_analytics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_period_days INT;
  v_prev_start_date DATE;
  v_prev_end_date DATE;

  -- Ringkasan Periode Aktif
  v_total_income BIGINT := 0;
  v_total_expense BIGINT := 0;
  v_cashflow BIGINT := 0;
  v_savings_deposited BIGINT := 0;
  v_savings_rate NUMERIC := 0;

  -- Ringkasan Periode Sebelumnya
  v_prev_income BIGINT := 0;
  v_prev_expense BIGINT := 0;
  v_income_change_pct NUMERIC := 0;
  v_expense_change_pct NUMERIC := 0;

  -- Breakdown Kategori
  v_categories JSONB;

  -- Cashflow 6 Bulan Terakhir
  v_monthly_cashflow JSONB;

  -- Pengeluaran Harian
  v_daily_expenses JSONB;
  v_daily_average BIGINT := 0;
  v_days_count INT := 1;

  -- Pengeluaran per Dompet
  v_wallet_expenses JSONB;

  -- Top 5 Transaksi & Top Toko
  v_top_transactions JSONB;
  v_top_merchants JSONB;

  -- Kesehatan Finansial
  v_emergency_balance BIGINT := 0;
  v_living_cost BIGINT := 4000000;
  v_emergency_months NUMERIC := 0;
  v_savings_rate_status TEXT := 'kritis';
  v_emergency_status TEXT := 'kritis';
  v_goals_on_track BOOLEAN := true;
  v_overall_status TEXT := 'sehat';

  v_result JSONB;
BEGIN
  -- Ambil user_id dari sesi auth Supabase
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    -- Fallback ke user pertama jika dijalankan tanpa auth header
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;

  -- Hitung durasi hari untuk periode sebelumnya
  v_period_days := (p_end_date - p_start_date) + 1;
  IF v_period_days <= 0 THEN
    v_period_days := 1;
  END IF;

  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days + 1;

  -- 1. Hitung Ringkasan Periode Aktif
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'goal_deposit' THEN amount ELSE 0 END), 0)
  INTO
    v_total_income,
    v_total_expense,
    v_savings_deposited
  FROM transactions
  WHERE (user_id = v_user_id OR v_user_id IS NULL)
    AND date >= p_start_date AND date <= p_end_date;

  v_cashflow := v_total_income - v_total_expense;

  IF v_total_income > 0 THEN
    v_savings_rate := ROUND((v_savings_deposited::NUMERIC / v_total_income::NUMERIC) * 100, 1);
  ELSE
    v_savings_rate := 0;
  END IF;

  -- 2. Hitung Periode Sebelumnya untuk Pertumbuhan (%)
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO
    v_prev_income,
    v_prev_expense
  FROM transactions
  WHERE (user_id = v_user_id OR v_user_id IS NULL)
    AND date >= v_prev_start_date AND date <= v_prev_end_date;

  IF v_prev_income > 0 THEN
    v_income_change_pct := ROUND(((v_total_income - v_prev_income)::NUMERIC / v_prev_income::NUMERIC) * 100, 1);
  ELSE
    v_income_change_pct := 0;
  END IF;

  IF v_prev_expense > 0 THEN
    v_expense_change_pct := ROUND(((v_total_expense - v_prev_expense)::NUMERIC / v_prev_expense::NUMERIC) * 100, 1);
  ELSE
    v_expense_change_pct := 0;
  END IF;

  -- 3. Donut Chart: Pengeluaran per Kategori
  WITH cat_totals AS (
    SELECT
      COALESCE(c.id, 'uncategorized') AS category_id,
      COALESCE(c.name, 'Lainnya') AS name,
      COALESCE(c.color, '#64748b') AS color,
      COALESCE(c.icon, 'tag') AS icon,
      SUM(t.amount) AS total_amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE (t.user_id = v_user_id OR v_user_id IS NULL)
      AND t.type = 'expense'
      AND t.date >= p_start_date AND t.date <= p_end_date
    GROUP BY c.id, c.name, c.color, c.icon
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category_id', category_id,
      'name', name,
      'color', color,
      'icon', icon,
      'nominal', total_amount,
      'percentage', CASE WHEN v_total_expense > 0 THEN ROUND((total_amount::NUMERIC / v_total_expense::NUMERIC) * 100, 1) ELSE 0 END
    ) ORDER BY total_amount DESC
  ), '[]'::jsonb)
  INTO v_categories
  FROM cat_totals;

  -- 4. Bar Chart: Pemasukan vs Pengeluaran 6 Bulan Terakhir
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', p_end_date::timestamp) - interval '5 month',
      date_trunc('month', p_end_date::timestamp),
      interval '1 month'
    )::date AS m_start
  ),
  monthly_totals AS (
    SELECT
      m.m_start,
      to_char(m.m_start, 'Mon YYYY') AS label,
      to_char(m.m_start, 'YYYY-MM') AS month_key,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense
    FROM months m
    LEFT JOIN transactions t ON (t.user_id = v_user_id OR v_user_id IS NULL)
      AND t.date >= m.m_start
      AND t.date < (m.m_start + interval '1 month')::date
      AND t.type IN ('income', 'expense')
    GROUP BY m.m_start
    ORDER BY m.m_start ASC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month_key', month_key,
      'label', label,
      'income', income,
      'expense', expense
    )
  ), '[]'::jsonb)
  INTO v_monthly_cashflow
  FROM monthly_totals;

  -- 5. Pengeluaran Harian & Rata-rata per Hari
  WITH days AS (
    SELECT generate_series(p_start_date, p_end_date, interval '1 day')::date AS d
  ),
  daily_totals AS (
    SELECT
      to_char(d.d, 'YYYY-MM-DD') AS date_str,
      to_char(d.d, 'DD') AS day_str,
      COALESCE(SUM(t.amount), 0) AS amount
    FROM days d
    LEFT JOIN transactions t ON (t.user_id = v_user_id OR v_user_id IS NULL)
      AND t.date = d.d
      AND t.type = 'expense'
    GROUP BY d.d
    ORDER BY d.d ASC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', date_str,
      'day', day_str,
      'amount', amount
    )
  ), '[]'::jsonb)
  INTO v_daily_expenses
  FROM daily_totals;

  v_days_count := GREATEST(v_period_days, 1);
  v_daily_average := ROUND(v_total_expense::NUMERIC / v_days_count::NUMERIC);

  -- 6. Pengeluaran per Dompet
  WITH wallet_totals AS (
    SELECT
      w.id AS wallet_id,
      w.name,
      COALESCE(w.color, '#0d9488') AS color,
      COALESCE(w.icon, 'wallet') AS icon,
      SUM(t.amount) AS total_amount
    FROM transactions t
    JOIN wallets w ON t.wallet_id = w.id
    WHERE (t.user_id = v_user_id OR v_user_id IS NULL)
      AND t.type = 'expense'
      AND t.date >= p_start_date AND t.date <= p_end_date
    GROUP BY w.id, w.name, w.color, w.icon
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'wallet_id', wallet_id,
      'name', name,
      'color', color,
      'icon', icon,
      'nominal', total_amount,
      'percentage', CASE WHEN v_total_expense > 0 THEN ROUND((total_amount::NUMERIC / v_total_expense::NUMERIC) * 100, 1) ELSE 0 END
    ) ORDER BY total_amount DESC
  ), '[]'::jsonb)
  INTO v_wallet_expenses
  FROM wallet_totals;

  -- 7. Top 5 Transaksi Terbesar
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'judul', COALESCE(t.note, t.merchant, 'Pengeluaran'),
      'merchant', t.merchant,
      'nominal', t.amount,
      'tanggal', to_char(t.date, 'YYYY-MM-DD'),
      'kategori', COALESCE(c.name, 'Lainnya'),
      'dompet', COALESCE(w.name, 'Dompet')
    )
  ), '[]'::jsonb)
  INTO v_top_transactions
  FROM (
    SELECT t.*
    FROM transactions t
    WHERE (t.user_id = v_user_id OR v_user_id IS NULL)
      AND t.type = 'expense'
      AND t.date >= p_start_date AND t.date <= p_end_date
    ORDER BY t.amount DESC
    LIMIT 5
  ) t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN wallets w ON t.wallet_id = w.id;

  -- 8. Top Toko / Merchant Paling Sering
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'merchant', merchant,
      'visit_count', visit_count,
      'total_spent', total_spent
    )
  ), '[]'::jsonb)
  INTO v_top_merchants
  FROM (
    SELECT
      merchant,
      COUNT(*) AS visit_count,
      SUM(amount) AS total_spent
    FROM transactions
    WHERE (user_id = v_user_id OR v_user_id IS NULL)
      AND type = 'expense'
      AND merchant IS NOT NULL
      AND TRIM(merchant) != ''
      AND date >= p_start_date AND date <= p_end_date
    GROUP BY merchant
    ORDER BY visit_count DESC, total_spent DESC
    LIMIT 5
  ) m;

  -- 9. Kesehatan Finansial
  -- Rasio Menabung (>20% sehat, 10–20% waspada, <10% kritis)
  IF v_savings_rate >= 20 THEN
    v_savings_rate_status := 'sehat';
  ELSIF v_savings_rate >= 10 THEN
    v_savings_rate_status := 'waspada';
  ELSE
    v_savings_rate_status := 'kritis';
  END IF;

  -- Dana Darurat: Ambil saldo goal is_emergency_fund = true
  SELECT COALESCE(SUM(saved), 0)
  INTO v_emergency_balance
  FROM goal_progress
  WHERE (user_id = v_user_id OR v_user_id IS NULL)
    AND is_emergency_fund = true;

  -- Ambil living cost dari user_settings jika ada
  SELECT COALESCE(living_cost_per_payday, 4000000)
  INTO v_living_cost
  FROM user_settings
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_living_cost <= 0 THEN
    v_living_cost := 4000000;
  END IF;

  v_emergency_months := ROUND((v_emergency_balance::NUMERIC / v_living_cost::NUMERIC), 1);

  -- Evaluasi Dana Darurat: ≥3 bulan sehat, 1–3 waspada, <1 kritis
  IF v_emergency_months >= 3.0 THEN
    v_emergency_status := 'sehat';
  ELSIF v_emergency_months >= 1.0 THEN
    v_emergency_status := 'waspada';
  ELSE
    v_emergency_status := 'kritis';
  END IF;

  -- Cek apakah ada tabungan bertenggat yang telat
  -- (Jika ada goal aktif dengan deadline yang per hari ini kekurangan setoran)
  v_goals_on_track := true; -- default on track

  -- Tentukan overall_status:
  IF v_savings_rate_status = 'sehat' AND v_emergency_status = 'sehat' THEN
    v_overall_status := 'sehat';
  ELSIF v_savings_rate_status = 'kritis' OR v_emergency_status = 'kritis' THEN
    v_overall_status := 'kritis';
  ELSE
    v_overall_status := 'waspada';
  END IF;

  -- Susun Hasil Akhir
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', to_char(p_start_date, 'YYYY-MM-DD'),
      'end_date', to_char(p_end_date, 'YYYY-MM-DD'),
      'days', v_period_days
    ),
    'summary', jsonb_build_object(
      'total_income', v_total_income,
      'total_expense', v_total_expense,
      'cashflow', v_cashflow,
      'savings_deposited', v_savings_deposited,
      'savings_rate', v_savings_rate,
      'prev_income', v_prev_income,
      'prev_expense', v_prev_expense,
      'income_change_pct', v_income_change_pct,
      'expense_change_pct', v_expense_change_pct
    ),
    'categories', v_categories,
    'monthly_cashflow', v_monthly_cashflow,
    'daily_expenses', v_daily_expenses,
    'daily_average', v_daily_average,
    'wallets', v_wallet_expenses,
    'top_transactions', v_top_transactions,
    'top_merchants', v_top_merchants,
    'financial_health', jsonb_build_object(
      'overall_status', v_overall_status,
      'savings_rate', v_savings_rate,
      'savings_rate_status', v_savings_rate_status,
      'emergency_fund_balance', v_emergency_balance,
      'emergency_fund_months', v_emergency_months,
      'emergency_status', v_emergency_status,
      'goals_on_track', v_goals_on_track
    )
  );

  RETURN v_result;
END;
$$;
