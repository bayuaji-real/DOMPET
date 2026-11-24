import { describe, it, expect } from "vitest";
import { ALLOCATION_RULES, allocate, emergencyFund, pensionPlan, doublingYears, rateToDouble, fireNumber, inflationEffect, type PensionInput } from "./teori-keuangan";
import { apiAlert } from "../admin-alert";

const base: PensionInput = { age: 30, retireAge: 55, lifeExpectancy: 80, monthlyExpenseToday: 5_000_000, otherPensionMonthlyToday: 0, inflationPct: 4, returnBeforePct: 8, returnAfterPct: 6, currentSavings: 0 };

describe("alokasi", () => {
  it("semua aturan berjumlah 100 persen", () => { for (const r of ALLOCATION_RULES) expect(r.parts.reduce((s, p) => s + p.pct, 0)).toBe(100); });
  it("50/30/20 dari 10 juta", () => {
    const a = allocate(10_000_000, ALLOCATION_RULES[0]);
    expect(a.map((x) => x.amount)).toEqual([5_000_000, 3_000_000, 2_000_000]);
  });
  it("total hasil selalu sama dengan pendapatan (pembulatan)", () => {
    for (const r of ALLOCATION_RULES) expect(allocate(1_234_567, r).reduce((s, x) => s + x.amount, 0)).toBe(1_234_567);
  });
  it("pendapatan negatif jadi nol", () => { expect(allocate(-5, ALLOCATION_RULES[0]).every((x) => x.amount === 0)).toBe(true); });
});
describe("dana darurat", () => {
  it("lajang 3-6 bulan dan selisih ke minimum", () => {
    const e = emergencyFund(4_000_000, "lajang", 5_000_000);
    expect(e.minAmount).toBe(12_000_000); expect(e.maxAmount).toBe(24_000_000); expect(e.gapToMin).toBe(7_000_000); expect(e.coveredMonths).toBe(1.3);
  });
  it("sudah cukup: selisih 0", () => { expect(emergencyFund(1_000_000, "menikah", 9_000_000).gapToMin).toBe(0); });
  it("keluarga dengan anak lebih tinggi", () => { expect(emergencyFund(1, "menikah_anak").minMonths).toBe(9); });
});
describe("dana pensiun", () => {
  it("tanpa inflasi dan imbal hasil nol: korpus = kebutuhan x bulan pensiun", () => {
    const r = pensionPlan({ ...base, inflationPct: 0, returnBeforePct: 0, returnAfterPct: 0 });
    expect(r.corpusNeeded).toBeCloseTo(5_000_000 * 12 * 25, 0);
    expect(r.monthlySaving).toBe(Math.ceil((5_000_000 * 12 * 25) / (25 * 12)));
  });
  it("inflasi menaikkan kebutuhan dan korpus", () => {
    const r = pensionPlan(base);
    expect(r.expenseAtRetirementMonthly).toBeCloseTo(5_000_000 * Math.pow(1.04, 25), 0);
    expect(r.corpusNeeded).toBeGreaterThan(5_000_000 * 12 * 25);
    expect(r.monthlySaving).toBeGreaterThan(0);
  });
  it("tabungan besar menutup kebutuhan", () => { expect(pensionPlan({ ...base, currentSavings: 50_000_000_000 }).monthlySaving).toBe(0); });
  it("pensiun lain mengurangi kebutuhan", () => { expect(pensionPlan({ ...base, otherPensionMonthlyToday: 2_000_000 }).corpusNeeded).toBeLessThan(pensionPlan(base).corpusNeeded); });
  it("imbal hasil setelah pensiun sama dengan inflasi tidak membagi nol", () => { expect(Number.isFinite(pensionPlan({ ...base, returnAfterPct: 4 }).corpusNeeded)).toBe(true); });
  it("input tidak valid ditolak", () => {
    expect(pensionPlan({ ...base, retireAge: 30 }).valid).toBe(false);
    expect(pensionPlan({ ...base, lifeExpectancy: 50 }).valid).toBe(false);
    expect(pensionPlan({ ...base, monthlyExpenseToday: 0 }).valid).toBe(false);
  });
  it("menabung lebih lama menurunkan setoran bulanan", () => { expect(pensionPlan({ ...base, age: 25 }).monthlySaving).toBeLessThan(pensionPlan(base).monthlySaving); });
});
describe("aturan lain", () => {
  it("aturan 72", () => { expect(doublingYears(8)).toBe(9); expect(doublingYears(0)).toBeNull(); expect(rateToDouble(12)).toBe(6); });
  it("angka FIRE 4% = 25x pengeluaran tahunan", () => { expect(fireNumber(5_000_000)).toBe(1_500_000_000); expect(fireNumber(5_000_000, 0)).toBe(0); });
  it("inflasi", () => { const r = inflationEffect(1_000_000, 5, 10); expect(Math.round(r.futureCost)).toBe(1_628_895); expect(Math.round(r.powerLeft)).toBe(613_913); });
});
describe("peringatan API", () => {
  const f = (n: number) => `Rp${n}`;
  const mk = (level: "belum_diatur" | "aman" | "waspada" | "kritis" | "habis", used_pct: number | null, days_left: number | null = null) => ({ configured: level !== "belum_diatur", level, used_pct, days_left, remaining_idr: 100 });
  it("setiap tingkat punya nada yang benar", () => {
    expect(apiAlert(mk("belum_diatur", null), f).tone).toBe("info");
    expect(apiAlert(mk("aman", 20), f).tone).toBe("ok");
    expect(apiAlert(mk("waspada", 75, 6), f).tone).toBe("warn");
    expect(apiAlert(mk("waspada", 75, 6), f).body).toContain("6 hari");
    expect(apiAlert(mk("kritis", 95), f).tone).toBe("bad");
    expect(apiAlert(mk("habis", 120), f).title).toMatch(/habis/);
  });
});
