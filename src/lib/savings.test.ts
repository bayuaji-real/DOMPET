import { describe, it, expect } from "vitest";
import { calculateSavingsProjection, roundUpToMultiple } from "./savings";

describe("Logika Proyeksi & Status Tabungan (savings.ts)", () => {
  describe("roundUpToMultiple", () => {
    it("membulatkan ke atas ke kelipatan Rp50.000 terdekat", () => {
      expect(roundUpToMultiple(412000, 50000)).toBe(450000);
      expect(roundUpToMultiple(475000, 50000)).toBe(500000);
      expect(roundUpToMultiple(500000, 50000)).toBe(500000);
      expect(roundUpToMultiple(500001, 50000)).toBe(550000);
      expect(roundUpToMultiple(0, 50000)).toBe(0);
    });
  });

  describe("calculateSavingsProjection", () => {
    const asOfDate = new Date("2026-11-20T00:00:00Z");

    it("menghitung data seed Lamaran (35 hari lagi, telat jika setoran kecil)", () => {
      // Data seed: Saldo 2.100.000, Target 6.000.000, Tenggat 25 Des 2026
      const result = calculateSavingsProjection({
        currentAmount: 2100000,
        targetAmount: 6000000,
        deadline: "2026-12-25",
        plannedPerPayday: 500000,
        paydayDates: ["2026-11-28", "2026-12-28", "2027-01-28"],
        asOfDate,
      });

      expect(result.saved).toBe(2100000);
      expect(result.target).toBe(6000000);
      expect(result.remaining).toBe(3900000);
      expect(result.percent).toBe(35);
      expect(result.daysRemaining).toBe(35);
      expect(result.daysRemainingText).toBe("35 hari lagi");

      // Butuh 8 kali gajian (3.900.000 / 500.000 = 7.8 -> 8 gajian), tembus ke 2027
      expect(result.paydaysNeeded).toBe(8);
      // Tenggat 25 Des 2026, sehingga proyeksi melewati tenggat -> Telat
      expect(result.status).toBe("telat");
      expect(result.statusLabel).toBe("Telat");
      expect(result.statusColor).toBe("emerald");

      // Sebelum 25 Des 2026 hanya ada 1 kali gajian (28 Nov 2026).
      // Diperlukan 3.900.000 / 1 = 3.900.000 agar tepat waktu
      expect(result.requiredPerPayday).toBe(3900000);
    });

    it("kasus sesuai jadwal jika proyeksi selesai sebelum tenggat", () => {
      const result = calculateSavingsProjection({
        currentAmount: 3000000,
        targetAmount: 5000000,
        deadline: "2027-05-30",
        plannedPerPayday: 1000000,
        paydayDates: ["2026-11-28", "2026-12-28", "2027-01-28"],
        asOfDate,
      });

      expect(result.remaining).toBe(2000000);
      expect(result.paydaysNeeded).toBe(2);
      expect(result.status).toBe("sesuai_jadwal");
      expect(result.statusLabel).toBe("Sesuai jadwal");
      expect(result.statusColor).toBe("emerald");
      expect(result.requiredPerPayday).toBeNull();
    });

    it("kasus tanpa tenggat (deadline null)", () => {
      const result = calculateSavingsProjection({
        currentAmount: 1500000,
        targetAmount: 10000000,
        deadline: null,
        plannedPerPayday: 1000000,
        paydayDates: ["2026-11-28", "2026-12-28"],
        asOfDate,
      });

      expect(result.daysRemaining).toBeNull();
      expect(result.daysRemainingText).toBeNull();
      expect(result.status).toBe("sesuai_jadwal");
      expect(result.requiredPerPayday).toBeNull();
      expect(result.projectedFullDateFormatted).not.toBeNull();
    });

    it("kasus sudah tercapai (saved >= target)", () => {
      const result = calculateSavingsProjection({
        currentAmount: 6500000,
        targetAmount: 6000000,
        deadline: "2026-12-31",
        plannedPerPayday: 500000,
        asOfDate,
      });

      expect(result.remaining).toBe(0);
      expect(result.percent).toBe(100);
      expect(result.status).toBe("tercapai");
      expect(result.statusLabel).toBe("Tercapai");
      expect(result.statusColor).toBe("blue");
      expect(result.requiredPerPayday).toBe(0);
      expect(result.paydaysNeeded).toBe(0);
    });

    it("kasus setoran 0 dengan tenggat aktif", () => {
      const result = calculateSavingsProjection({
        currentAmount: 1000000,
        targetAmount: 5000000,
        deadline: "2027-01-01",
        plannedPerPayday: 0,
        paydayDates: ["2026-11-28", "2026-12-28"],
        asOfDate,
      });

      expect(result.projectedFullDate).toBeNull();
      expect(result.status).toBe("telat");
      expect(result.statusLabel).toBe("Telat");
      expect(result.requiredPerPayday).toBeGreaterThan(0);
      expect(result.requiredPerPayday! % 50000).toBe(0);
    });
  });
});
