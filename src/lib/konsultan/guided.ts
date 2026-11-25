// Mesin tanya-jawab untuk fitur berbentuk chat tanpa AI: pertanyaan tetap, jawaban dibaca dengan aturan, hasil dari rumus.
import { parseAmount } from "./purchase-parse";
import { ALLOCATION_RULES, allocate, emergencyFund, pensionPlan, doublingYears, fireNumber, inflationEffect, type Household } from "./teori-keuangan";
import { FUND_TYPES, fundPlan } from "./dana-lain";
import { formatRupiah } from "../utils";

export type Answers = Record<string, number | string>;
export type Step = {
  key: string;
  ask: string;
  kind: "money" | "num" | "choice";
  chips?: string[];
  options?: { label: string; value: string }[];
  /** nilai bawaan kalau pengguna mengetik "lewati" */
  def?: number;
  placeholder?: string;
  hint?: string;
};

const ZERO = /^(0|nol|belum|belum ada|tidak|tidak ada|ga|gak|nggak|enggak|ngga|-)$/i;
const SKIP = /^(lewati|skip|bawaan|default|biasa|standar)$/i;

/** Mengubah ketikan jadi nilai untuk satu pertanyaan. null berarti tidak terbaca. */
export function parseAnswer(step: Step, raw: string): number | string | null {
  const t = raw.trim().toLowerCase().replace(/^rp\.?\s*/, "");
  if (!t) return null;
  if (step.kind === "choice") {
    const opts = step.options ?? [];
    const idx = /^\d+$/.test(t) ? Number(t) - 1 : -1;
    if (idx >= 0 && idx < opts.length) return opts[idx].value;
    const hit = opts.find((o) => o.label.toLowerCase() === t) ?? opts.find((o) => o.label.toLowerCase().includes(t) || t.includes(o.label.toLowerCase()));
    return hit ? hit.value : null;
  }
  if (SKIP.test(t) && step.def !== undefined) return step.def;
  if (step.kind === "money") {
    if (ZERO.test(t)) return 0;
    const n = parseAmount(t);
    return n > 0 ? n : null;
  }
  const m = /^(\d+(?:[.,]\d+)?)\s*(?:%|tahun|thn|th|bulan|bln)?$/.exec(t);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type Flow = { id: string; title: string; subtitle: string; greeting: string; steps: Step[]; compute: (a: Answers) => string; links?: { href: string; text: string }[]; footer: string };

const rp = (n: number) => formatRupiah(Math.round(n));
const num = (a: Answers, k: string) => Number(a[k] ?? 0);
const MONEY_HINT = "Tulis angkanya saja, contoh: 5jt atau 4.500.000";
const NUM_HINT = "Tulis angkanya saja, contoh: 30";
const NOTE = "Ilustrasi dari angka yang kamu isi, bukan jaminan atau rekomendasi produk.";

export const MONEY_PLANNER: Flow = {
  id: "money-planner", title: "Money planner", subtitle: "Bagi pemasukan jadi pos-pos", footer: NOTE,
  greeting: "Berapa pemasukanmu per bulan? Nanti kubagi ke kebutuhan, keinginan, dan tabungan.",
  steps: [
    { key: "income", kind: "money", ask: "Berapa pemasukanmu per bulan?", chips: ["3jt", "5jt", "10jt"], placeholder: "Misal: 8jt", hint: MONEY_HINT },
    { key: "rule", kind: "choice", ask: "Pilih cara membaginya:", options: ALLOCATION_RULES.map((r) => ({ label: r.name, value: r.id })), hint: "Pilih salah satu tombol di atas atau ketik nomornya." },
  ],
  compute: (a) => {
    const rule = ALLOCATION_RULES.find((r) => r.id === a.rule) ?? ALLOCATION_RULES[0];
    const rows = allocate(num(a, "income"), rule);
    return [`**${rule.name}** dari ${rp(num(a, "income"))}:`, ...rows.map((r) => `• ${r.label} (${r.pct}%): **${rp(r.amount)}**`), rule.note].join("\n");
  },
};

const HOUSEHOLD: { label: string; value: Household }[] = [
  { label: "Lajang, penghasilan tetap", value: "lajang" }, { label: "Menikah, belum punya anak", value: "menikah" },
  { label: "Menikah, punya anak", value: "menikah_anak" }, { label: "Penghasilan tidak tetap", value: "freelance" },
];
export const DANA_DARURAT: Flow = {
  id: "dana-daruratku", title: "Dana daruratku", subtitle: "Berapa cadangan yang cukup", footer: NOTE,
  greeting: "Dana darurat menutup pengeluaran saat penghasilan hilang atau ada kejadian mendadak. Berapa pengeluaranmu per bulan?",
  steps: [
    { key: "exp", kind: "money", ask: "Berapa pengeluaranmu per bulan?", chips: ["3jt", "5jt", "8jt"], placeholder: "Misal: 4jt", hint: MONEY_HINT },
    { key: "cur", kind: "money", ask: "Berapa dana darurat yang sudah ada? (ketik 0 kalau belum)", chips: ["0"], placeholder: "Misal: 2jt", hint: MONEY_HINT },
    { key: "kind", kind: "choice", ask: "Kondisimu yang mana?", options: HOUSEHOLD, hint: "Pilih salah satu tombol di atas atau ketik nomornya." },
  ],
  links: [{ href: "/tabungan", text: "Buat target Dana Darurat di Tabungan" }],
  compute: (a) => {
    const e = emergencyFund(num(a, "exp"), (a.kind as Household) ?? "lajang", num(a, "cur"));
    return [
      `Target minimum: **${rp(e.minAmount)}** (${e.minMonths} bulan)`,
      `Target ideal: ${rp(e.maxAmount)} (${e.maxMonths} bulan)`,
      `Sekarang cukup untuk ${String(e.coveredMonths).replace(".", ",")} bulan`,
      e.gapToMin > 0 ? `Kurang ke minimum: **${rp(e.gapToMin)}**` : "Dana daruratmu sudah mencapai minimum.",
      e.gapToMin > 0
        ? `**Langkahnya:** tabung ${rp(Math.ceil(e.gapToMin / 6 / 1000) * 1000)} per bulan selama 6 bulan, atau ${rp(Math.ceil(e.gapToMin / 12 / 1000) * 1000)} per bulan selama 12 bulan, sampai minimum tercapai. Simpan di dompet terpisah supaya tidak terpakai.`
        : e.maxAmount - num(a, "cur") > 0 ? `**Langkahnya:** tambah ${rp(Math.ceil((e.maxAmount - num(a, "cur")) / 12 / 1000) * 1000)} per bulan selama 12 bulan untuk mencapai target ideal.` : "**Langkahnya:** pertahankan, dan tinjau lagi kalau pengeluaranmu naik.",
    ].join("\n");
  },
};

export const DANA_PENSIUN: Flow = {
  id: "dana-pensiunku", title: "Dana pensiunku", subtitle: "Berapa yang perlu disisihkan", footer: NOTE,
  greeting: "Aku hitung kira-kira dana pensiun yang kamu butuhkan. Berapa usiamu sekarang?",
  steps: [
    { key: "age", kind: "num", ask: "Berapa usiamu sekarang?", chips: ["25", "30", "40"], placeholder: "Misal: 30", hint: NUM_HINT },
    { key: "retire", kind: "num", ask: "Mau pensiun di usia berapa?", chips: ["55", "58", "60"], def: 55, placeholder: "Misal: 55", hint: NUM_HINT },
    { key: "exp", kind: "money", ask: "Berapa kebutuhan per bulan saat pensiun, dalam harga hari ini?", chips: ["4jt", "6jt", "10jt"], placeholder: "Misal: 5jt", hint: MONEY_HINT },
    { key: "saved", kind: "money", ask: "Berapa dana pensiun yang sudah kamu siapkan? (0 kalau belum)", chips: ["0"], placeholder: "Misal: 10jt", hint: MONEY_HINT },
  ],
  compute: (a) => {
    const r = pensionPlan({ age: num(a, "age"), retireAge: num(a, "retire"), lifeExpectancy: 80, monthlyExpenseToday: num(a, "exp"), otherPensionMonthlyToday: 0, inflationPct: 4, returnBeforePct: 8, returnAfterPct: 6, currentSavings: num(a, "saved") });
    if (!r.valid) return `${r.error} Ketuk "Hitung lagi" untuk mengulang.`;
    return [
      `Menabung selama ${r.yearsToRetire} tahun, pensiun ${r.yearsInRetirement} tahun.`,
      `Kebutuhan per bulan saat pensiun: ${rp(r.expenseAtRetirementMonthly)}`,
      `Dana yang dibutuhkan saat pensiun: **${rp(r.corpusNeeded)}**`,
      `Kekurangan: ${rp(r.shortfall)}`,
      r.monthlySaving > 0 ? `Perlu disisihkan per bulan: **${rp(r.monthlySaving)}**` : "Dana yang ada sudah cukup.",
      "Asumsi: inflasi 4%, imbal hasil 8% sebelum dan 6% saat pensiun, usia hidup 80 tahun. Imbal hasil tidak dijamin.",
    ].join("\n");
  },
};

export const DANA_LAIN: Flow = {
  id: "dana-lain", title: "Dana lain", subtitle: "Kesehatan, pendidikan, rumah, dan lainnya", footer: NOTE,
  greeting: "Mau menyiapkan dana untuk apa?",
  steps: [
    { key: "type", kind: "choice", ask: "Mau menyiapkan dana untuk apa?", options: FUND_TYPES.map((f) => ({ label: f.name, value: f.id })), hint: "Pilih salah satu tombol di atas atau ketik nomornya." },
    { key: "cost", kind: "money", ask: "Kira-kira berapa biayanya kalau dibayar hari ini?", chips: ["10jt", "50jt", "100jt"], placeholder: "Misal: 50jt", hint: MONEY_HINT },
    { key: "years", kind: "num", def: 0, ask: "Dana itu dibutuhkan berapa tahun lagi? (ketik \"lewati\" untuk angka bawaan)", chips: ["lewati", "2", "5", "10"], placeholder: "Misal: 5", hint: NUM_HINT },
    { key: "saved", kind: "money", ask: "Berapa dana yang sudah terkumpul? (0 kalau belum)", chips: ["0"], placeholder: "Misal: 5jt", hint: MONEY_HINT },
  ],
  links: [{ href: "/tabungan", text: "Simpan jadi target Tabungan" }],
  compute: (a) => {
    const t = FUND_TYPES.find((f) => f.id === a.type) ?? FUND_TYPES[0];
    const years = Number(a.years) > 0 ? Number(a.years) : t.years;
    const r = fundPlan({ costNow: num(a, "cost"), years, inflationPct: t.inflation, returnPct: t.returnPct, saved: num(a, "saved") });
    if (!r.valid) return "Biaya dan waktunya perlu diisi dengan benar. Ketuk \"Hitung lagi\" untuk mengulang.";
    return [
      `**${t.name}** dalam ${String(years).replace(".", ",")} tahun:`,
      `Perkiraan biaya nanti: ${rp(r.futureCost)}`,
      `Dana yang ada, nilai nanti: ${rp(r.savedFuture)}`,
      `Masih kurang: ${rp(r.gap)}`,
      r.monthlySaving > 0 ? `Sisihkan per bulan: **${rp(r.monthlySaving)}**` : "Dana yang ada sudah cukup.",
      `Asumsi: biaya naik ${t.inflation}% dan imbal hasil ${t.returnPct}% per tahun.`,
      ...t.tips.slice(0, 2).map((x) => `• ${x}`),
    ].join("\n");
  },
};

export const FINANCIAL_FREEDOM: Flow = {
  id: "financial-freedom", title: "Financial Freedom", subtitle: "Berapa dana untuk bebas finansial", footer: NOTE,
  greeting: "Aku hitung dana yang dibutuhkan supaya hidup dari hasil investasi. Berapa pengeluaranmu per bulan?",
  steps: [
    { key: "exp", kind: "money", ask: "Berapa pengeluaranmu per bulan?", chips: ["5jt", "8jt", "15jt"], placeholder: "Misal: 8jt", hint: MONEY_HINT },
    { key: "rate", kind: "num", ask: "Perkiraan imbal hasil investasi per tahun (%)? Ketik \"lewati\" untuk 8.", chips: ["lewati", "6", "10"], def: 8, placeholder: "Misal: 8", hint: NUM_HINT },
  ],
  compute: (a) => {
    const exp = num(a, "exp"), rate = num(a, "rate") || 8;
    const d = doublingYears(rate);
    const ie = inflationEffect(exp, 4, 10);
    return [
      `Dana yang dibutuhkan (aturan 4%): **${rp(fireNumber(exp, 4))}**`,
      d !== null ? `Aturan 72: uang berlipat dua sekitar ${d.toFixed(1).replace(".", ",")} tahun pada ${String(rate).replace(".", ",")}% per tahun.` : "",
      `Efek inflasi 4%: pengeluaran ${rp(exp)} sekarang jadi sekitar ${rp(ie.futureCost)} per bulan dalam 10 tahun.`,
      "Aturan 4% hanya patokan awal. Imbal hasil tidak dijamin.",
    ].filter(Boolean).join("\n");
  },
};
