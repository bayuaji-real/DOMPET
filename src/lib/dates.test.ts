import { describe, it, expect } from "vitest";
import { nextDateForDay, nextMonthOnDay, clampedDate } from "@/lib/dates";

describe("tanggal kalender", () => {
  it("jadwal bulanan: pakai bulan ini kalau tanggalnya belum lewat", () => {
    expect(nextDateForDay(25, "2026-11-20")).toBe("2026-11-25");
    expect(nextDateForDay(20, "2026-11-20")).toBe("2026-11-20");
  });
  it("jadwal bulanan: pindah ke bulan depan kalau sudah lewat, termasuk ganti tahun", () => {
    expect(nextDateForDay(5, "2026-11-20")).toBe("2026-12-05");
    expect(nextDateForDay(5, "2026-12-20")).toBe("2027-01-05");
  });
  it("tanggal 31 dipotong ke akhir bulan", () => {
    expect(clampedDate(2027, 2, 31)).toBe("2027-02-28");
    expect(clampedDate(2028, 2, 31)).toBe("2028-02-29");
    expect(nextDateForDay(31, "2027-02-10")).toBe("2027-02-28");
  });
  it("tagihan berulang tgl 31 tidak meloncat bulan", () => {
    expect(nextMonthOnDay("2027-01-31", 31)).toBe("2027-02-28");
    expect(nextMonthOnDay("2027-02-28", 31)).toBe("2027-03-31");
    expect(nextMonthOnDay("2026-12-15", 15)).toBe("2027-01-15");
  });
});
