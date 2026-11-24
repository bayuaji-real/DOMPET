/**
 * Paket langganan Dompetku: Gratis, Premium, Pro. Pak Wiryo (Arsitek).
 * Aturan Owner: Gratis = catat manual tanpa AI. Premium = AI terbatas. Pro = semua fitur dan AI besar.
 * Uji coba 7 hari untuk Premium dan Pro (sekali per paket). Kuota AI dan status paket dijaga SERVER (database),
 * bukan browser. Fitur non-AI hanya disembunyikan di tampilan (datanya milik pengguna sendiri, tanpa biaya AI).
 */
export type Plan = "free" | "premium" | "pro";

export const PLAN_RANK: Record<Plan, number> = { free: 0, premium: 1, pro: 2 };
export const PLAN_LABEL: Record<Plan, string> = { free: "Basic", premium: "Pro", pro: "Pro" };
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
  ai_chat: "pro", ai_struk: "pro", ai_suara: "pro", ai_insight: "pro", ai_rencana: "pro", ai_impor: "pro",
  skor_kesehatan: "pro", peringatan_dini: "pro", simulator_cicilan: "pro", mode_thr: "pro",
  proyeksi_arus_kas: "pro", lunasi_utang: "free",
  kalkulator_investasi: "free", portofolio: "pro", info_pasar: "pro",
  laporan_mingguan: "free", kalkulator_zakat: "free", impor_csv: "free", impor_ai: "pro", dompet_bersama: "pro", pengingat: "free",
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  ai_chat: "Tanya Ruby", ai_struk: "Foto struk", ai_suara: "Catat dengan suara", ai_insight: "Insight dari Ruby",
  ai_rencana: "Rencana Keuangan Ruby", ai_impor: "Impor mutasi dengan Ruby",
  skor_kesehatan: "Skor kesehatan keuangan", peringatan_dini: "Peringatan dini", simulator_cicilan: "Simulator cicilan & paylater",
  mode_thr: "Mode THR & Lebaran", proyeksi_arus_kas: "Proyeksi arus kas 3 bulan", lunasi_utang: "Rencana lunasi utang",
  kalkulator_investasi: "Kalkulator investasi", portofolio: "Portofolio investasi", info_pasar: "Info pasar & peringkat return",
  laporan_mingguan: "Laporan mingguan", kalkulator_zakat: "Kalkulator zakat", impor_csv: "Impor mutasi CSV", impor_ai: "Impor teks/PDF dengan Ruby", dompet_bersama: "Dompet bersama", pengingat: "Pengingat"
};

export type AiFeatureKey = Extract<FeatureKey, `ai_${string}`>;
/** impor_ai dijaga server lewat kunci ai_impor. */
/** Jenis fitur AI di tabel ai_usage_logs. */
export const AI_LOG_FEATURE: Record<AiFeatureKey, "tabungan" | "konsultasi" | "struk" | "suara" | "insight" | "rencana" | "impor"> = {
  ai_chat: "konsultasi", ai_struk: "struk", ai_suara: "suara", ai_insight: "insight", ai_rencana: "rencana", ai_impor: "impor",
};

/** Jatah cicip fitur Ruby untuk Basic. Kunci = jenis di ai_usage_logs (struk, suara, konsultasi, tabungan, insight, rencana, impor). */
export type CicipItem = { limit: number; used: number; remaining: number; per: "hari" | "akun" };
export type Cicip = Record<string, CicipItem>;
export const CICIP_LABEL: Record<string, string> = { struk: "Foto struk", suara: "Catat suara", konsultasi: "Tanya Ruby", tabungan: "Buat Tabungan dengan Ruby", insight: "Insight dari Ruby", rencana: "Rencana Keuangan Ruby", impor: "Impor dengan Ruby" };

