/**
 * Paket langganan Dompetku: Gratis, Premium, Pro. Pak Wiryo (Arsitek).
 * Aturan Owner: Gratis = catat manual tanpa AI. Premium = AI terbatas. Pro = semua fitur dan AI besar.
 * Uji coba 7 hari untuk Premium dan Pro (sekali per paket). Kuota AI dan status paket dijaga SERVER (database),
 * bukan browser. Fitur non-AI hanya disembunyikan di tampilan (datanya milik pengguna sendiri, tanpa biaya AI).
 */
export type Plan = "free" | "premium" | "pro";

export const PLAN_RANK: Record<Plan, number> = { free: 0, premium: 1, pro: 2 };
export const PLAN_LABEL: Record<Plan, string> = { free: "Gratis", premium: "Premium", pro: "Pro" };
export const TRIAL_DAYS = 7;

export type FeatureKey =
  // AI (dijaga server)
  | "ai_chat" | "ai_struk" | "ai_suara" | "ai_insight" | "ai_rencana" | "ai_impor"
  // Konsultan (non-AI, dihitung di perangkat)
  | "skor_kesehatan" | "peringatan_dini" | "simulator_cicilan" | "mode_thr"
  | "proyeksi_arus_kas" | "lunasi_utang"
  // Investasi
  | "kalkulator_investasi" | "portofolio" | "info_pasar"
  // Umum
  | "laporan_mingguan" | "kalkulator_zakat" | "impor_csv" | "impor_ai" | "dompet_bersama" | "pengingat";

export const FEATURE_MIN_PLAN: Record<FeatureKey, Plan> = {
  ai_chat: "premium", ai_struk: "premium", ai_suara: "premium", ai_insight: "premium", ai_rencana: "premium", ai_impor: "premium",
  skor_kesehatan: "premium", peringatan_dini: "premium", simulator_cicilan: "premium", mode_thr: "premium",
  proyeksi_arus_kas: "pro", lunasi_utang: "pro",
  kalkulator_investasi: "free", portofolio: "premium", info_pasar: "pro",
  laporan_mingguan: "free", kalkulator_zakat: "free", impor_csv: "premium", impor_ai: "premium", dompet_bersama: "premium", pengingat: "free",
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  ai_chat: "Tanya Ruby (AI)", ai_struk: "Foto struk", ai_suara: "Catat dengan suara", ai_insight: "Insight dari Ruby",
  ai_rencana: "Rencana Keuangan AI", ai_impor: "Impor mutasi dengan AI",
  skor_kesehatan: "Skor kesehatan keuangan", peringatan_dini: "Peringatan dini", simulator_cicilan: "Simulator cicilan & paylater",
  mode_thr: "Mode THR & Lebaran", proyeksi_arus_kas: "Proyeksi arus kas 3 bulan", lunasi_utang: "Rencana lunasi utang",
  kalkulator_investasi: "Kalkulator investasi", portofolio: "Portofolio investasi", info_pasar: "Info pasar & peringkat return",
  laporan_mingguan: "Laporan mingguan", kalkulator_zakat: "Kalkulator zakat", impor_csv: "Impor mutasi CSV", impor_ai: "Impor teks/PDF dengan AI", dompet_bersama: "Dompet bersama", pengingat: "Pengingat"
};

export type AiFeatureKey = Extract<FeatureKey, `ai_${string}`>;
/** impor_ai dijaga server lewat kunci ai_impor. */
/** Jenis fitur AI di tabel ai_usage_logs. */
export const AI_LOG_FEATURE: Record<AiFeatureKey, "tabungan" | "konsultasi" | "struk" | "suara" | "insight" | "rencana" | "impor"> = {
  ai_chat: "konsultasi", ai_struk: "struk", ai_suara: "suara", ai_insight: "insight", ai_rencana: "rencana", ai_impor: "impor",
};

export interface Entitlement {
  plan: Plan;
  source: "paid" | "trial" | "free";
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  trialAvailable: { premium: boolean; pro: boolean };
  aiUsed: number;
  aiLimit: number;
  aiRemaining: number;
}

export function canUse(plan: Plan, feature: FeatureKey): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

export function isPlan(v: unknown): v is Plan {
  return v === "free" || v === "premium" || v === "pro";
}

/** Ubah hasil fungsi database get_my_entitlement() menjadi objek aman. Nilai aneh = paket Gratis. */
export function parseEntitlement(raw: unknown): Entitlement {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const plan: Plan = isPlan(r.plan) ? r.plan : "free";
  const source = r.source === "paid" || r.source === "trial" ? r.source : "free";
  const ta = (r.trial_available && typeof r.trial_available === "object" ? r.trial_available : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const aiLimit = num(r.ai_limit);
  const aiUsed = num(r.ai_used);
  return {
    plan,
    source,
    trialEndsAt: typeof r.trial_ends_at === "string" ? r.trial_ends_at : null,
    planExpiresAt: typeof r.plan_expires_at === "string" ? r.plan_expires_at : null,
    trialAvailable: { premium: ta.premium === true, pro: ta.pro === true },
    aiUsed,
    aiLimit,
    aiRemaining: Math.max(aiLimit - aiUsed, 0),
  };
}

/** Sisa hari uji coba (dibulatkan ke atas). 0 kalau sudah habis atau tidak ada. */
export function trialDaysLeft(trialEndsAt: string | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/** Pesan ramah ketika fitur butuh paket lebih tinggi. */
export function upgradeMessage(feature: FeatureKey): string {
  const need = PLAN_LABEL[FEATURE_MIN_PLAN[feature]];
  return `${FEATURE_LABEL[feature]} ada di paket ${need} ke atas. Coba gratis 7 hari di halaman Paket.`;
}

export const QUOTA_MESSAGE = "Kuota AI bulan ini sudah habis. Kuota kembali penuh di awal bulan, atau naik ke paket Pro untuk kuota lebih besar.";

/** Teks pemetaan galat fungsi database ke bahasa awam. */
export function trialErrorMessage(raw: string | undefined | null): string {
  const m = String(raw ?? "");
  if (m.includes("UJICOBA_SUDAH_DIPAKAI")) return "Uji coba paket ini sudah pernah kamu pakai.";
  if (m.includes("UJICOBA_MASIH_BERJALAN")) return "Uji coba kamu masih berjalan. Tunggu sampai selesai dulu ya.";
  if (m.includes("SUDAH_BERLANGGANAN")) return "Kamu sudah berlangganan, jadi tidak perlu uji coba.";
  if (m.includes("BELUM_LOGIN")) return "Silakan masuk dulu.";
  return "Uji coba belum bisa dimulai. Coba lagi sebentar.";
}

export const RUBY_DISCLAIMER =
  "Ruby hanya memberi saran berdasarkan riset dan data yang kamu catat. Ini bukan nasihat keuangan atau investasi berlisensi, jadi cek ulang sendiri sebelum mengambil keputusan.";
export const INVEST_DISCLAIMER =
  "Informasi untuk edukasi, bukan ajakan atau rekomendasi membeli. Kinerja masa lalu tidak menjamin hasil di masa depan. Investasi mengandung risiko, nilai bisa turun dan modal bisa berkurang. Cek prospektus dan izin OJK produknya sendiri.";
