import { describe, expect, it } from "vitest";
import { analyzePurchase, flatInstallment, type PurchaseInput } from "./purchase-calc";

const base: PurchaseInput = { price: 12_000_000, downPayment: 0, saved: 0, mode: "tunai", months: 0, ratePctYear: 0, targetDate: "2027-05-24", today: "2026-11-24", income: 6_000_000, expense: 3_500_000, commitments: 500_000, inflationPct: 3 };

describe("target beli", () => {
  it("cicilan bunga flat dihitung benar", () => {
    expect(flatInstallment(10_000_000, 12, 12)).toEqual({ monthly: Math.ceil(11_200_000 / 12), interest: 1_200_000 });
    expect(flatInstallment(0, 10, 12)).toEqual({ monthly: 0, interest: 0 });
  });
  it("tunai dengan tenggat 6 bulan: perlu 2 juta per bulan, sisa 2 juta, aman atau pas", () => {
    const r = analyzePurchase(base);
    expect(r.feasibility.monthlyNeeded).toBe(2_000_000);
    expect(r.feasibility.feasible).toBe(true);
    expect(["aman", "pas"]).toContain(r.verdict);
    expect(r.priceAtTarget).toBeGreaterThan(12_000_000);
  });
  it("tunai dengan tenggat terlalu dekat dinilai berat", () => {
    const r = analyzePurchase({ ...base, price: 30_000_000, targetDate: "2027-01-24" });
    expect(r.verdict).toBe("berat");
    expect(r.feasibility.shortfallMonthly).toBeGreaterThan(0);
  });
  it("tanpa tenggat: menghitung berapa bulan sampai terbeli dari sisa uang bulanan", () => {
    const r = analyzePurchase({ ...base, targetDate: null });
    expect(r.monthsToBuy).toBe(6); // sisa 2 juta per bulan, harga 12 juta
    expect(r.buyDate).toBe("2027-05-24");
  });
  it("cicilan: DP, cicilan per bulan, porsi dari pemasukan", () => {
    const r = analyzePurchase({ ...base, price: 20_000_000, downPayment: 4_000_000, mode: "cicilan", months: 12, ratePctYear: 10, targetDate: "2027-05-24" });
    expect(r.cashNeeded).toBe(4_000_000);
    expect(r.installment).toBe(Math.ceil((16_000_000 * 1.1) / 12));
    expect(r.totalInterest).toBe(1_600_000);
    expect(r.installmentPctIncome).toBeGreaterThan(20);
  });
  it("cicilan lebih dari 30 persen pemasukan dinilai berat", () => {
    const r = analyzePurchase({ ...base, price: 40_000_000, downPayment: 0, mode: "cicilan", months: 12, ratePctYear: 8, targetDate: null });
    expect(r.installmentPctIncome).toBeGreaterThan(30);
    expect(r.verdict).toBe("berat");
  });
  it("tanpa pemasukan: belum bisa dinilai", () => {
    expect(analyzePurchase({ ...base, income: 0 }).verdict).toBe("belum_ada_data");
  });
  it("sudah cukup dana: langsung bisa beli", () => {
    const r = analyzePurchase({ ...base, saved: 12_000_000 });
    expect(r.remainingCash).toBe(0);
    expect(r.buyDate).toBe("2026-11-24");
  });
});
