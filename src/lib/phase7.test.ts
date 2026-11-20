import { describe, it, expect } from "vitest";
import {
  SAMPLE_PAYDAY_SCHEDULES,
  getTodayPaydaySchedule,
  processPaydayAllocation,
} from "./data/payday";
import {
  SAMPLE_RECURRING,
  getDueRecurringTransactions,
  processRecurringTransaction,
} from "./data/recurring";
import { getBudgets, setBudget } from "./data/budgets";
import {
  generateTransactionsCSV,
  generateBackupJSON,
} from "./export";

describe("Phase 7: Advanced Financial Features", () => {
  describe("A. Mode Gajian (Payday Mode)", () => {
    it("mendeteksi jadwal gajian hari ini dengan tanggal simulasi 2026-11-20", async () => {
      const schedule = await getTodayPaydaySchedule("2026-11-20");
      expect(schedule).toBeDefined();
      expect(schedule?.date).toBe("2026-11-20");
      expect(schedule?.expected_amount).toBe(8500000);
    });

    it("menghitung pembagian gaji: biaya hidup + tabungan + sisa bebas", async () => {
      const actualSalary = 8500000;
      const livingCost = 400000;
      const allocations = [
        { goalId: "g-1", goalName: "Dana Darurat", amount: 1500000 },
        { goalId: "g-2", goalName: "Target Lamaran", amount: 500000 },
      ];
      const totalSavings = allocations.reduce((s, a) => s + a.amount, 0);
      const freeAmount = actualSalary - livingCost - totalSavings;

      expect(totalSavings).toBe(2000000);
      expect(freeAmount).toBe(6100000);

      // Eksekusi processPaydayAllocation
      const res = await processPaydayAllocation({
        scheduleId: "pd-sample-1",
        walletId: "w-1",
        actualAmount: actualSalary,
        livingCost,
        allocations,
        freeAmount,
        date: "2026-11-20",
      });

      expect(res.totalAllocated).toBe(2000000);
      expect(res.livingCost).toBe(400000);
      expect(res.freeAmount).toBe(6100000);
      expect(res.depositResults.length).toBe(2);
    });
  });

  describe("B. Transaksi Berulang (Recurring Transactions)", () => {
    it("mendeteksi tagihan yang jatuh tempo pada 2026-11-20", async () => {
      const due = await getDueRecurringTransactions("2026-11-20");
      expect(due.length).toBeGreaterThan(0);
      const claudePro = due.find((r) => r.note?.includes("Claude Pro"));
      expect(claudePro).toBeDefined();
      expect(claudePro?.amount).toBe(416000);
    });

    it("dapat mencatat atau melewati tagihan dan memajukan tanggal berikutnya", async () => {
      // Test lewati (skip)
      const resSkip = await processRecurringTransaction(
        "rec-claude-pro",
        "skip",
        "2026-11-20"
      );
      expect(resSkip.action).toBe("skip");
      expect(resSkip.nextDate).toBe("2026-12-20");

      // Test catat (record)
      const resRecord = await processRecurringTransaction(
        "rec-claude-pro",
        "record",
        "2026-11-20"
      );
      expect(resRecord.action).toBe("record");
      expect(resRecord.createdTrx).toBeDefined();
      expect(resRecord.nextDate).toBe("2026-12-20");
    });
  });

  describe("C. Anggaran per Kategori (Budgets)", () => {
    it("dapat membaca dan memperbarui batas anggaran bulanan", async () => {
      const month = "2026-11";
      const catId = "c-food";
      const newLimit = 750000;

      const saved = await setBudget(catId, month, newLimit);
      expect(saved).toBeDefined();
      expect(saved?.limit_amount).toBe(newLimit);

      const all = await getBudgets(month);
      const updated = all.find((b) => b.category_id === catId);
      expect(updated?.limit_amount).toBe(newLimit);
    });
  });

  describe("D. Export & Backup (CSV & JSON)", () => {
    it("menghasilkan file CSV transaksi dengan header lengkap dan UTF-8 BOM", () => {
      const sampleTxs = [
        {
          id: "t-1",
          date: "2026-11-20",
          type: "expense",
          amount: 25000,
          category: "Makanan & Minuman",
          wallet: "Uang Tunai",
          note: "Makan Siang",
          merchant: "Warung Bu Siti",
          source: "manual",
        },
        {
          id: "t-2",
          date: "2026-11-20",
          type: "income",
          amount: 8500000,
          category: "Gaji",
          wallet: "BCA Utama",
          note: "Gaji November",
          merchant: null,
          source: "payday",
        },
      ];

      const csv = generateTransactionsCSV(sampleTxs);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("Nominal (Rp)");
      expect(csv).toContain("Pengeluaran");
      expect(csv).toContain("Warung Bu Siti");
      expect(csv).toContain("25000");
      expect(csv).toContain("8500000");
    });

    it("menghasilkan file JSON backup lengkap terstruktur", () => {
      const backupData = {
        exportedAt: "2026-11-20T12:00:00Z",
        version: "1.0",
        appName: "Dompetku",
        wallets: [{ id: "w-1", name: "BCA Utama", balance: 8200000 }],
        categories: [{ id: "c-1", name: "Makanan & Minuman" }],
        transactions: [{ id: "t-1", amount: 25000 }],
        savings_goals: [{ id: "g-1", name: "Dana Darurat" }],
      };

      const jsonStr = generateBackupJSON(backupData);
      expect(jsonStr).toContain('"appName": "Dompetku"');
      expect(jsonStr).toContain('"version": "1.0"');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.wallets.length).toBe(1);
      expect(parsed.wallets[0].name).toBe("BCA Utama");
    });
  });
});
