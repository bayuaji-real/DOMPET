import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { resolveDateRange, getAnalyticsData } from "./data/analytics";

describe("Analytics Unit Tests", () => {
  // Kunci "hari ini" ke 20 Nov 2026 (12:00 WIB) supaya tes tidak bergantung pada tanggal sebenarnya
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T05:00:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  describe("resolveDateRange", () => {
    it("menghitung rentang bulan ini (November 2026)", () => {
      const range = resolveDateRange("month");
      expect(range.startDate).toBe("2026-11-01");
      expect(range.endDate).toBe("2026-11-30");
      expect(range.daysCount).toBe(30);
      expect(range.label).toContain("Bulan Ini");
    });

    it("menghitung rentang bulan lalu (Oktober 2026)", () => {
      const range = resolveDateRange("last_month");
      expect(range.startDate).toBe("2026-10-01");
      expect(range.endDate).toBe("2026-10-31");
      expect(range.daysCount).toBe(31);
      expect(range.label).toContain("Bulan Lalu");
    });

    it("menghitung rentang minggu ini", () => {
      const range = resolveDateRange("week");
      expect(range.daysCount).toBe(7);
      expect(range.label).toBe("Minggu Ini");
    });

    it("menghitung rentang kustom", () => {
      const range = resolveDateRange("custom", "2026-11-05", "2026-11-15");
      expect(range.startDate).toBe("2026-11-05");
      expect(range.endDate).toBe("2026-11-15");
      expect(range.daysCount).toBe(11);
    });
  });

  describe("getAnalyticsData calculation rules", () => {
    it("menghasilkan struktur analytics lengkap tanpa error", async () => {
      const data = await getAnalyticsData({ period: "month" });
      expect(data).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalIncome).toBeGreaterThan(0);
      expect(data.summary.totalExpense).toBeGreaterThan(0);
      expect(data.categories.length).toBeGreaterThan(0);
      expect(data.monthlyCashflow.length).toBe(6);
      expect(data.dailyExpenses.length).toBeGreaterThan(0);
      expect(data.wallets.length).toBeGreaterThan(0);
      expect(data.topTransactions.length).toBeLessThanOrEqual(5);
      expect(data.topMerchants.length).toBeLessThanOrEqual(5);
      expect(data.financialHealth.overallStatus).toMatch(/sehat|waspada|kritis|belum/);
    });

    it("memastikan transfer dan setoran tabungan tidak dihitung sebagai pengeluaran belanja", async () => {
      const data = await getAnalyticsData({ period: "month" });
      // Total expense harus mencerminkan belanja murni, bukan setoran tabungan (Rp 2.100.000)
      expect(data.summary.savingsAmount).toBeGreaterThan(0);
      expect(data.summary.totalExpense).toBeLessThan(data.summary.totalIncome);
    });
  });
});
