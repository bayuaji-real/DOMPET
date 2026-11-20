import { describe, it, expect } from "vitest";
import {
  parseIndonesianSpokenNumber,
  resolveRelativeDate,
  matchWallet,
  matchCategory,
} from "./voice";

describe("Voice Transaction Parser & Utilities (Phase 5)", () => {
  describe("parseIndonesianSpokenNumber", () => {
    it("dapat mengonversi bahasa gaul Indonesia: goceng, ceban, gocap, cepek, seceng", () => {
      expect(parseIndonesianSpokenNumber("goceng")).toBe(5000);
      expect(parseIndonesianSpokenNumber("ceban")).toBe(10000);
      expect(parseIndonesianSpokenNumber("noban")).toBe(20000);
      expect(parseIndonesianSpokenNumber("gocap")).toBe(50000);
      expect(parseIndonesianSpokenNumber("seceng")).toBe(1000);
      expect(parseIndonesianSpokenNumber("gopek")).toBe(500);
    });

    it("dapat mengonversi format lisan: lima belas ribu, dua puluh ribu, dua ratus rebu", () => {
      expect(parseIndonesianSpokenNumber("lima belas ribu")).toBe(15000);
      expect(parseIndonesianSpokenNumber("dua puluh ribu")).toBe(20000);
      expect(parseIndonesianSpokenNumber("dua ratus rebu")).toBe(200000);
      expect(parseIndonesianSpokenNumber("15rb")).toBe(15000);
      expect(parseIndonesianSpokenNumber("20k")).toBe(20000);
    });

    it("dapat mengonversi nominal jutaan: 1,5 juta, dua setengah juta", () => {
      expect(parseIndonesianSpokenNumber("1,5 juta")).toBe(1500000);
      expect(parseIndonesianSpokenNumber("2.5 jt")).toBe(2500000);
      expect(parseIndonesianSpokenNumber("dua setengah juta")).toBe(2500000);
      expect(parseIndonesianSpokenNumber("satu setengah juta")).toBe(1500000);
    });
  });

  describe("resolveRelativeDate", () => {
    const fixedToday = new Date("2026-11-20T12:00:00Z");

    it("mengembalikan tanggal hari ini untuk kata 'tadi pagi' atau 'hari ini'", () => {
      expect(resolveRelativeDate("tadi pagi", fixedToday)).toBe("2026-11-20");
      expect(resolveRelativeDate("hari ini", fixedToday)).toBe("2026-11-20");
    });

    it("mengembalikan H-1 untuk 'kemarin'", () => {
      expect(resolveRelativeDate("kemarin makan soto", fixedToday)).toBe("2026-11-19");
    });

    it("mengembalikan H-2 untuk 'kemarin lusa'", () => {
      expect(resolveRelativeDate("kemarin lusa beli sepatu", fixedToday)).toBe("2026-11-18");
    });

    it("dini hari WIB (masih tanggal kemarin di UTC) tetap memakai tanggal WIB", () => {
      // 01:30 WIB tanggal 1 Des = 18:30 UTC tanggal 30 Nov
      const dini = new Date("2026-11-30T18:30:00Z");
      expect(resolveRelativeDate("tadi", dini)).toBe("2026-12-01");
      expect(resolveRelativeDate("kemarin", dini)).toBe("2026-11-30");
    });
  });

  describe("matchWallet", () => {
    const sampleWallets = [
      { id: "w-cash", name: "Uang Tunai" },
      { id: "w-bca", name: "BCA Utama" },
      { id: "w-gopay", name: "GoPay" },
      { id: "w-mandiri", name: "Bank Mandiri" },
    ];

    it("mendeteksi dompet GoPay jika disebut 'pakai gopay'", () => {
      const result = matchWallet("isi bensin pakai gopay", sampleWallets);
      expect(result.name).toBe("GoPay");
    });

    it("mendeteksi BCA jika disebut 'ke bca'", () => {
      const result = matchWallet("gajian masuk ke bca", sampleWallets);
      expect(result.name).toBe("BCA Utama");
    });

    it("fallback ke Uang Tunai jika tidak disebut dompetnya", () => {
      const result = matchWallet("makan bakso", sampleWallets);
      expect(result.name).toBe("Uang Tunai");
    });
  });

  describe("matchCategory", () => {
    const sampleCategories = [
      { id: "c-food", name: "Makanan & Minuman" },
      { id: "c-groceries", name: "Belanja Harian" },
      { id: "c-trans", name: "Transportasi" },
      { id: "c-bills", name: "Tagihan" },
      { id: "c-income", name: "Gaji / Pemasukan" },
      { id: "c-other", name: "Lainnya" },
    ];

    it("mencocokkan kata makanan/bakso ke Makanan & Minuman", () => {
      const result = matchCategory("makan bakso", sampleCategories);
      expect(result.name).toBe("Makanan & Minuman");
    });

    it("mencocokkan bensin ke Transportasi", () => {
      const result = matchCategory("isi bensin pertalite", sampleCategories);
      expect(result.name).toBe("Transportasi");
    });

    it("mencocokkan gajian ke Gaji / Pemasukan", () => {
      const result = matchCategory("gajian masuk", sampleCategories);
      expect(result.name).toBe("Gaji / Pemasukan");
    });
  });
});
