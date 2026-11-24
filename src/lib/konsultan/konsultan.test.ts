import { describe, it, expect } from "vitest";
import { simulateInvestment, monthlyToAnnualPct } from "./invest-calc";
import { summarizePortfolio, rankSnapshots } from "./portfolio";
import { annuityPayment, flatPayment, effectiveAnnualRatePct, compareFlat, comparePaylater } from "./loan-simulator";
import { planPayoff } from "./debt-payoff";
import { healthScore } from "./health-score";
import { forecastCashflow } from "./cashflow-forecast";
import { earlyWarnings } from "./early-warning";
import { zakatMaal, zakatPenghasilan, allocateThr } from "./zakat";
import { weeklyReport } from "./weekly-report";
import { parseMoney, parseDate, parseStatementCsv, suggestCategory, splitCsvLine } from "./csv-import";

describe("invest-calc", () => {
  it("return 0% = hanya setoran", () => {
    const r = simulateInvestment({ initial: 1_000_000, monthly: 500_000, annualReturnPct: 0, years: 1 });
    expect(r.finalValue).toBe(7_000_000); expect(r.gain).toBe(0); expect(r.months).toHaveLength(12); expect(r.years).toHaveLength(1);
  });
  it("12 bulan dengan return 12% efektif, modal awal saja", () => {
    const r = simulateInvestment({ initial: 1_000_000, monthly: 0, annualReturnPct: 12, years: 1 });
    expect(r.finalValue).toBe(1_120_000);
  });
  it("input aneh tidak merusak", () => {
    const r = simulateInvestment({ initial: NaN, monthly: -5, annualReturnPct: 1e9, years: 999 });
    expect(Number.isFinite(r.finalValue)).toBe(true); expect(r.months.length).toBe(600);
  });
  it("return negatif boleh menurun", () => {
    expect(simulateInvestment({ initial: 1_000_000, monthly: 0, annualReturnPct: -10, years: 1 }).finalValue).toBeLessThan(1_000_000);
  });
  it("bulanan ke tahunan", () => { expect(monthlyToAnnualPct(1)).toBeCloseTo(12.68, 1); });
});
describe("portfolio", () => {
  it("untung rugi", () => {
    const s = summarizePortfolio([{ id: "1", name: "A", kind: "saham", units: 10, avg_price: 1000, last_price: 1200 }, { id: "2", name: "B", kind: "emas", units: 1, avg_price: 500, last_price: null }]);
    expect(s.cost).toBe(10500); expect(s.value).toBe(12500); expect(s.pnl).toBe(2000); expect(s.missingPrice).toBe(1);
  });
  it("kosong aman", () => { const s = summarizePortfolio([]); expect(s.pnlPct).toBe(0); });
  it("ranking return terbesar, kosong di bawah", () => {
    const r = rankSnapshots([{ id: "a", name: "a", category: "x", risk: "r", ret_1m: 1, ret_ytd: null, ret_1y: null }, { id: "b", name: "b", category: "x", risk: "r", ret_1m: 3, ret_ytd: null, ret_1y: 2 }, { id: "c", name: "c", category: "x", risk: "r", ret_1m: -2, ret_ytd: null, ret_1y: 9 }], "ret_1y");
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});
describe("loan", () => {
  it("anuitas 12 bulan 12%", () => { expect(annuityPayment(12_000_000, 12, 12)).toBeCloseTo(1_066_185, -1); });
  it("bunga 0", () => { expect(annuityPayment(1200, 0, 12)).toBe(100); });
  it("flat 12 bulan 12%", () => { expect(flatPayment(12_000_000, 12, 12)).toBe(1_120_000); });
  it("efektif flat jauh lebih besar dari flat", () => { expect(effectiveAnnualRatePct(12_000_000, 1_120_000, 12)).toBeGreaterThan(21); });
  it("tanpa bunga = 0", () => { expect(effectiveAnnualRatePct(1200, 100, 12)).toBe(0); });
  it("compare flat dan paylater", () => {
    expect(compareFlat(1_000_000, 12, 12).interest).toBeCloseTo(120_000, 0);
    const p = comparePaylater(1_000_000, 2.5, 3, 0);
    expect(p.total).toBeGreaterThan(1_000_000);
  });
});
describe("debt-payoff", () => {
  const d = [{ id: "1", name: "Kartu", balance: 5_000_000, annualRatePct: 36, minPayment: 300_000 }, { id: "2", name: "Motor", balance: 3_000_000, annualRatePct: 12, minPayment: 300_000 }];
  it("avalanche tidak lebih mahal dari snowball", () => {
    const a = planPayoff(d, 1_000_000, "avalanche"), s = planPayoff(d, 1_000_000, "snowball");
    expect(a.feasible).toBe(true); expect(a.totalInterest).toBeLessThanOrEqual(s.totalInterest); expect(a.order).toHaveLength(2);
  });
  it("anggaran kurang dari minimum = tidak layak", () => { expect(planPayoff(d, 100_000, "avalanche").feasible).toBe(false); });
  it("tanpa utang", () => { expect(planPayoff([], 1000, "avalanche").months).toBe(0); });
  it("cicilan minimum tak menutup bunga: tidak loop selamanya", () => {
    const r = planPayoff([{ id: "1", name: "X", balance: 100_000_000, annualRatePct: 60, minPayment: 100_000 }], 100_000, "avalanche");
    expect(r.feasible).toBe(false); expect(r.months).toBe(600);
  });
});
describe("health", () => {
  it("sehat", () => { expect(healthScore({ monthlyIncome: 10_000_000, monthlyExpense: 6_000_000, liquidSavings: 40_000_000, monthlyDebtPayment: 500_000 }).level).toBe("sehat"); });
  it("perlu perhatian", () => { expect(healthScore({ monthlyIncome: 5_000_000, monthlyExpense: 6_000_000, liquidSavings: 0, monthlyDebtPayment: 3_000_000 }).level).toBe("perlu perhatian"); });
  it("tanpa data tidak NaN", () => { const r = healthScore({ monthlyIncome: 0, monthlyExpense: 0, liquidSavings: 0, monthlyDebtPayment: 0 }); expect(Number.isFinite(r.total)).toBe(true); });
  it("skor di rentang 0-100", () => { const r = healthScore({ monthlyIncome: 1, monthlyExpense: 1e12, liquidSavings: -5, monthlyDebtPayment: 1e12 }); expect(r.total).toBeGreaterThanOrEqual(0); expect(r.total).toBeLessThanOrEqual(100); });
});
describe("forecast", () => {
  it("menandai bulan minus", () => {
    const r = forecastCashflow({ startBalance: 1_000_000, monthlyIncome: 5_000_000, avgMonthlyExpense: 4_500_000, monthlyFixedBills: 1_500_000 });
    expect(r.months).toHaveLength(3); expect(r.firstNegativeMonth).toBe(2); expect(r.months[0].balance).toBe(0);
  });
  it("aman jika surplus", () => { expect(forecastCashflow({ startBalance: 0, monthlyIncome: 5, avgMonthlyExpense: 1, monthlyFixedBills: 1 }).firstNegativeMonth).toBeNull(); });
});
describe("early-warning", () => {
  it("terlewati = bahaya", () => { expect(earlyWarnings([{ name: "Makan", limit: 100, spent: 120 }], 10, 30)[0].level).toBe("bahaya"); });
  it("laju tinggi = waspada", () => { expect(earlyWarnings([{ name: "Makan", limit: 1000, spent: 600 }], 10, 30)[0].level).toBe("waspada"); });
  it("aman = kosong", () => { expect(earlyWarnings([{ name: "Makan", limit: 1000, spent: 100 }], 10, 30)).toEqual([]); });
  it("limit 0 diabaikan", () => { expect(earlyWarnings([{ name: "X", limit: 0, spent: 5 }], 10, 30)).toEqual([]); });
});
describe("zakat", () => {
  it("maal di bawah nisab", () => { expect(zakatMaal(1_000_000, 1_000_000).wajib).toBe(false); });
  it("maal di atas nisab", () => { const r = zakatMaal(100_000_000, 1_000_000); expect(r.nisab).toBe(85_000_000); expect(r.zakat).toBe(2_500_000); });
  it("tanpa harga emas tidak wajib", () => { expect(zakatMaal(1e9, 0).wajib).toBe(false); });
  it("penghasilan", () => { const r = zakatPenghasilan(10_000_000, 1_200_000); expect(r.wajib).toBe(true); expect(r.zakat).toBe(250_000); });
  it("alokasi THR tidak melebihi jumlah", () => { const s = allocateThr(1_000_000, { zakat: 25, mudik: 40, angpao: 30, tabung: 30 }); expect(s.zakat + s.mudik + s.angpao + s.tabung + s.sisa).toBe(1_000_000); });
});
describe("weekly", () => {
  it("hitung minggu ini vs lalu", () => {
    const r = weeklyReport([
      { type: "expense", amount: 100, date: "2026-11-20", category_id: "a" }, { type: "expense", amount: 300, date: "2026-11-21", category_id: "b" },
      { type: "income", amount: 1000, date: "2026-11-22", category_id: null }, { type: "expense", amount: 200, date: "2026-11-12", category_id: "a" },
      { type: "expense", amount: 999, date: "2026-10-01", category_id: "a" },
    ], "2026-11-24");
    expect(r.expense).toBe(400); expect(r.income).toBe(1000); expect(r.prevExpense).toBe(200); expect(r.expenseDeltaPct).toBe(100); expect(r.topCategoryId).toBe("b");
  });
  it("tanpa pembanding", () => { expect(weeklyReport([], "2026-11-24").expenseDeltaPct).toBeNull(); });
});
describe("csv", () => {
  it("parseMoney", () => {
    expect(parseMoney("Rp 1.234.567")).toBe(1234567); expect(parseMoney("1.234,50")).toBe(1234.5); expect(parseMoney("50.000")).toBe(50000);
    expect(parseMoney("-25000")).toBe(-25000); expect(parseMoney("abc")).toBeNull(); expect(parseMoney("1,234,567.89")).toBe(1234567.89);
  });
  it("parseDate", () => { expect(parseDate("24/11/2026")).toBe("2026-11-24"); expect(parseDate("2026-11-24 10:00")).toBe("2026-11-24"); expect(parseDate("31/02/2026")).toBeNull(); expect(parseDate("x")).toBeNull(); });
  it("splitCsvLine kutip", () => { expect(splitCsvLine('a,"b,c",d', ",")).toEqual(["a", "b,c", "d"]); });
  it("CSV satu kolom nominal", () => {
    const r = parseStatementCsv("Tanggal,Keterangan,Jumlah\n24/11/2026,Kopi,-25.000\n25/11/2026,Gaji,\"5.000.000\"\nrusak,baris,x");
    expect(r.rows).toHaveLength(2); expect(r.skipped).toBe(1); expect(r.rows[0]).toMatchObject({ type: "expense", amount: 25000 }); expect(r.rows[1].type).toBe("income");
  });
  it("CSV debit/kredit titik koma", () => {
    const r = parseStatementCsv("Tanggal;Keterangan;Debit;Kredit\n2026-11-01;Listrik;300000;\n2026-11-02;Transfer masuk;;1000000");
    expect(r.rows.map((x) => x.type)).toEqual(["expense", "income"]);
  });
  it("header tidak dikenal = tidak ada baris", () => { expect(parseStatementCsv("a,b\n1,2").rows).toEqual([]); });
  it("tebak kategori", () => { expect(suggestCategory("INDOMARET POINT", [{ text: "indomaret", categoryId: "x" }])).toBe("x"); expect(suggestCategory("zzz", [])).toBeNull(); });
});

import { netBalances, suggestTransfers } from "./shared-balance";
import { validPinFormat, makeStoredPin, checkPin, registerFailure, isLocked, MAX_TRIES } from "./pin";
import { buildReminders, reminderText } from "./reminders";

describe("shared-balance", () => {
  const ms = [{ user_id: "a", display_name: "A" }, { user_id: "b", display_name: "B" }, { user_id: "c", display_name: "C" }];
  it("A bayar 90rb dibagi 3: B dan C berutang 30rb", () => {
    const n = netBalances(ms, [{ paid_by: "a", amount: 90000, split_among: ["a", "b", "c"] }], []);
    expect(n.get("a")).toBe(60000); expect(n.get("b")).toBe(-30000); expect(n.get("c")).toBe(-30000);
    expect(suggestTransfers(n)).toEqual([{ from: "b", to: "a", amount: 30000 }, { from: "c", to: "a", amount: 30000 }]);
  });
  it("jumlah saldo selalu nol walau tidak habis dibagi", () => {
    const n = netBalances(ms, [{ paid_by: "a", amount: 100, split_among: ["a", "b", "c"] }, { paid_by: "b", amount: 7, split_among: ["a", "b"] }], []);
    expect([...n.values()].reduce((s, v) => s + v, 0)).toBe(0);
  });
  it("pembayaran melunasi utang", () => {
    const n = netBalances(ms, [{ paid_by: "a", amount: 60000, split_among: ["a", "b"] }], [{ from_user: "b", to_user: "a", amount: 30000 }]);
    expect(n.get("b")).toBe(0); expect(suggestTransfers(n)).toEqual([]);
  });
  it("tanpa pengeluaran tidak ada transfer", () => { expect(suggestTransfers(netBalances(ms, [], []))).toEqual([]); });
});
describe("pin", () => {
  it("format", () => { expect(validPinFormat("1234")).toBe(true); expect(validPinFormat("123")).toBe(false); expect(validPinFormat("12a4")).toBe(false); expect(validPinFormat("1234567")).toBe(false); });
  it("hash benar/salah dan garam berbeda", async () => {
    const s = await makeStoredPin("1234"); expect(await checkPin("1234", s)).toBe(true); expect(await checkPin("1235", s)).toBe(false);
    const s2 = await makeStoredPin("1234"); expect(s2.hash).not.toBe(s.hash); expect(s.hash).not.toContain("1234");
  });
  it("terkunci setelah salah berturut-turut", () => {
    let t = { count: 0, lockedUntil: 0 }; const now = 1000;
    for (let i = 0; i < MAX_TRIES - 1; i++) { t = registerFailure(t, now); expect(isLocked(t, now)).toBe(false); }
    t = registerFailure(t, now); expect(isLocked(t, now)).toBe(true); expect(isLocked(t, now + 61_000)).toBe(false);
  });
});
describe("reminders", () => {
  const rec = [{ type: "expense", amount: 100, next_date: "2026-11-26", note: "Listrik", is_active: true }, { type: "expense", amount: 5, next_date: "2026-12-30", note: "Jauh", is_active: true }, { type: "income", amount: 1, next_date: "2026-11-25", note: "x", is_active: true }, { type: "expense", amount: 5, next_date: "2026-11-25", note: "mati", is_active: false }];
  it("hanya tagihan aktif dalam rentang, terurut", () => {
    const r = buildReminders("2026-11-24", rec, [{ date: "2026-11-25", expected_amount: 5_000_000, actual_amount: null, note: null }]);
    expect(r.map((x) => x.label)).toEqual(["Gajian", "Listrik"]); expect(reminderText(r[0])).toBe("besok"); expect(reminderText(r[1])).toBe("2 hari lagi");
  });
  it("gajian yang sudah diterima tidak muncul; terlewat ditandai", () => {
    expect(buildReminders("2026-11-24", [], [{ date: "2026-11-25", expected_amount: 1, actual_amount: 1, note: null }])).toEqual([]);
    expect(reminderText(buildReminders("2026-11-24", [{ type: "expense", amount: 1, next_date: "2026-11-22", note: "T", is_active: true }], [])[0])).toBe("terlewat 2 hari");
  });
});

import { sanitizeAiRows } from "./csv-import";
describe("sanitizeAiRows", () => {
  it("membuang baris tidak masuk akal dan merapikan", () => {
    const r = sanitizeAiRows([
      { date: "2026-11-01", description: "Kopi", amount: -25000, type: "expense" },
      { date: "bukan", description: "x", amount: 1, type: "expense" },
      { date: "2026-11-02", description: "y", amount: 0, type: "income" },
      { date: "2026-11-03", description: "z", amount: "1.000.000", type: "income" },
      { date: "2026-11-04", description: "w", amount: 5, type: "lainnya" },
      null, "teks",
    ]);
    expect(r).toEqual([{ date: "2026-11-01", description: "Kopi", amount: 25000, type: "expense" }, { date: "2026-11-03", description: "z", amount: 1000000, type: "income" }]);
  });
  it("bukan array = kosong; dibatasi jumlahnya", () => {
    expect(sanitizeAiRows({})).toEqual([]);
    expect(sanitizeAiRows(Array.from({ length: 500 }, () => ({ date: "2026-11-01", amount: 1, type: "income" })), 300)).toHaveLength(300);
  });
});
