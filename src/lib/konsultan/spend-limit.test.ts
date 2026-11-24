import { describe, it, expect } from "vitest";
import { periodRange, limitStatus, limitStatuses, limitMessage, neededRange, type Limit, type Tx } from "./spend-limit";

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
