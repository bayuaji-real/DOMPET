import { describe, it, expect } from "vitest";
import { periodRange, limitStatus, limitStatuses, limitMessage, neededRange, masterLimit, dailyAllowance, splitLimit, debtView, masterStatuses, type Limit, type Tx } from "./spend-limit";

const lim = (o: Partial<Limit> = {}): Limit => ({ id: "l1", name: "Makan & main", period: "harian", amount: 50_000, category_ids: [], warn_pct: 80, is_active: true, ...o });
const tx = (o: Partial<Tx>): Tx => ({ type: "expense", amount: 10_000, date: "2026-11-24", category_id: null, ...o });
const f = (n: number) => `Rp${n}`;

describe("rentang periode", () => {
  it("harian", () => { expect(periodRange("harian", "2026-11-24")).toEqual({ from: "2026-11-24", to: "2026-11-24" }); });
  it("mingguan mulai Senin (24 Nov 2026 hari Selasa)", () => { expect(periodRange("mingguan", "2026-11-24")).toEqual({ from: "2026-11-23", to: "2026-11-29" }); });
  it("mingguan pada hari Minggu masih satu minggu dengan Senin sebelumnya", () => { expect(periodRange("mingguan", "2026-11-29")).toEqual({ from: "2026-11-23", to: "2026-11-29" }); });
  it("mingguan lintas bulan dan tahun", () => { expect(periodRange("mingguan", "2027-01-01")).toEqual({ from: "2026-12-28", to: "2027-01-03" }); });
  it("bulanan, termasuk Februari kabisat", () => { expect(periodRange("bulanan", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" }); });
});
describe("status batas", () => {
  it("aman di bawah ambang", () => { const s = limitStatus(lim(), [tx({ amount: 30_000 })], "2026-11-24"); expect(s.level).toBe("aman"); expect(s.pct).toBe(60); expect(s.remaining).toBe(20_000); });
  it("hampir di 80% ke atas", () => { expect(limitStatus(lim(), [tx({ amount: 40_000 })], "2026-11-24").level).toBe("hampir"); });
  it("tepat di batas masih hampir, lebih dari batas = lewat", () => {
    expect(limitStatus(lim(), [tx({ amount: 50_000 })], "2026-11-24").level).toBe("hampir");
    expect(limitStatus(lim(), [tx({ amount: 50_001 })], "2026-11-24").level).toBe("lewat");
  });
  it("hanya pengeluaran dan hanya periode berjalan", () => {
    const s = limitStatus(lim(), [tx({ type: "income", amount: 99_999 }), tx({ type: "transfer", amount: 99_999 }), tx({ date: "2026-11-23", amount: 99_999 }), tx({ amount: 5_000 })], "2026-11-24");
    expect(s.spent).toBe(5_000);
  });
  it("batas per kategori mengabaikan kategori lain (kebutuhan lain dikecualikan)", () => {
    const l = lim({ category_ids: ["makan", "main"] });
    const s = limitStatus(l, [tx({ category_id: "makan", amount: 20_000 }), tx({ category_id: "main", amount: 10_000 }), tx({ category_id: "listrik", amount: 500_000 }), tx({ category_id: null, amount: 70_000 })], "2026-11-24");
    expect(s.spent).toBe(30_000);
  });
  it("mingguan menjumlah Senin sampai hari ini", () => {
    const s = limitStatus(lim({ period: "mingguan", amount: 100_000 }), [tx({ date: "2026-11-23", amount: 40_000 }), tx({ date: "2026-11-24", amount: 50_000 }), tx({ date: "2026-11-22", amount: 999_999 })], "2026-11-24");
    expect(s.spent).toBe(90_000); expect(s.level).toBe("hampir");
  });
  it("batas nonaktif diabaikan", () => { expect(limitStatuses([lim({ is_active: false })], [tx({ amount: 99_999 })], "2026-11-24")).toEqual([]); });
});
describe("pesan dan rentang", () => {
  it("aman tidak ada pesan", () => { expect(limitMessage(limitStatus(lim(), [], "2026-11-24"), f)).toBeNull(); });
  it("pesan hampir dan lewat", () => {
    expect(limitMessage(limitStatus(lim(), [tx({ amount: 45_000 })], "2026-11-24"), f)).toMatch(/hampir habis hari ini.*sisa Rp5000/);
    expect(limitMessage(limitStatus(lim(), [tx({ amount: 60_000 })], "2026-11-24"), f)).toMatch(/terlewati.*lebih Rp10000/);
  });
  it("rentang data terlebar", () => { expect(neededRange([lim(), lim({ period: "bulanan" })], "2026-11-24")).toEqual({ from: "2026-11-01", to: "2026-11-24" }); expect(neededRange([], "2026-11-24")).toEqual({ from: "2026-11-24", to: "2026-11-24" }); });
});

describe("batas utama dipecah otomatis", () => {
  it("harian 50rb -> mingguan 350rb, bulanan x jumlah hari (November 30 hari)", () => {
    expect(splitLimit({ period: "harian", amount: 50_000 }, "2026-11-24")).toEqual({ harian: 50_000, mingguan: 350_000, bulanan: 1_500_000 });
  });
  it("mingguan 350rb -> harian 50rb, bulanan 1,5jt; angka yang diisi tidak diubah", () => {
    expect(splitLimit({ period: "mingguan", amount: 350_000 }, "2026-11-24")).toEqual({ harian: 50_000, mingguan: 350_000, bulanan: 1_500_000 });
  });
  it("bulanan 1,5jt di November -> harian 50rb; Desember 31 hari beda", () => {
    expect(splitLimit({ period: "bulanan", amount: 1_500_000 }, "2026-11-24").harian).toBe(50_000);
    expect(dailyAllowance({ period: "bulanan", amount: 1_550_000 }, "2026-12-10")).toBe(50_000);
  });
  it("batas utama: hanya aktif dan tanpa kategori, periode terkecil dulu", () => {
    const a = lim({ id: "a", period: "bulanan" }), b = lim({ id: "b", period: "harian", category_ids: ["x"] }), c = lim({ id: "c", period: "mingguan", is_active: false });
    expect(masterLimit([a, b, c])?.id).toBe("a");
    expect(masterLimit([b, c])).toBeNull();
    expect(masterLimit([a, lim({ id: "d", period: "harian" })])?.id).toBe("d");
  });
  it("status tiga periode memakai angka turunan", () => {
    const s = masterStatuses(lim({ period: "harian", amount: 50_000 }), [tx({ amount: 20_000, date: "2026-11-24" }), tx({ amount: 30_000, date: "2026-11-23" })], "2026-11-24");
    expect(s.harian.spent).toBe(20_000);
    expect(s.mingguan.limit.amount).toBe(350_000);
    expect(s.mingguan.spent).toBe(50_000);
    expect(s.bulanan.limit.amount).toBe(1_500_000);
  });
});
describe("utang batas", () => {
  const L = { period: "harian" as const, amount: 50_000 };
  it("tanpa kelebihan: tidak ada utang", () => {
    const v = debtView(L, [tx({ date: "2026-11-22", amount: 40_000 })], "2026-11-22", "2026-11-24");
    expect(v.debtIn).toBe(0); expect(v.available).toBe(50_000); expect(v.daysToClear).toBeNull();
  });
  it("lebih 35rb kemarin -> jatah hari ini 15rb", () => {
    const v = debtView(L, [tx({ date: "2026-11-23", amount: 85_000 })], "2026-11-23", "2026-11-24");
    expect(v.debtIn).toBe(35_000); expect(v.available).toBe(15_000); expect(v.remainingToday).toBe(15_000);
  });
  it("hari ini belanja 10rb dari jatah 15rb: utang lunas, sisa 5rb", () => {
    const v = debtView(L, [tx({ date: "2026-11-23", amount: 85_000 }), tx({ date: "2026-11-24", amount: 10_000 })], "2026-11-23", "2026-11-24");
    expect(v.remainingToday).toBe(5_000); expect(v.debtAfterToday).toBe(0);
  });
  it("lebih besar dari sehari penuh: dicicil lintas hari (120rb -> utang 70rb, jatah 0)", () => {
    const v = debtView(L, [tx({ date: "2026-11-23", amount: 120_000 })], "2026-11-23", "2026-11-24");
    expect(v.debtIn).toBe(70_000); expect(v.available).toBe(0); expect(v.debtAfterToday).toBe(70_000 - 50_000 + 0); expect(v.daysToClear).toBe(1);
  });
  it("hari hemat melunasi utang bertahap, tidak pernah negatif", () => {
    const v = debtView(L, [tx({ date: "2026-11-21", amount: 120_000 }), tx({ date: "2026-11-22", amount: 10_000 })], "2026-11-21", "2026-11-24");
    expect(v.debtIn).toBe(0);
  });
  it("hanya pengeluaran yang dihitung; pemasukan dan transfer diabaikan", () => {
    const v = debtView(L, [tx({ date: "2026-11-23", type: "income", amount: 999_999 }), tx({ date: "2026-11-23", type: "transfer", amount: 999_999 })], "2026-11-23", "2026-11-24");
    expect(v.debtIn).toBe(0);
  });
});
