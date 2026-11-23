import { describe, it, expect } from "vitest";
import { computeFeasibility, addMonths, monthsBetween } from "./savings-feasibility";

const base = {
  initialAmount: 0,
  today: "2026-11-23",
  avgMonthlyIncome: 5_000_000,
  avgMonthlyExpense: 3_000_000,
  otherMonthlyCommitments: 500_000,
};

describe("computeFeasibility", () => {
  it("layak: butuh per bulan lebih kecil dari sisa uang", () => {
    const r = computeFeasibility({ ...base, targetAmount: 6_000_000, deadline: "2027-05-23" });
    expect(r.monthsLeft).toBe(6);
    expect(r.monthlyNeeded).toBe(1_000_000);
    expect(r.freeMonthly).toBe(1_500_000);
    expect(r.leftoverAfter).toBe(500_000);
    expect(r.feasible).toBe(true);
    expect(r.reason).toBe("ok");
  });

  it("tidak layak: kurang per bulan dan menyarankan tanggal paling cepat", () => {
    const r = computeFeasibility({ ...base, targetAmount: 12_000_000, deadline: "2027-05-23" });
    expect(r.monthlyNeeded).toBe(2_000_000);
    expect(r.feasible).toBe(false);
    expect(r.shortfallMonthly).toBe(500_000);
    expect(r.reason).toBe("kurang_per_bulan");
    expect(r.monthsAtFreeRate).toBe(8);
    expect(r.earliestRealisticDate).toBe("2027-07-23");
  });

  it("tidak ada sisa uang sama sekali", () => {
    const r = computeFeasibility({ ...base, avgMonthlyExpense: 4_700_000, targetAmount: 1_000_000, deadline: "2027-01-23" });
    expect(r.feasible).toBe(false);
    expect(r.reason).toBe("tidak_ada_sisa");
    expect(r.earliestRealisticDate).toBeNull();
  });

  it("uang awal mengurangi sisa target dan sudah tercapai bila cukup", () => {
    const r = computeFeasibility({ ...base, initialAmount: 2_000_000, targetAmount: 2_000_000, deadline: null });
    expect(r.reason).toBe("sudah_tercapai");
    expect(r.feasible).toBe(true);
  });

  it("tenggat sudah lewat ditolak", () => {
    const r = computeFeasibility({ ...base, targetAmount: 1_000_000, deadline: "2026-11-01" });
    expect(r.feasible).toBe(false);
    expect(r.reason).toBe("tenggat_lewat");
  });

  it("tanpa tenggat: layak kalau ada sisa", () => {
    const r = computeFeasibility({ ...base, targetAmount: 3_000_000, deadline: null });
    expect(r.feasible).toBe(true);
    expect(r.monthlyNeeded).toBeNull();
    expect(r.monthsAtFreeRate).toBe(2);
  });

  it("pembulatan ke atas kelipatan 10.000", () => {
    const r = computeFeasibility({ ...base, targetAmount: 1_000_000, deadline: "2027-02-23" });
    expect(r.monthsLeft).toBe(3);
    expect(r.monthlyNeeded).toBe(340_000);
  });
});

describe("tanggal", () => {
  it("addMonths menjaga akhir bulan", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-23", 3)).toBe("2027-02-23");
  });
  it("monthsBetween hitung bulan penuh", () => {
    expect(monthsBetween("2026-11-23", "2027-05-22")).toBe(5);
    expect(monthsBetween("2026-11-23", "2027-05-23")).toBe(6);
  });
});
