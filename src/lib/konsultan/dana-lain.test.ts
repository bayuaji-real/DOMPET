import { describe, expect, it } from "vitest";
import { FUND_TYPES, fundPlan } from "./dana-lain";

describe("dana lain", () => {
  it("punya jenis dana dengan nama unik dan saran", () => {
    expect(new Set(FUND_TYPES.map((f) => f.id)).size).toBe(FUND_TYPES.length);
    expect(FUND_TYPES.map((f) => f.id)).toEqual(expect.arrayContaining(["kesehatan", "pendidikan", "rumah"]));
    for (const f of FUND_TYPES) expect(f.tips.length).toBeGreaterThan(0);
  });
  it("tanpa inflasi dan tanpa imbal hasil: setoran = biaya dibagi bulan", () => {
    const r = fundPlan({ costNow: 12_000_000, years: 1, inflationPct: 0, returnPct: 0, saved: 0 });
    expect(r.monthlySaving).toBe(1_000_000);
    expect(r.futureCost).toBe(12_000_000);
  });
  it("inflasi menaikkan biaya dan setoran", () => {
    const a = fundPlan({ costNow: 100_000_000, years: 10, inflationPct: 0, returnPct: 5, saved: 0 });
    const b = fundPlan({ costNow: 100_000_000, years: 10, inflationPct: 8, returnPct: 5, saved: 0 });
    expect(b.futureCost).toBeGreaterThan(a.futureCost);
    expect(b.monthlySaving).toBeGreaterThan(a.monthlySaving);
  });
  it("dana yang sudah ada mengurangi setoran, dan bisa membuat setoran nol", () => {
    const none = fundPlan({ costNow: 50_000_000, years: 5, inflationPct: 5, returnPct: 5, saved: 0 });
    const some = fundPlan({ costNow: 50_000_000, years: 5, inflationPct: 5, returnPct: 5, saved: 20_000_000 });
    expect(some.monthlySaving).toBeLessThan(none.monthlySaving);
    expect(fundPlan({ costNow: 10_000_000, years: 5, inflationPct: 0, returnPct: 5, saved: 50_000_000 }).monthlySaving).toBe(0);
  });
  it("isian tidak valid ditolak", () => {
    expect(fundPlan({ costNow: 0, years: 5, inflationPct: 5, returnPct: 5, saved: 0 }).valid).toBe(false);
    expect(fundPlan({ costNow: 1000, years: 0, inflationPct: 5, returnPct: 5, saved: 0 }).valid).toBe(false);
  });
});
