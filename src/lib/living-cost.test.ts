import { describe, it, expect } from "vitest";
import { toLivingAnswer, averageLivingMonthly, makeAnswer, makeAnswerPerPayday, paydaysPerMonth, perPaydayFromMonthly, sumNeeds } from "./living-cost";
import { parseBasisAnswer, CONFUSED_RE } from "./savings-answer";

describe("toLivingAnswer", () => {
  it("tanpa penanda = belum dijawab (ditanya)", () => {
    expect(toLivingAnswer(null, 400000)).toBeNull();
    expect(toLivingAnswer(undefined, 0)).toBeNull();
    expect(toLivingAnswer("lainnya", 400000)).toBeNull();
  });
  it("jawaban tersimpan dibaca balik", () => {
    expect(toLivingAnswer("diisi", 400000, 867000)).toEqual({ source: "diisi", monthly: 867000, perPayday: 400000 });
    expect(toLivingAnswer("dihitung", 300000, null)).toEqual({ source: "dihitung", monthly: 300000, perPayday: 300000 });
  });
  it("belum_punya selalu Rp0", () => {
    expect(toLivingAnswer("belum_punya", 999, 999)).toEqual({ source: "belum_punya", monthly: 0, perPayday: 0 });
  });
});

describe("per bulan ke per gajian", () => {
  it("gajian dua mingguan = 26/12 kali per bulan", () => {
    expect(perPaydayFromMonthly(2_600_000, paydaysPerMonth("biweekly"))).toBe(1_200_000);
    expect(makeAnswer("diisi", 867_000, paydaysPerMonth("biweekly"))).toEqual({ source: "diisi", monthly: 867000, perPayday: 400154 });
  });
  it("diketik per gajian: angkanya dipakai apa adanya (400.000 tetap 400.000)", () => {
    expect(makeAnswerPerPayday("diisi", 400_000, paydaysPerMonth("biweekly"))).toEqual({ source: "diisi", perPayday: 400000, monthly: 866667 });
  });
  it("diketik per bulan 400.000 jadi sekitar 184.615 per gajian dua mingguan", () => {
    expect(makeAnswer("diisi", 400_000, paydaysPerMonth("biweekly")).perPayday).toBe(184615);
  });
  it("gajian bulanan: per gajian sama dengan per bulan", () => {
    expect(makeAnswer("diisi", 1_500_000, paydaysPerMonth("monthly")).perPayday).toBe(1_500_000);
  });
  it("belum punya = 0", () => {
    expect(makeAnswer("belum_punya", 500_000, 1)).toEqual({ source: "belum_punya", monthly: 0, perPayday: 0 });
  });
});

describe("averageLivingMonthly", () => {
  it("rata-rata dikurangi tagihan rutin, dibulatkan Rp1.000", () => {
    expect(averageLivingMonthly({ avgMonthlyExpense: 2_000_400, billsMonthly: 500_000 })).toBe(1_500_000);
    expect(averageLivingMonthly({ avgMonthlyExpense: 300_000, billsMonthly: 500_000 })).toBe(0);
  });
});

describe("sumNeeds", () => {
  it("menjumlah rincian, abaikan kosong", () => {
    expect(sumNeeds({ makan: "1500000", minum: "200000", laundry: "", transport: 400000 })).toBe(2_100_000);
  });
});

describe("jawaban Ruby soal biaya hidup", () => {
  it("bingung dikenali", () => {
    expect(CONFUSED_RE.test("aku bingung")).toBe(true);
    expect(CONFUSED_RE.test("gatau")).toBe(true);
    expect(CONFUSED_RE.test("1,5 juta")).toBe(false);
  });
  it("rincian kebutuhan dijumlahkan", () => {
    expect(parseBasisAnswer("biaya_hidup", "makan 1,5 juta, minum 200 ribu, laundry 150 ribu, transport 400 ribu", false)).toEqual({ monthly_living_cost: 2_250_000 });
  });
  it("satu angka tetap dibaca biasa", () => {
    expect(parseBasisAnswer("biaya_hidup", "sekitar 2 juta", false)).toEqual({ monthly_living_cost: 2_000_000 });
  });
});
