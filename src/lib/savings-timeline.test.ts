import { describe, expect, it } from "vitest";
import { buildSavingsTimeline, parseParentsAmount } from "./savings-timeline";

const goals = [
  { id: "a", name: "Lamaran", target: 6_000_000, saved: 2_100_000, priority: 1, deadline: "2026-12-25" },
  { id: "b", name: "Kuliah", target: 17_432_500, saved: 1_077_000, priority: 2, deadline: null },
];

describe("parseParentsAmount", () => {
  it("membaca nominal dari catatan", () => {
    expect(parseParentsAmount("Kasih ortu Rp1.000.000")).toBe(1_000_000);
    expect(parseParentsAmount("Gaji biasa")).toBe(0);
    expect(parseParentsAmount(null)).toBe(0);
  });
});

describe("buildSavingsTimeline", () => {
  const paydays = [
    { date: "2026-11-13", income: 2_500_000, done: true, parents: 0 },
    { date: "2026-11-27", income: 2_000_000, done: false, parents: 0 },
    { date: "2026-12-11", income: 2_500_000, done: false, parents: 0 },
    { date: "2026-12-25", income: 2_000_000, done: false, parents: 0 },
  ];
  const charges = [{ name: "Claude Pro", amount: 416_000, dayOfMonth: 26 }];
  const r = buildSavingsTimeline({ goals, paydays, livingCost: 400_000, charges, today: "2026-11-20" });

  it("gajian yang sudah lewat tidak menambah saldo", () => {
    expect(r.entries[0].done).toBe(true);
    expect(r.entries[0].balance.a).toBe(2_100_000);
  });
  it("tagihan tanggal 26 dibebankan ke gajian 27 Nov (gajian 13 Nov sudah lewat)", () => {
    const e = r.entries[1];
    expect(e.isNext).toBe(true);
    expect(e.charges[0].amount).toBe(416_000);
    expect(e.free).toBe(2_000_000 - 400_000 - 416_000);
    expect(e.add.a).toBe(1_184_000);
  });
  it("tagihan Des dibebankan ke gajian 25 Des (terakhir sebelum tgl 26)", () => {
    expect(r.entries[3].charges.length).toBe(1);
    expect(r.entries[2].charges.length).toBe(0);
  });
  it("Lamaran penuh pada 25 Des 2026 dan sisa uang mengalir ke Kuliah", () => {
    expect(r.eta.a).toBe("2026-12-25");
    expect(r.entries[3].balance.a).toBeGreaterThanOrEqual(6_000_000);
    expect(r.entries[3].balance.a).toBeLessThan(6_050_000); // pembulatan ke atas Rp50.000
    expect(r.entries[3].add.b).toBeGreaterThan(0);
  });
  it("target yang sudah penuh ditandai done", () => {
    const r2 = buildSavingsTimeline({
      goals: [{ ...goals[0], saved: 6_000_000 }],
      paydays, livingCost: 400_000, charges: [], today: "2026-11-20",
    });
    expect(r2.eta.a).toBe("done");
  });
});

import { balanceAt, buildGoalSeries, seriesEnd } from "./savings-timeline";

describe("deret per tabungan", () => {
  const goals = [{ id: "a", name: "A", target: 300000, saved: 0, priority: 1, deadline: null }];
  const paydays = [
    { date: "2026-12-01", income: 500000, done: false, parents: 0 },
    { date: "2026-12-15", income: 500000, done: false, parents: 0 },
  ];
  const r = buildSavingsTimeline({ goals, paydays, livingCost: 200000, charges: [], today: "2026-11-20" });

  it("saldo sebelum gajian = saldo awal, sesudahnya naik", () => {
    expect(balanceAt(r.entries, "a", 0, "2026-11-30")).toBe(0);
    expect(balanceAt(r.entries, "a", 0, "2026-12-01")).toBe(300000);
  });
  it("harian, mingguan, bulanan berakhir di tanggal penuh dengan saldo sama", () => {
    const end = seriesEnd(r.entries, r.eta.a, "2026-11-20");
    expect(end).toBe("2026-12-01");
    for (const g of ["day", "week", "month"] as const) {
      const s = buildGoalSeries(r.entries, "a", 0, "2026-11-20", end, g);
      expect(s[0].date).toBe("2026-11-20");
      expect(s[s.length - 1]).toMatchObject({ date: "2026-12-01", balance: 300000 });
      expect(s.reduce((x, p) => x + p.added, 0)).toBe(300000);
    }
    expect(buildGoalSeries(r.entries, "a", 0, "2026-11-20", end, "day")).toHaveLength(12);
  });
});
