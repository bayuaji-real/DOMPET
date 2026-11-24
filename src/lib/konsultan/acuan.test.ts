import { describe, expect, it } from "vitest";
import { daysOld, formatBenchmark, isStale } from "./acuan";

describe("acuan pasar", () => {
  it("memformat persen, rupiah, dan poin", () => {
    expect(formatBenchmark({ value: 6, unit: "persen", as_of: "2026-11-18" })).toBe("6%");
    expect(formatBenchmark({ value: 3.75, unit: "persen", as_of: "2026-11-18" })).toBe("3,75%");
    expect(formatBenchmark({ value: 18245, unit: "rupiah", as_of: "2026-11-17" })).toBe("Rp18.245");
    expect(formatBenchmark({ value: 5439.1, unit: "poin", as_of: "2026-11-17" })).toBe("5.439,1");
  });
  it("menandai angka usang setelah 45 hari", () => {
    expect(daysOld("2026-11-01", "2026-11-24")).toBe(23);
    expect(isStale("2026-11-01", "2026-11-24")).toBe(false);
    expect(isStale("2026-09-01", "2026-11-24")).toBe(true);
  });
});
