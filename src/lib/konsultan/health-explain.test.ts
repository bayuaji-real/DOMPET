import { describe, it, expect } from "vitest";
import { healthScore, explainHealth } from "./health-score";

describe("explainHealth (penjelasan tanpa AI)", () => {
  it("menyebut bagian terlemah dengan selisih rupiah", () => {
    const i = { monthlyIncome: 5_000_000, monthlyExpense: 4_800_000, liquidSavings: 2_000_000, monthlyDebtPayment: 2_000_000 };
    const t = explainHealth(i, healthScore(i));
    expect(t).toMatch(/Skormu \d+ dari 100/);
    expect(t).toMatch(/Yang paling berpengaruh/);
    expect(t).toMatch(/masih kurang Rp/);
    expect(t).toMatch(/Cicilan Rp\s?2\.000\.000/);
  });
  it("semua sehat: tanpa daftar kekurangan", () => {
    const i = { monthlyIncome: 10_000_000, monthlyExpense: 3_000_000, liquidSavings: 30_000_000, monthlyDebtPayment: 0 };
    const t = explainHealth(i, healthScore(i));
    expect(t).toMatch(/Semua bagian sudah baik/);
    expect(t).not.toMatch(/Yang paling berpengaruh/);
  });
  it("angka sama menghasilkan teks sama, dan pengeluaran melebihi pemasukan disebut", () => {
    const i = { monthlyIncome: 5_000_000, monthlyExpense: 6_000_000, liquidSavings: 0, monthlyDebtPayment: 0 };
    expect(explainHealth(i, healthScore(i))).toBe(explainHealth(i, healthScore(i)));
    expect(explainHealth(i, healthScore(i))).toMatch(/melebihi pemasukan/);
  });
});
