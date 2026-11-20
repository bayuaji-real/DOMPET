import { describe, it, expect } from "vitest";
import { applyNoDataStatus } from "@/lib/data/analytics";
import type { FinancialHealth } from "@/types/analytics";

const fh = (p: Partial<FinancialHealth>): FinancialHealth => ({
  overallStatus: "kritis",
  savingsRate: 0,
  savingsRateStatus: "kritis",
  emergencyFundBalance: 0,
  emergencyFundMonths: 0,
  emergencyStatus: "kritis",
  goalsOnTrack: true,
  ...p,
});

describe("status kesehatan tanpa data", () => {
  it("tanpa transaksi => belum ada data, bukan kritis", () => {
    const r = applyNoDataStatus({ summary: { totalIncome: 0, totalExpense: 0 }, financialHealth: fh({}) });
    expect(r.financialHealth.overallStatus).toBe("belum");
    expect(r.financialHealth.savingsRateStatus).toBe("belum");
  });
  it("ada transaksi dan dana darurat belum diisi => dinilai dari rasio menabung saja", () => {
    const r = applyNoDataStatus({
      summary: { totalIncome: 1000, totalExpense: 700 },
      financialHealth: fh({ savingsRateStatus: "sehat", emergencyStatus: "belum" }),
    });
    expect(r.financialHealth.overallStatus).toBe("sehat");
  });
  it("ada transaksi dan rasio kritis => tetap kritis", () => {
    const r = applyNoDataStatus({
      summary: { totalIncome: 1000, totalExpense: 990 },
      financialHealth: fh({ savingsRateStatus: "kritis", emergencyStatus: "sehat" }),
    });
    expect(r.financialHealth.overallStatus).toBe("kritis");
  });
  it("campuran sehat dan waspada => waspada", () => {
    const r = applyNoDataStatus({
      summary: { totalIncome: 1000, totalExpense: 850 },
      financialHealth: fh({ savingsRateStatus: "waspada", emergencyStatus: "sehat" }),
    });
    expect(r.financialHealth.overallStatus).toBe("waspada");
  });
});
