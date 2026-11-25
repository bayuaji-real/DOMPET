import { describe, expect, it } from "vitest";
import { CREATIVE_COLUMNS, creativeSummary, parseCreativeExport } from "./marketing-creative";

const makeRow = (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    "LINK KONTEN": "https://www.facebook.com/post/1", "NAMA IKLAN": "Iklan A",
    "IMPRESSION": "100", "SPEND": "20000", "LINK CLICKS": "5", "LEADS": "2",
    "PERIODE MULAI": "2026-11-19", "PERIODE AKHIR": "2026-11-25", ...overrides,
  };
  return CREATIVE_COLUMNS.map((key) => `"${(values[key] ?? "").replaceAll('"', '""')}"`).join(",");
};

describe("ekspor Creative", () => {
  it("menjaga baris iklan yang berbagi konten dan membaca sel berkoma atau baris baru", () => {
    const csv = [CREATIVE_COLUMNS.join(","), makeRow({ "NAMA IKLAN": "Iklan, pertama\nlanjutan" }), makeRow({ "NAMA IKLAN": "Iklan kedua" })].join("\r\n");
    const result = parseCreativeExport(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]["NAMA IKLAN"]).toBe("Iklan, pertama\nlanjutan");
    expect(creativeSummary(result.rows)).toMatchObject({ ads: 2, contents: 1, impressions: 200, spend: 40000, leads: 4, cpl: 10000 });
  });

  it("menolak CSV dengan periode campur", () => {
    const csv = [CREATIVE_COLUMNS.join(","), makeRow(), makeRow({ "PERIODE AKHIR": "2026-11-26" })].join("\n");
    expect(() => parseCreativeExport(csv)).toThrow("Periode CSV");
  });
});
