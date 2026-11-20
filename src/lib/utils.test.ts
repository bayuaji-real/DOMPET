import { describe, it, expect } from "vitest";
import { formatRupiah, parseRupiah, formatTanggal, formatTanggalWIB } from "./utils";

describe("Utilitas Format Keuangan & Tanggal Dompetku", () => {
  describe("formatRupiah", () => {
    it("memformat angka 1250000 menjadi Rp1.250.000", () => {
      expect(formatRupiah(1250000)).toBe("Rp1.250.000");
    });

    it("memformat BigInt 1250000n menjadi Rp1.250.000", () => {
      expect(formatRupiah(1250000n)).toBe("Rp1.250.000");
    });

    it("memformat angka 0 menjadi Rp0", () => {
      expect(formatRupiah(0)).toBe("Rp0");
      expect(formatRupiah(0n)).toBe("Rp0");
    });

    it("memformat angka negatif menjadi -Rp50.000", () => {
      expect(formatRupiah(-50000)).toBe("-Rp50.000");
      expect(formatRupiah(-50000n)).toBe("-Rp50.000");
    });

    it("memformat angka dengan opsi absolute tanpa minus", () => {
      expect(formatRupiah(-50000, { absolute: true })).toBe("Rp50.000");
      expect(formatRupiah(-50000n, { absolute: true })).toBe("Rp50.000");
      expect(formatRupiah(1250000, { absolute: true })).toBe("Rp1.250.000");
    });

    it("memformat nominal ratusan juta dan miliaran", () => {
      expect(formatRupiah(250000000)).toBe("Rp250.000.000");
      expect(formatRupiah(1500000000n)).toBe("Rp1.500.000.000");
    });
  });

  describe("parseRupiah", () => {
    it("mengubah '1.250.000' menjadi 1250000", () => {
      expect(parseRupiah("1.250.000")).toBe(1250000);
    });

    it("mengubah 'Rp1.250.000' menjadi 1250000", () => {
      expect(parseRupiah("Rp1.250.000")).toBe(1250000);
    });

    it("mengubah 'Rp 50.000' menjadi 50000", () => {
      expect(parseRupiah("Rp 50.000")).toBe(50000);
    });

    it("mengembalikan 0 untuk string kosong atau tanpa angka", () => {
      expect(parseRupiah("")).toBe(0);
      expect(parseRupiah("abc")).toBe(0);
    });

    it("menangani input number secara langsung", () => {
      expect(parseRupiah(75000)).toBe(75000);
    });
  });

  describe("formatTanggal (Asia/Jakarta)", () => {
    it("memformat tanggal 2026-11-20 menjadi '20 Nov 2026'", () => {
      // 2026-11-20T00:00:00Z di WIB adalah 2026-11-20
      const date = new Date("2026-11-20T03:00:00Z");
      expect(formatTanggal(date)).toBe("20 Nov 2026");
    });

    it("memformat tanggal string ISO", () => {
      expect(formatTanggal("2026-11-20T10:00:00+07:00")).toBe("20 Nov 2026");
    });

    it("menghasilkan hasil yang sama antara formatTanggal dan formatTanggalWIB", () => {
      const date = new Date("2026-08-17T07:00:00+07:00");
      expect(formatTanggal(date)).toBe(formatTanggalWIB(date));
    });

    it("mengembalikan '-' jika tanggal tidak valid", () => {
      expect(formatTanggal("tanggal-palsu")).toBe("-");
    });
  });
});
