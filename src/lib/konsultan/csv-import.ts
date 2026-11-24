export interface ParsedRow { date: string; description: string; amount: number; type: "income" | "expense" }
/** Pecah satu baris CSV dengan dukungan tanda kutip. Pemisah otomatis , atau ; */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { out.push(cur.trim()); cur = ""; } else cur += c;
  }
  out.push(cur.trim());
  return out;
}
/** Angka gaya Indonesia (1.234.567,89) atau Inggris (1,234,567.89). Mengembalikan null jika bukan angka. */
export function parseMoney(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  const dec = Math.max(lastDot, lastComma);
  if (dec >= 0 && s.length - dec - 1 <= 2 && (s.match(/[.,]/g) ?? []).length >= 1 && s.length - dec - 1 !== 3) {
    s = s.slice(0, dec).replace(/[.,]/g, "") + "." + s.slice(dec + 1);
  } else s = s.replace(/[.,]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}
export function parseDate(raw: string): string | null {
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
/** Baca CSV mutasi. Mengenali kolom tanggal, keterangan, nominal (satu kolom bertanda +/- atau kolom debit/kredit terpisah). */
export function parseStatementCsv(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0 };
  const sep = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ";" : ",";
  const head = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase());
  const find = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const iDate = find("tanggal", "date", "tgl");
  const iDesc = find("keterangan", "deskripsi", "description", "uraian", "berita");
  const iAmt = find("jumlah", "nominal", "amount", "mutasi");
  const iDeb = find("debit", "keluar"), iCre = find("kredit", "credit", "masuk");
  const rows: ParsedRow[] = []; let skipped = 0;
  if (iDate < 0 || (iAmt < 0 && iDeb < 0 && iCre < 0)) return { rows, skipped: lines.length - 1 };
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line, sep);
    const date = parseDate(c[iDate] ?? "");
    let amount: number | null = null; let type: "income" | "expense" = "expense";
    if (iAmt >= 0) {
      const raw = c[iAmt] ?? ""; const v = parseMoney(raw);
      if (v != null) { amount = Math.abs(v); type = v < 0 || /\bDB\b|debit/i.test(raw) ? "expense" : "income"; }
    } else {
      const d = iDeb >= 0 ? parseMoney(c[iDeb] ?? "") : null, k = iCre >= 0 ? parseMoney(c[iCre] ?? "") : null;
      if (d && d > 0) { amount = d; type = "expense"; } else if (k && k > 0) { amount = k; type = "income"; }
    }
    if (!date || !amount || amount <= 0) { skipped++; continue; }
    rows.push({ date, description: (c[iDesc] ?? "").slice(0, 120), amount: Math.round(amount), type });
  }
  return { rows, skipped };
}
/** Tebak kategori dari riwayat: kata kunci keterangan -> kategori yang paling sering dipakai pengguna. */
export function suggestCategory(description: string, history: { text: string; categoryId: string }[]): string | null {
  const words = description.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  if (words.length === 0) return null;
  const score = new Map<string, number>();
  for (const h of history) {
    const t = h.text.toLowerCase();
    for (const w of words) if (t.includes(w)) score.set(h.categoryId, (score.get(h.categoryId) ?? 0) + 1);
  }
  const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** Rapikan baris hasil AI: buang yang tidak masuk akal, batasi jumlahnya. AI bisa salah, jadi semua dicek ulang di sini. */
export function sanitizeAiRows(raw: unknown, max = 300): ParsedRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedRow[] = [];
  for (const r of raw) {
    if (out.length >= max) break;
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const date = typeof o.date === "string" ? parseDate(o.date) : null;
    const amount = typeof o.amount === "number" ? Math.round(Math.abs(o.amount)) : typeof o.amount === "string" ? Math.round(Math.abs(parseMoney(o.amount) ?? 0)) : 0;
    const type = o.type === "income" ? "income" : o.type === "expense" ? "expense" : null;
    if (!date || !type || amount <= 0 || amount > 100_000_000_000) continue;
    out.push({ date, description: String(o.description ?? "").slice(0, 120), amount, type });
  }
  return out;
}
