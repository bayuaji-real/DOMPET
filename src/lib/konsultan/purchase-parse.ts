// Membaca kalimat bebas jadi data Target Beli. Murni angka dan teks, tanpa AI, jadi gratis dan bisa dites.
export type ParsedPurchase = {
  name?: string; price?: number; mode?: "tunai" | "cicilan"; downPayment?: number; months?: number;
  ratePct?: number; saved?: number; targetMonths?: number;
};

const UNIT: Record<string, number> = { jt: 1e6, juta: 1e6, rb: 1e3, ribu: 1e3, k: 1e3, m: 1e9, miliar: 1e9 };
const AMOUNT = "(\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(jt|juta|rb|ribu|k|miliar|m)?(?![a-z0-9])";

/** "12jt", "2,5 juta", "500rb", "12.000.000" jadi angka rupiah. */
export function parseAmount(raw: string): number {
  const m = new RegExp("^\\s*" + AMOUNT + "\\s*$", "i").exec(raw.toLowerCase());
  if (!m) return 0;
  const unit = m[2] ? UNIT[m[2]] : 1;
  const num = unit === 1 && /^\d{1,3}(\.\d{3})+$/.test(m[1]) ? Number(m[1].replace(/\./g, "")) : Number(m[1].replace(",", "."));
  return Number.isFinite(num) ? Math.round(num * unit) : 0;
}

const STOP = /\b(aku|saya|mau|ingin|pengen|pingin|beli|membeli|harga|harganya|seharga|sekitar|kira-kira|untuk|dengan|secara|tunai|cash|cicilan|cicil|kredit|tenor|dp|uang muka|bunga|terkumpul|tabungan|sudah|punya|ada|dalam|target|lagi|rp|rupiah|yang|dan|di|ke|a|sebuah)\b/g;

export function parsePurchase(input: string): ParsedPurchase {
  let t = " " + input.toLowerCase().replace(/\s+/g, " ").trim() + " ";
  const out: ParsedPurchase = {};
  const take = (re: RegExp): RegExpExecArray | null => { const m = re.exec(t); if (m) t = t.replace(m[0], " "); return m; };

  const tgt = take(/(\d+)\s*(bulan|bln|tahun|thn)\s*lagi/);
  if (tgt) out.targetMonths = Number(tgt[1]) * (/^t/.test(tgt[2]) ? 12 : 1);
  const dp = take(new RegExp("(?:dp|uang muka)\\s*(?:rp\\.?\\s*)?" + AMOUNT));
  if (dp) out.downPayment = parseAmount(dp[1] + (dp[2] ?? ""));
  const sv = take(new RegExp("(?:terkumpul|sudah ada|sudah punya|punya|tabungan(?: saya)?)\\s*(?:rp\\.?\\s*)?" + AMOUNT));
  if (sv) out.saved = parseAmount(sv[1] + (sv[2] ?? ""));
  const rt = take(/bunga\s*(\d+(?:[.,]\d+)?)\s*%?/);
  if (rt) out.ratePct = Number(rt[1].replace(",", "."));
  const cic = /\b(cicil\w*|kredit|tenor)\b/.test(t);
  const tun = /\b(tunai|cash|lunas)\b/.test(t);
  if (cic) out.mode = "cicilan"; else if (tun) out.mode = "tunai";
  const mo = take(/(\d+)\s*(bulan|bln|tahun|thn|x)\b/);
  if (mo && cic) out.months = Number(mo[1]) * (/^t/.test(mo[2]) ? 12 : 1);

  const am = new RegExp(AMOUNT, "gi");
  let m: RegExpExecArray | null;
  while ((m = am.exec(t))) {
    const v = parseAmount(m[1] + (m[2] ?? ""));
    if (v >= 1000 && out.price === undefined) { out.price = v; t = t.replace(m[0], " "); break; }
  }
  const name = t.replace(STOP, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim();
  if (name) out.name = (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, 60);
  return out;
}
