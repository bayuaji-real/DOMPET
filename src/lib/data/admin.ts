import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
type F = Database["public"]["Functions"];
export type AdminUser = F["admin_list_users"]["Returns"][number];
export type AdminRequest = F["admin_list_requests"]["Returns"][number];
export type AdminAudit = F["admin_list_audit"]["Returns"][number];

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
export const listUsers = () => rpc(c().rpc("admin_list_users"));
export const setPlan = (user: string, plan: string, days: number | null) => rpc(c().rpc("admin_set_plan", { p_user: user, p_plan: plan, p_days: days }));
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

const MSG: Record<string, string> = {
  MFA_WAJIB: "Masukkan kode 6 angka dari aplikasi authenticator dulu.", MFA_BELUM_AKTIF: "Aktifkan MFA di menu Keamanan dan masukkan kodenya dulu, baru wajibkan untuk admin.", KODE_TIDAK_VALID: "Kode hanya boleh huruf kecil, angka, dan garis bawah (2 sampai 40 karakter).",
  BUKAN_ADMIN: "Kamu tidak punya akses untuk tindakan ini.", TIDAK_BISA_UBAH_DIRI_SENDIRI: "Peran akunmu sendiri tidak bisa diubah di sini.",
  SUMBER_WAJIB_HTTPS: "Alamat sumber harus diawali https://", TANGGAL_TIDAK_VALID: "Tanggal tidak valid.", HARI_TIDAK_VALID: "Jumlah hari harus 1 sampai 3650.",
  ANGGARAN_TIDAK_VALID: "Nilai top-up tidak valid.", AMBANG_TIDAK_VALID: "Ambang peringatan harus 10 sampai 95 persen.",
};
export function adminErrorText(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  const k = Object.keys(MSG).find((x) => m.includes(x));
  return k ? MSG[k] : "Belum berhasil. Coba lagi sebentar.";
}