export interface Entitlement {
  plan: Plan;
  source: "paid" | "trial" | "free";
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  trialAvailable: { premium: boolean; pro: boolean };
  aiUsed: number;
  aiLimit: number;
  aiRemaining: number;
  cicip: Cicip;
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
  const cicip: Cicip = {};
  if (r.cicip && typeof r.cicip === "object") {
    for (const [k, v] of Object.entries(r.cicip as Record<string, unknown>)) {
      const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      cicip[k] = { limit: num(o.limit), used: num(o.used), remaining: num(o.remaining), per: o.per === "hari" ? "hari" : "akun" };
    }
  }
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
    cicip,
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
  return `${FEATURE_LABEL[feature]} ada di paket ${need} ke atas. Coba Pro gratis 7 hari di halaman Paket.`;
}

export const QUOTA_MESSAGE = "Kuota Ruby bulan ini sudah habis. Kuota kembali penuh di awal bulan, atau naik ke paket Pro untuk kuota lebih besar.";

/** Label sisa jatah cicip, mis. "Sisa 1x hari ini". Null kalau jatah tidak ada. */
export function sisaLabel(c: { limit: number; used: number; remaining: number; per: "hari" | "akun" } | undefined): { n: number; text: string } | null {
  if (!c || c.limit <= 0) return null;
  const n = Math.max(c.remaining, 0);
  return { n, text: n > 0 ? `Sisa ${n}x ${c.per === "hari" ? "hari ini" : "jatah cicip"}` : c.per === "hari" ? "Jatah hari ini habis" : "Jatah cicip habis" };
}

/** Pesan ketika jatah cicip Basic habis. */
export function cicipHabisMessage(key: string, per: "hari" | "akun"): string {
  const nama = CICIP_LABEL[key] ?? "Fitur Ruby";
  return per === "hari"
    ? `Jatah cicip ${nama} hari ini sudah habis. Coba lagi besok, atau naik ke Pro untuk tanpa batas.`
    : `Jatah cicip ${nama} sudah terpakai. Naik ke Pro untuk memakainya sepuasnya.`;
}

/** Batas jumlah paket Basic (sama dengan trigger database `_batas_basic`). */
export const BATAS_BASIC = { TABUNGAN: 3, BERULANG: 5, PLANNER: 1 } as const;

/** Pesan ramah kalau database menolak karena batas jumlah Basic. Null kalau galatnya bukan itu. */
export function batasBasicMessage(err: unknown): string | null {
  const raw = typeof err === "string" ? err : err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = /BATAS_BASIC_(TABUNGAN|BERULANG|PLANNER)/.exec(raw);
  if (!m) return null;
  const k = m[1] as keyof typeof BATAS_BASIC;
  const nama = { TABUNGAN: "target tabungan", BERULANG: "transaksi berulang", PLANNER: "Planner Acara" }[k];
  return `Paket Basic maksimal ${BATAS_BASIC[k]} ${nama}. Naik ke Pro untuk tanpa batas.`;
}

/** Teks pemetaan galat fungsi database ke bahasa awam. */
export function trialErrorMessage(raw: string | undefined | null): string {
  const m = String(raw ?? "");
  if (m.includes("UJICOBA_SUDAH_DIPAKAI")) return "Uji coba paket ini sudah pernah kamu pakai.";
  if (m.includes("UJICOBA_MASIH_BERJALAN")) return "Uji coba kamu masih berjalan. Tunggu sampai selesai dulu ya.";
  if (m.includes("SUDAH_BERLANGGANAN")) return "Kamu sudah berlangganan, jadi tidak perlu uji coba.";
  if (m.includes("BELUM_LOGIN")) return "Silakan masuk dulu.";
  return "Uji coba belum bisa dimulai. Coba lagi sebentar.";
}

export const INVEST_DISCLAIMER =
  "Informasi untuk edukasi, bukan ajakan atau rekomendasi membeli. Kinerja masa lalu tidak menjamin hasil di masa depan. Investasi mengandung risiko, nilai bisa turun dan modal bisa berkurang. Cek prospektus dan izin OJK produknya sendiri.";
