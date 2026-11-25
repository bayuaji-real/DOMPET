import { describe, it, expect } from "vitest";
import { healthScore, unifyHealth } from "@/lib/konsultan/health-score";
import type { FinancialHealth } from "@/types/analytics";

const base: FinancialHealth = { overallStatus: "kritis", savingsRate: 0, savingsRateStatus: "kritis", emergencyFundBalance: 0, emergencyFundMonths: 0, emergencyStatus: "kritis", goalsOnTrack: true };
const snap = { hasData: true, monthlyIncome: 357_000, monthlyExpense: 324_000, freeCash: 102_000, liquidSavings: 2_900_000, emergencyFund: 102_000, hasEmergencyGoal: true };

describe("satu rumus kesehatan", () => {
  it("status Analisis mengikuti skor Kesehatan Finansial", () => {
    const score = healthScore({ monthlyIncome: snap.monthlyIncome, monthlyExpense: snap.monthlyExpense, liquidSavings: snap.emergencyFund, monthlyDebtPayment: 0 });
    const u = unifyHealth(base, snap, 0);
    expect(u.overallStatus).toBe(score.level === "sehat" ? "sehat" : score.level === "cukup" ? "waspada" : "kritis");
    expect(u.emergencyFundBalance).toBe(102_000);
    expect(u.emergencyFundMonths).toBe(0.3);
  });
  it("tanpa data, nilai asal dipertahankan", () => {
    expect(unifyHealth(base, { ...snap, hasData: false }, 0)).toEqual(base);
    expect(unifyHealth(base, null, 0)).toEqual(base);
  });
  it("dana darurat dihitung dari tabungan dana darurat milik pengguna", () => {
    expect(unifyHealth(base, { ...snap, emergencyFund: 2_000_000, monthlyExpense: 500_000 }, 0).emergencyFundMonths).toBe(4);
  });
  it("saldo dompet biasa tidak dianggap dana darurat bila pengguna belum membuatnya", () => {
    const u = unifyHealth(base, { ...snap, freeCash: 8_000_000, emergencyFund: 0, hasEmergencyGoal: false, monthlyExpense: 500_000 }, 0);
    expect(u.emergencyFundBalance).toBe(0);
    expect(u.emergencyFundMonths).toBe(0);
  });
});
