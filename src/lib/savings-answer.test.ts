import { describe, it, expect } from "vitest";
import { parseBasisAnswer } from "./savings-answer";

describe("parseBasisAnswer", () => {
  it("gaji dan tanggal dalam satu kalimat", () => {
    expect(parseBasisAnswer("gaji", "5 juta tanggal 25", false)).toEqual({ monthly_income: 5_000_000, payday_day: 25 });
    expect(parseBasisAnswer("gaji", "Gajiku 4.500.000, gajian tgl 1", false)).toEqual({ monthly_income: 4_500_000, payday_day: 1 });
  });
  it("hanya gaji: tanggal tidak ditebak", () => {
    expect(parseBasisAnswer("gaji", "3,5 juta", false)).toEqual({ monthly_income: 3_500_000 });
  });
  it("angka kecil tanpa satuan bukan gaji", () => {
    expect(parseBasisAnswer("gaji", "25", false)).toBeNull();
  });
  it("tanggal gajian: angka polos boleh", () => {
    expect(parseBasisAnswer("tanggal_gajian", "25", false)).toEqual({ payday_day: 25 });
    expect(parseBasisAnswer("tanggal_gajian", "tanggal 5 tiap bulan", false)).toEqual({ payday_day: 5 });
    expect(parseBasisAnswer("tanggal_gajian", "nggak tentu", false)).toBeNull();
  });
  it("biaya hidup: pilih rata-rata hanya bila ditawarkan", () => {
    expect(parseBasisAnswer("biaya_hidup", "pakai rata-rata aja", true)).toEqual({ living_use_average: true });
    expect(parseBasisAnswer("biaya_hidup", "iya", true)).toEqual({ living_use_average: true });
    expect(parseBasisAnswer("biaya_hidup", "iya", false)).toBeNull();
  });
  it("biaya hidup: angka sendiri menang atas rata-rata", () => {
    expect(parseBasisAnswer("biaya_hidup", "2 juta aja, bukan rata-rata", true)).toEqual({ monthly_living_cost: 2_000_000 });
  });
});

describe("parseBasisAnswer: komitmen rutin", () => {
  it("satu angka dipakai", () => {
    expect(parseBasisAnswer("komitmen_rutin", "zakat 150rb", false)).toEqual({ other_fixed_monthly: 150_000 });
    expect(parseBasisAnswer("komitmen_rutin", "total 1,2 juta", false)).toEqual({ other_fixed_monthly: 1_200_000 });
  });
  it("beberapa angka: tidak ditebak (null)", () => {
    expect(parseBasisAnswer("komitmen_rutin", "zakat 150rb sama investasi 500rb, total 650rb", false)).toBeNull();
  });
  it("tidak ada = 0 (sudah dijawab)", () => {
    expect(parseBasisAnswer("komitmen_rutin", "tidak ada", false)).toEqual({ other_fixed_monthly: 0 });
    expect(parseBasisAnswer("komitmen_rutin", "Gak ada.", false)).toEqual({ other_fixed_monthly: 0 });
  });
  it("tidak terbaca: null, tidak ditebak", () => {
    expect(parseBasisAnswer("komitmen_rutin", "hmm gimana ya", false)).toBeNull();
  });
});
