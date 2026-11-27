import { describe, it, expect } from "vitest";
import { splitPayday, clampAllocation, orderGoals, type SplitGoal } from "./payday-split";

const goals: SplitGoal[] = [
  { id: "nikah", name: "Nikah", remaining: 10000000, target: 10000000, deadline: "2027-07-01", priority: 3 },
  { id: "lamaran", name: "Lamaran", remaining: 6000000, target: 6000000, deadline: "2026-12-25", priority: 1 },
  { id: "kuliah", name: "Kuliah", remaining: 17432500, target: 17432500, deadline: "2027-07-01", priority: 2 },
];

describe("splitPayday", () => {
  it("mengisi tujuan berurutan dan Nikah belum kebagian", () => {
    const r = splitPayday({ today: "2026-11-27", salary: 2000000, livingCost: 400000, goals });
    expect(r.amounts).toEqual({ lamaran: 1600000, kuliah: 0, nikah: 0 });
    expect(r.free).toBe(0);
    expect(r.deficit).toBe(0);
  });
  it("total tidak pernah melebihi gaji", () => {
    for (const salary of [0, 123456, 1000000, 2000000, 9999999]) {
      for (const living of [0, 400000, 1500000, 3000000]) {
        const r = splitPayday({ today: "2026-11-27", salary, livingCost: living, goals });
        const total = living + Object.values(r.amounts).reduce((a, b) => a + b, 0) + r.free;
        if (living <= salary) expect(total).toBe(salary);
        expect(Object.values(r.amounts).reduce((a, b) => a + b, 0) + Math.min(living, salary)).toBeLessThanOrEqual(salary);
      }
    }
  });
  it("sisa mengalir ke tujuan berikutnya bila yang pertama penuh", () => {
    const small: SplitGoal[] = [{ ...goals[1], remaining: 500000 }, goals[2]];
    const r = splitPayday({ today: "2026-11-27", salary: 2000000, livingCost: 400000, goals: small });
    expect(r.amounts.lamaran).toBe(500000);
    expect(r.amounts.kuliah).toBe(1100000);
  });
  it("biaya hidup lebih besar dari gaji: tidak ada setoran dan ada kekurangan", () => {
    const r = splitPayday({ today: "2026-11-27", salary: 300000, livingCost: 400000, goals });
    expect(r.deficit).toBe(100000);
    expect(Object.values(r.amounts).every((v) => v === 0)).toBe(true);
  });
});

describe("clampAllocation", () => {
  it("membatasi isian ke sisa yang ada", () => {
    expect(clampAllocation(900000, 2000000, 400000, 1000000)).toBe(600000);
    expect(clampAllocation(100000, 2000000, 400000, 1000000)).toBe(100000);
    expect(clampAllocation(100000, 2000000, 2500000, 0)).toBe(0);
  });
});

describe("orderGoals", () => {
  it("tenggat terdekat dulu", () => {
    expect(orderGoals(goals).map((g) => g.id)).toEqual(["lamaran", "kuliah", "nikah"]);
  });
});
