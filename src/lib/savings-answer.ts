/**
 * Membaca jawaban pengguna atas pertanyaan balik Ruby (gaji, tanggal gajian, biaya hidup) dengan aturan kode,
 * tanpa AI, jadi gratis dan bisa dites. Bila tidak terbaca, pemanggil boleh meneruskan ke AI.
 */
import { parseAmount } from "@/lib/konsultan/purchase-parse";
import type { PlanHints } from "@/lib/savings-queue";

export type AskKind = "gaji" | "tanggal_gajian" | "biaya_hidup" | "komitmen_rutin";

const AMOUNT_RE = /(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k|miliar|m)?(?![a-z0-9])/gi;
const MIN_MONEY = 100_000;

function findMoney(text: string, min = MIN_MONEY): number {
  AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_RE.exec(text))) {
    const v = parseAmount(m[1] + (m[2] ?? ""));
    if (v >= min) return v;
  }
  return 0;
}

function allMoney(text: string, min: number): number[] {
  const out: number[] = [];
  AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_RE.exec(text))) {
    const v = parseAmount(m[1] + (m[2] ?? ""));
    if (v >= min) out.push(v);
  }
  return out;
}

const NONE_RE = /^\s*(tidak ada|tidak|nggak ada|nggak|gak ada|gak|ga ada|enggak|belum ada|nihil|kosong|nol|0)\s*[.!]*\s*$/i;

function findDay(text: string, bare: boolean): number {
  const m = /\b(?:tanggal|tgl)\.?\s*(\d{1,2})\b/i.exec(text) ?? (bare ? /^\D*(\d{1,2})\D*$/.exec(text) : null);
  const d = m ? Number(m[1]) : 0;
  return d >= 1 && d <= 31 ? d : 0;
}

/** Pengguna bingung / belum tahu biaya hidupnya: Ruby membantu dengan menanyakan kebutuhannya. */
export const CONFUSED_RE = /\b(bingung|binggung|gatau|ga tau|gak tau|nggak tau|ngga tau|tidak tahu|nggak tahu|ga tahu|gak tahu|belum tahu|belum punya|entah|bantu)\b/i;

export const LIVING_HELP_TEXT =
  "Tenang, kita hitung bareng ya. Biaya hidup itu kebutuhan harian saja: makan, minum dan jajan, laundry, transport, dan kebutuhan harian lain seperti sabun. Tagihan dan langganan jangan dihitung di sini. Tulis perkiraan per bulan untuk tiap kebutuhan, contoh: \"makan 1,5 juta, minum 200 ribu, laundry 150 ribu, transport 400 ribu\". Nanti aku jumlahkan.";

const NEED_WORD_RE = /makan|minum|jajan|kopi|galon|laundry|transport|bensin|ojek|angkot|sabun/gi;

const WANTS_AVERAGE = /\b(rata[- ]?rata|pakai (itu|yang itu|saja)|boleh|setuju|oke|ok|iya|ya)\b/i;

/**
 * Hasilnya hanya berisi hal yang benar-benar tertulis di jawaban. Null bila tidak ada yang terbaca.
 * `averageOffered`: pertanyaan tadi menawarkan rata-rata, jadi "ya/boleh" berarti memilih rata-rata.
 */
export function parseBasisAnswer(ask: AskKind, text: string, averageOffered: boolean): PlanHints | null {
  const t = text.toLowerCase();
  if (ask === "gaji") {
    const day = findDay(t, false);
    const income = findMoney(t.replace(/\b(?:tanggal|tgl)\.?\s*\d{1,2}\b/g, " "));
    if (!income && !day) return null;
    return { ...(income ? { monthly_income: income } : {}), ...(day ? { payday_day: day } : {}) };
  }
  if (ask === "tanggal_gajian") {
    const day = findDay(t, true);
    return day ? { payday_day: day } : null;
  }
  if (ask === "komitmen_rutin") {
    // Angka yang ditulis menang; "tidak ada" = 0 (dijawab, bukan belum ditanya). Komitmen boleh kecil (min Rp10.000).
    // Lebih dari satu angka (misal rincian zakat dan investasi): jangan menebak mana totalnya, serahkan ke pembaca lain.
    const all = allMoney(t, 10_000);
    if (all.length === 1) return { other_fixed_monthly: all[0] };
    if (all.length > 1) return null;
    return NONE_RE.test(t) ? { other_fixed_monthly: 0 } : null;
  }
  // biaya_hidup: rincian kebutuhan (minimal dua kebutuhan dan dua angka) dijumlahkan; angka yang ditulis menang atas "rata-rata"
  const parts = allMoney(t, 10_000);
  if (parts.length >= 2 && (t.match(NEED_WORD_RE) ?? []).length >= 2) return { monthly_living_cost: parts.reduce((a, b) => a + b, 0) };
  const living = findMoney(t);
  if (living) return { monthly_living_cost: living };
  if (averageOffered && WANTS_AVERAGE.test(t)) return { living_use_average: true };
  return null;
}
