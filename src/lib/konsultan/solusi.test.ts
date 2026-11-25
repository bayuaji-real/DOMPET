import { describe, it, expect } from "vitest";
import { explainHealthParts, healthScore } from "./health-score";
import { analyzePurchase, quickSummary } from "./purchase-calc";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const fmt = (d: string) => d;

describe("solusi yang bisa dijalankan", () => {
  it("bagian skor yang belum penuh punya langkah dengan angka, yang penuh tidak", () => {
    const i = { monthlyIncome: 6_000_000, monthlyExpense: 2_000_000, liquidSavings: 8_000_000, monthlyDebtPayment: 0 };
    const e = explainHealthParts(i, healthScore(i));
    expect(e.items.find((x) => x.key === "darurat")?.action).toMatch(/Rp\s?4\.000\.000/);
    expect(e.items.find((x) => x.key === "tabung")?.action).toBeNull();
  });
  it("arus kas negatif: langkah menyebut selisih yang harus dikurangi", () => {
    const i = { monthlyIncome: 3_000_000, monthlyExpense: 4_000_000, liquidSavings: 0, monthlyDebtPayment: 0 };
    expect(explainHealthParts(i, healthScore(i)).items.find((x) => x.key === "arus")?.action).toMatch(/Rp\s?1\.000\.000/);
  });
  it("Target Beli tanpa tenggat: ada pilihan menabung per bulan yang muat", () => {
    const basis = { incomeMonthly: 6_000_000, fixedMonthly: 400_000, payday: { first: "2026-11-25", amount: 6_000_000, frequency: "monthly" as const }, otherMonthlyCommitments: 0, others: [] };
    const r = analyzePurchase({ name: "Laptop", price: 12_000_000, downPayment: 0, saved: 0, mode: "tunai", months: 12, ratePctYear: 0, targetDate: null, today: "2026-11-25", basis, inflationPct: null });
    const lines = quickSummary(r, rp, fmt).join(" ");
    expect(lines).toMatch(/Pilihan menabung/);
    expect(lines).toMatch(/3 bulan = /);
  });
});
