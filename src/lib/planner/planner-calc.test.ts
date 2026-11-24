import { describe, it, expect } from "vitest";
import { summarize, paidFor, itemProgressPct, daysUntil, upcoming, monthlySaving, guestTotals, todoProgress, type PItem, type PPayment, type PTodo } from "./planner-calc";

const item = (o: Partial<PItem>): PItem => ({ id: "a", kind: "vendor", name: "Katering", planned_cost: 10_000_000, status: "belum", needed_date: null, side: "umum", ...o });
const pay = (o: Partial<PPayment>): PPayment => ({ id: "p", item_id: "a", amount: 1_000_000, paid_at: "2027-01-01", ...o });

describe("planner-calc", () => {
  it("menghitung ringkasan anggaran", () => {
    const items = [item({}), item({ id: "b", kind: "seserahan", planned_cost: 5_000_000 })];
    const pays = [pay({ amount: 4_000_000 }), pay({ id: "q", item_id: "b", amount: 5_000_000 }), pay({ id: "r", item_id: null, amount: 500_000 })];
    const s = summarize(items, pays, 20_000_000);
    expect(s.planned).toBe(15_000_000);
    expect(s.paid).toBe(9_500_000);
    expect(s.obligation).toBe(6_000_000);
    expect(s.budgetLeft).toBe(5_000_000);
    expect(s.cashLeft).toBe(10_500_000);
    expect(s.overBudget).toBe(false);
    expect(s.usedPct).toBe(75);
  });
  it("menandai melebihi budget dan tidak menghitung kelebihan bayar sebagai kewajiban negatif", () => {
    const s = summarize([item({ planned_cost: 3_000_000 })], [pay({ amount: 5_000_000 })], 2_000_000);
    expect(s.overBudget).toBe(true);
    expect(s.obligation).toBe(0);
    expect(s.budgetLeft).toBe(-1_000_000);
  });
  it("budget 0 tidak dianggap melebihi", () => { expect(summarize([item({})], [], 0).overBudget).toBe(false); });
  it("paidFor dan progres item", () => {
    expect(paidFor("a", [pay({}), pay({ id: "x", amount: 2_000_000 }), pay({ id: "y", item_id: "z" })])).toBe(3_000_000);
    expect(itemProgressPct(item({}), [pay({ amount: 2_500_000 })])).toBe(25);
    expect(itemProgressPct(item({ planned_cost: 0, status: "selesai" }), [])).toBe(100);
    expect(itemProgressPct(item({ planned_cost: 1000 }), [pay({ amount: 9999 })])).toBe(100);
  });
  it("daysUntil lintas bulan dan tahun", () => {
    expect(daysUntil("2027-01-02", "2026-12-31")).toBe(2);
    expect(daysUntil("2026-11-20", "2026-11-24")).toBe(-4);
  });
  it("upcoming: urut, termasuk terlambat, abaikan yang beres atau jauh", () => {
    const todos: PTodo[] = [
      { id: "t1", kind: "dokumen", title: "KTP", due_date: "2026-11-20", done: false, side: "umum" },
      { id: "t2", kind: "jadwal", title: "Fitting", due_date: "2026-12-10", done: false, side: "umum" },
      { id: "t3", kind: "dokumen", title: "KK", due_date: "2026-11-25", done: true, side: "umum" },
    ];
    const u = upcoming([item({ needed_date: "2027-06-01" }), item({ id: "c", name: "Dekor", needed_date: "2026-12-01" })], todos, "2026-11-24");
    expect(u.map((x) => x.id)).toEqual(["t1", "c", "t2"]);
    expect(u[0].overdue).toBe(true);
  });
  it("tabungan per bulan", () => {
    expect(monthlySaving(12_000_000, "2027-05-24", "2026-11-24")).toBe(Math.ceil(12_000_000 / Math.ceil(181 / 30)));
    expect(monthlySaving(0, "2027-05-24", "2026-11-24")).toBeNull();
    expect(monthlySaving(1000, "2026-11-01", "2026-11-24")).toBeNull();
    expect(monthlySaving(1000, null, "2026-11-24")).toBeNull();
  });
  it("tamu dan progres tugas", () => {
    const g = guestTotals([{ pax: 2, attendance: "hadir", side: "pria" }, { pax: 3, attendance: "belum", side: "wanita" }, { pax: 1, attendance: "tidak", side: "umum" }]);
    expect(g).toEqual({ orang: 6, undangan: 3, hadir: 2, tidak: 1, belum: 3 });
    expect(todoProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
    expect(todoProgress([{ id: "1", kind: "dokumen", title: "x", due_date: null, done: true, side: "umum" }, { id: "2", kind: "dokumen", title: "y", due_date: null, done: false, side: "umum" }]).pct).toBe(50);
  });
});
