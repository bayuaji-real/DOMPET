import { createClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/types/database";
type F = Database["public"]["Functions"];
export type AdminUser = F["admin_list_users"]["Returns"][number];
export type AdminRequest = F["admin_list_requests"]["Returns"][number];
export type AdminAudit = F["admin_list_audit"]["Returns"][number];

export type DashboardSummary = {
  total_users: number;
  new_users_today: number;
  active_users_today: number;
  active_users_30d: number;
  cash_in_period: number;
  cash_in_month: number;
  ai_cost_period: number;
  ai_cost_month: number;
  pending_payments: number;
  oldest_pending_minutes: number;
  budget_idr: number;
  warn_pct: number;
  budget_used_pct: number | null;
  period_from: string;
  period_to: string;
};

export type PriceRow = {
  months: number;
  amount: number;
};

export type AiControlsData = {
  controls: {
    master_kill_switch: boolean;
    basic_ai_disabled_at_100pct: boolean;
    pro_hard_limit_enabled: boolean;
    feature_toggles: Record<string, boolean>;
  };
  usd_idr_rate: number;
};

export type ApiUsage = {
  configured: boolean; budget_idr: number; since: string; warn_pct: number; spent_idr: number; remaining_idr: number;
  used_pct: number | null; level: "belum_diatur" | "aman" | "waspada" | "kritis" | "habis"; days_left: number | null; avg_daily_idr: number;
  month_spent_idr: number; today_spent_idr: number; calls_month: number;
  by_feature: { feature: string; calls: number; cost_idr: number }[];
  daily: { day: string; calls: number; cost_idr: number }[];
};

const rpc = async <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> => {
  const { data, error } = await p; if (error) throw new Error(error.message); return data as T;
};
const c = () => createClient();

export async function getMyAdminRole(): Promise<"admin" | "superadmin" | null> {
  const { data, error } = await c().rpc("my_admin_role");
  if (error) return null;
  return data === "admin" || data === "superadmin" ? data : null;
}

export const getDashboardSummary = async (from?: string, to?: string): Promise<DashboardSummary> =>
  (await rpc(c().rpc("admin_dashboard_summary", { p_from: from ?? null, p_to: to ?? null }))) as unknown as DashboardSummary;

export const listPrices = () => rpc(c().rpc("admin_list_prices")) as Promise<PriceRow[]>;
export const setPrice = (months: number, amount: number) => rpc(c().rpc("admin_set_price", { p_months: months, p_amount: amount }));

export const getAiControls = async (): Promise<AiControlsData> =>
  (await rpc(c().rpc("admin_get_ai_controls"))) as unknown as AiControlsData;
export const setAiControls = (controls: Json, usdRate?: number) =>
  rpc(c().rpc("admin_set_ai_controls", { p_controls: controls, p_usd_idr_rate: usdRate }));

export const listUsers = () => rpc(c().rpc("admin_list_users"));
export const setPlan = (user: string, plan: string, days: number | null, reason?: string) =>
  rpc(c().rpc("admin_set_plan", { p_user: user, p_plan: plan, p_days: days, p_reason: reason ?? null }));
export const setRole = (user: string, role: string) => rpc(c().rpc("admin_set_role", { p_user: user, p_role: role }));
export const listRequests = () => rpc(c().rpc("admin_list_requests"));
export const resolveRequest = (id: string, status: string, days: number) => rpc(c().rpc("admin_resolve_request", { p_id: id, p_status: status, p_days: days }));
export const listAudit = () => rpc(c().rpc("admin_list_audit"));
export const getApiUsage = async (): Promise<ApiUsage> => (await rpc(c().rpc("admin_api_usage"))) as unknown as ApiUsage;
export const setApiBudget = (budget: number, since: string, warn: number) => rpc(c().rpc("admin_set_api_budget", { p_budget: budget, p_since: since, p_warn: warn }));

export type MarketInput = { id: string | null; name: string; category: string; risk: string; ret_1m: number | null; ret_ytd: number | null; ret_1y: number | null; aum: number | null; as_of: string; source_url: string };
export const upsertMarket = (m: MarketInput) => rpc(c().rpc("admin_upsert_market", { p_id: m.id, p_name: m.name, p_category: m.category, p_risk: m.risk, p_ret_1m: m.ret_1m, p_ret_ytd: m.ret_ytd, p_ret_1y: m.ret_1y, p_aum: m.aum, p_as_of: m.as_of, p_source_url: m.source_url }));
export const deleteMarket = (id: string) => rpc(c().rpc("admin_delete_market", { p_id: id }));

export type Benchmark = Database["public"]["Tables"]["market_benchmarks"]["Row"];
export type BenchmarkInput = { code: string; name: string; value: number; unit: string; as_of: string; source_name: string; source_url: string; note: string | null };
export const getBenchmarks = async (): Promise<Benchmark[]> => { const { data, error } = await c().from("market_benchmarks").select("*").order("code"); if (error) throw new Error(error.message); return (data ?? []) as Benchmark[]; };
export const upsertBenchmark = (b: BenchmarkInput) => rpc(c().rpc("admin_upsert_benchmark", { p_code: b.code, p_name: b.name, p_value: b.value, p_unit: b.unit, p_as_of: b.as_of, p_source_name: b.source_name, p_source_url: b.source_url, p_note: b.note }));
export const deleteBenchmark = (code: string) => rpc(c().rpc("admin_delete_benchmark", { p_code: code }));
export type MfaStatus = { role: "admin" | "superadmin" | null; require_mfa: boolean; aal: "aal1" | "aal2" };
export const getMfaStatus = async (): Promise<MfaStatus> => (await rpc(c().rpc("admin_mfa_status"))) as unknown as MfaStatus;
export const setRequireMfa = (on: boolean) => rpc(c().rpc("admin_set_require_mfa", { p_on: on }));

export type AdminHelpReport = {
  id: string;
  user_id: string;
  email: string | null;
  kind: "bug" | "usul";
  title: string;
  body: string;
  page: string | null;
  status: "baru" | "dibaca" | "dikerjakan" | "selesai";
  image_path: string | null;
  created_at: string;
};

export const listHelpReports = async (): Promise<AdminHelpReport[]> => {
  try {
    const res = await fetch("/api/admin/reports");
    if (!res.ok) {
      const { data, error } = await c().from("help_reports").select("*").order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []).map((r: any) => ({ ...r, email: null }));
    }
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
};

export const updateHelpReportStatus = async (id: string, status: string): Promise<void> => {
  const res = await fetch("/api/admin/reports", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Gagal memperbarui status laporan");
  }
};

export const getHelpReportAttachmentUrl = async (imagePath: string): Promise<string | null> => {
  try {
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signed_url", imagePath }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.signedUrl ?? null;
  } catch {
    return null;
  }
};

const MSG: Record<string, string> = {
  MFA_WAJIB: "Masukkan kode 6 angka dari aplikasi authenticator dulu.",
  MFA_BELUM_AKTIF: "Aktifkan MFA di menu Keamanan dan masukkan kodenya dulu, baru wajibkan untuk admin.",
  KODE_TIDAK_VALID: "Kode hanya boleh huruf kecil, angka, dan garis bawah (2 sampai 40 karakter).",
  BUKAN_ADMIN: "Kamu tidak punya akses untuk tindakan ini.",
  TIDAK_BISA_UBAH_DIRI_SENDIRI: "Peran akunmu sendiri tidak bisa diubah di sini.",
  SUMBER_WAJIB_HTTPS: "Alamat sumber harus diawali https://",
  TANGGAL_TIDAK_VALID: "Tanggal tidak valid.",
  HARI_TIDAK_VALID: "Jumlah hari harus 1 sampai 3650.",
  PERMINTAAN_TIDAK_ADA: "Permintaan tidak ditemukan.",
  SUDAH_DIPROSES: "Permintaan ini sudah dikonfirmasi atau ditolak.",
  KEDALUWARSA_TANPA_BUKTI: "Permintaan sudah kedaluwarsa dan tidak ada bukti. Minta pengguna membuat permintaan baru.",
  ANGGARAN_TIDAK_VALID: "Nilai top-up tidak valid.",
  AMBANG_TIDAK_VALID: "Ambang peringatan harus 10 sampai 95 persen.",
  ALASAN_WAJIB_DIISI: "Alasan perubahan paket wajib diisi (minimal 5 karakter).",
  PAKET_TIDAK_DIKENAL: "Pilihan paket hanya boleh Basic atau Pro.",
  DURASI_TIDAK_VALID: "Durasi paket hanya 1, 6, atau 12 bulan.",
  HARGA_TIDAK_VALID: "Nominal harga tidak valid (harus Rp1.000 sampai Rp100.000.000).",
  KONTROL_AI_TIDAK_VALID: "Format pengaturan saklar AI tidak valid.",
  KURS_TIDAK_VALID: "Kurs USD ke Rupiah harus antara Rp5.000 sampai Rp50.000.",
};

export function adminErrorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  const k = Object.keys(MSG).find((x) => m.includes(x));
  return k ? MSG[k] : "Belum berhasil. Coba lagi sebentar.";
}
