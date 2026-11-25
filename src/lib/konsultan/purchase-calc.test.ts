import { describe, expect, it } from "vitest";
import { analyzePurchase, flatInstallment, type PurchaseInput } from "./purchase-calc";

const basis = (income: number, fixed: number, commitments = 0): NonNullable<PurchaseInput["basis"]> => ({
  incomeMonthly: income,
  fixedMonthly: fixed,
  payday: { first: "2026-12-24", amount: income, frequency: "monthly" },
  otherMonthlyCommitments: commitments,
  others: [],
});
const base: PurchaseInput = { name: "Barang", price: 12_000_000, downPayment: 0, saved: 0, mode: "tunai", months: 0, ratePctYear: 0, targetDate: "2027-05-24", today: "2026-11-24", basis: basis(6_000_000, 4_000_000), inflationPct: 3 };

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
    expect(analyzePurchase({ ...base, basis: null }).verdict).toBe("belum_ada_data");
  });
  it("sudah cukup dana: langsung bisa beli", () => {
    const r = analyzePurchase({ ...base, saved: 12_000_000 });
    expect(r.remainingCash).toBe(0);
    expect(r.buyDate).toBe("2026-11-24");
  });
});

describe("target beli ikut antrean prioritas", () => {
  it("tabungan lain bertenggat lebih dekat didahulukan, jadi target beli bisa tidak sempat", () => {
    const sendiri = analyzePurchase(base);
    expect(sendiri.feasibility.feasible).toBe(true);
    const dengan = analyzePurchase({ ...base, basis: { ...basis(6_000_000, 4_000_000), others: [{ name: "UKT", target: 11_000_000, saved: 0, deadline: "2027-03-24" }] } });
    expect(dengan.feasibility.feasible).toBe(false);
  });
  it("gaji atau biaya hidup belum ada: belum bisa dinilai, tidak ditebak", () => {
    const r = analyzePurchase({ ...base, basis: null });
    expect(r.verdict).toBe("belum_ada_data");
    expect(r.buyDate).toBeNull();
  });
  it("inflasi belum ada: harga masa depan tidak dihitung", () => {
    expect(analyzePurchase({ ...base, inflationPct: null }).priceAtTarget).toBeNull();
  });
});

describe("quickSummary", () => {
  const base: PurchaseInput = { name: "Barang", price: 12_000_000, downPayment: 0, saved: 0, mode: "tunai", months: 12, ratePctYear: 0, targetDate: null, today: "2026-11-24", basis: basis(119_000, 107_000), inflationPct: 3 };
  const fmt = (n: number) => `Rp${n}`;
  it("tidak menulis tanggal beli yang absurd (ratusan tahun)", async () => {
    const { quickSummary } = await import("./purchase-calc");
    const lines = quickSummary(analyzePurchase(base), fmt, (d) => d);
    expect(lines.join(" ")).toMatch(/belum terjangkau/);
    expect(lines.join(" ")).not.toMatch(/2110/);
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});
