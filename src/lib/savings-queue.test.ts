import { describe, it, expect } from "vitest";
import { evaluateSavingsQueue, resolvePlanBasis, type PlanBasisInput } from "./savings-queue";

const empty: PlanBasisInput = {
  today: "2026-11-25",
  payday: null,
  scheduleIncomeMonthly: 0,
  livingMonthlySet: 0,
  billsMonthly: 0,
  debtMonthly: 0,
  avgMonthlyExpense: 0,
  otherFixedMonthly: null,
};

describe("resolvePlanBasis: data kurang = tanya balik", () => {
  it("gaji belum ada: bertanya gaji", () => {
    const r = resolvePlanBasis(empty, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ask).toBe("gaji");
  });
  it("gaji ada tapi tanggal gajian belum: bertanya tanggal", () => {
    const r = resolvePlanBasis(empty, { monthly_income: 5_000_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ask).toBe("tanggal_gajian");
  });
  it("biaya hidup belum ada: menawarkan rata-rata, tidak memutuskan sendiri", () => {
    const r = resolvePlanBasis({ ...empty, avgMonthlyExpense: 2_000_000 }, { monthly_income: 5_000_000, payday_day: 25 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.ask).toBe("biaya_hidup");
      expect(r.question).toContain("2.000.000");
    }
  });
  it("pengguna memilih rata-rata: biaya hidup = rata-rata dikurangi tagihan", () => {
    const r = resolvePlanBasis(
      { ...empty, avgMonthlyExpense: 2_000_000, billsMonthly: 500_000 },
      { monthly_income: 5_000_000, payday_day: 25, living_use_average: true, other_fixed_monthly: 0 }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fixedMonthly).toBe(2_000_000);
      expect(r.livingMonthly).toBe(1_500_000);
      expect(r.newPayday).toBe(true);
      expect(r.payday.first).toBe("2026-11-25");
    }
  });
  it("jadwal gajian dan biaya hidup sudah diatur: tidak bertanya", () => {
    const r = resolvePlanBasis(
      { ...empty, payday: { first: "2026-12-25", amount: 5_000_000, frequency: "monthly" }, scheduleIncomeMonthly: 5_000_000, livingMonthlySet: 2_000_000, debtMonthly: 300_000, otherFixedMonthly: 0 },
      {}
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fixedMonthly).toBe(2_300_000);
  });
});

describe("komitmen rutin pasti (zakat, investasi, asuransi)", () => {
  const ready = { ...empty, payday: { first: "2026-12-25", amount: 5_000_000, frequency: "monthly" as const }, scheduleIncomeMonthly: 5_000_000, livingMonthlySet: 2_000_000 };
  it("belum ditanya (null): bertanya, tidak dianggap nol", () => {
    const r = resolvePlanBasis(ready, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ask).toBe("komitmen_rutin");
  });
  it("dijawab tidak ada (0): lanjut tanpa menambah biaya tetap, dan perlu disimpan", () => {
    const r = resolvePlanBasis(ready, { other_fixed_monthly: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fixedMonthly).toBe(2_000_000);
      expect(r.otherFixedNew).toBe(true);
    }
  });
  it("dijawab Rp600.000: masuk biaya tetap", () => {
    const r = resolvePlanBasis(ready, { other_fixed_monthly: 600_000 });
    expect(r.ok && r.fixedMonthly).toBe(2_600_000);
  });
  it("sudah tersimpan di pengaturan: tidak ditanya lagi dan tidak disimpan ulang", () => {
    const r = resolvePlanBasis({ ...ready, otherFixedMonthly: 400_000 }, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fixedMonthly).toBe(2_400_000);
      expect(r.otherFixedNew).toBe(false);
    }
  });
});

describe("evaluateSavingsQueue", () => {
  const pd = (amount: number) => ({ first: "2026-11-25", amount, frequency: "monthly" as const });
  const base = { today: "2026-11-25", otherMonthlyCommitments: 0 };
  it("sisa besar: layak dan tepat waktu", () => {
    const f = evaluateSavingsQueue({ ...base, newGoal: { name: "Nikah", target: 10_000_000, initial: 0, deadline: "2027-12-25" }, otherGoals: [], incomeMonthly: 5_000_000, fixedMonthly: 2_000_000, payday: pd(5_000_000) });
    expect(f.feasible).toBe(true);
    expect(f.reason).toBe("ok");
  });
  it("sisa Rp15.000: tidak layak dan tanggal penuh null (lebih dari 10 tahun), bukan tahun 2082", () => {
    const f = evaluateSavingsQueue({ ...base, newGoal: { name: "Nikah", target: 10_000_000, initial: 0, deadline: "2027-12-25" }, otherGoals: [], incomeMonthly: 2_015_000, fixedMonthly: 2_000_000, payday: pd(2_015_000) });
    expect(f.feasible).toBe(false);
    expect(f.earliestRealisticDate).toBeNull();
  });
  it("tabungan lain dengan tenggat lebih dekat didahulukan", () => {
    const f = evaluateSavingsQueue({
      ...base,
      newGoal: { name: "Nikah", target: 10_000_000, initial: 0, deadline: "2027-12-25" },
      otherGoals: [{ name: "UKT", target: 36_000_000, saved: 0, deadline: "2027-10-25" }],
      incomeMonthly: 5_000_000,
      fixedMonthly: 2_000_000,
      payday: pd(5_000_000),
    });
    expect(f.feasible).toBe(false);
  });
});
