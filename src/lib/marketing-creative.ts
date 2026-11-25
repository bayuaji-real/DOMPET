export const CREATIVE_COLUMNS = [
  "ADVERTISER", "PRODUK", "LINK KONTEN", "TIPE IKLAN", "KETERANGAN", "STATUS",
  "FORMAT KONTEN", "CREATOR", "EDITOR", "IMPRESSION", "AVERAGE PLAY TIME",
  "THRUPLAYS", "SPEND", "LINK CLICKS", "LEADS", "NAMA IKLAN", "CAMPAIGN",
  "REACH", "3S VIEWS", "CTR %", "CPM", "HOOK RATE %", "HOLD RATE %",
  "CPL", "PERIODE MULAI", "PERIODE AKHIR",
] as const;

export type CreativeRow = Record<(typeof CREATIVE_COLUMNS)[number], string>;
export type CreativeSnapshot = {
  period_start: string;
  period_end: string;
  row_count: number;
  imported_at: string;
  rows: CreativeRow[];
};

// CSV RFC 4180: mendukung koma, baris baru, dan tanda kutip di dalam sel.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("CSV memiliki tanda kutip yang belum ditutup.");
  if (row.length || cell) { row.push(cell); rows.push(row); }
  return rows;
}

export function parseCreativeExport(input: string) {
  const [header, ...data] = parseCsv(input);
  if (!header || header.length !== CREATIVE_COLUMNS.length ||
      CREATIVE_COLUMNS.some((name, i) => header[i] !== name)) {
    throw new Error("Kolom CSV tidak cocok dengan ekspor Creative Marketing Suite.");
  }
  if (!data.length || data.length > 10000) throw new Error("CSV harus berisi 1–10.000 iklan.");
  if (data.some((row) => row.length !== header.length)) throw new Error("Ada baris CSV dengan jumlah kolom yang salah.");
  const rows = data.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i]])) as CreativeRow);
  const period_start = rows[0]["PERIODE MULAI"], period_end = rows[0]["PERIODE AKHIR"];
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  if (!validDate(period_start) || !validDate(period_end) || period_start > period_end ||
      rows.some((row) => row["PERIODE MULAI"] !== period_start || row["PERIODE AKHIR"] !== period_end)) {
    throw new Error("Periode CSV tidak valid atau tidak sama pada semua baris.");
  }
  return { period_start, period_end, rows };
}

export function creativeSummary(rows: CreativeRow[]) {
  const number = (value: string) => Number(value) || 0;
  const sum = (key: keyof CreativeRow) => rows.reduce((total, row) => total + number(row[key]), 0);
  const impressions = sum("IMPRESSION"), spend = sum("SPEND"), clicks = sum("LINK CLICKS"), leads = sum("LEADS");
  const contents = new Set(rows.map((row, i) => row["LINK KONTEN"] || `tanpa-link-${i}`));
  return { ads: rows.length, contents: contents.size, impressions, spend, clicks, leads,
    ctr: impressions ? clicks / impressions * 100 : 0, cpl: leads ? spend / leads : null };
}
