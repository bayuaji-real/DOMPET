import { describe, expect, it } from "vitest";
import { buildRoadmap, roadmapToText } from "./roadmap";

const base = {
  today: "2026-11-26",
  totalBalance: 2_417_843,
  savingsBalance: 2_357_843,
  nextPayday: "2026-11-27",
  nextPaydayAmount: 4_885_714,
  perMonth: 1,
  fixedMonthly: 1_284_571,
};
const goals = [
  { name: "Lamaran", target: 6_000_000, saved: 1_772_353, deadline: "2026-12-25", monthly: 0 },
  { name: "Kuliah", target: 17_432_500, saved: 585_490, deadline: "2027-07-09", monthly: 0 },
  { name: "Nikah", target: 10_000_000, saved: 0, deadline: "2027-12-25", monthly: 770_000 },
];

describe("rencana jangka panjang Ruby", () => {
  it("tanpa gaji terjadwal tidak memproyeksikan", () => {
    const r = buildRoadmap({ ...base, nextPaydayAmount: 0, goals });
    expect(r.projectable).toBe(false);
    expect(roadmapToText(r)).toContain("belum bisa diproyeksikan");
  });

  it("urut tenggat: Lamaran lunas lebih dulu tetapi terlambat, uang mengalir ke Kuliah", () => {
    const r = buildRoadmap({ ...base, goals });
    const lam = r.goals.find((g) => g.name === "Lamaran")!;
    expect(lam.doneDate).toBe("2026-12-27");
    expect(lam.lateDays).toBe(2);
    expect(r.steps[0].gives[0].name).toBe("Lamaran");
    expect(r.steps[1].gives.map((g) => g.name)).toContain("Kuliah");
    expect(r.totalRemaining).toBe(4_227_647 + 16_847_010 + 10_000_000);
  });

  it("menghitung tambahan per gajian agar semua tepat waktu, dan tambahan itu memang cukup", () => {
    const r = buildRoadmap({ ...base, goals });
    expect(r.extraPerPaydayToBeOnTime).toBeGreaterThan(0);
    const again = buildRoadmap({ ...base, nextPaydayAmount: base.nextPaydayAmount + (r.extraPerPaydayToBeOnTime ?? 0), goals });
    expect(again.goals.every((g) => g.lateDays === 0 && g.doneDate)).toBe(true);
    const less = buildRoadmap({ ...base, nextPaydayAmount: base.nextPaydayAmount + (r.extraPerPaydayToBeOnTime ?? 0) - 20_000, goals });
    expect(less.goals.some((g) => g.lateDays > 0)).toBe(true);
  });

  it("kemampuan cukup: strategi bilang sudah cukup", () => {
    const r = buildRoadmap({ ...base, goals: [{ name: "Liburan", target: 1_000_000, saved: 0, deadline: "2027-06-01", monthly: 0 }] });
    expect(r.extraPerPaydayToBeOnTime).toBe(0);
    expect(roadmapToText(r)).toContain("sudah cukup");
  });

  it("target tanpa tenggat tetap diberi perkiraan lunas", () => {
    const r = buildRoadmap({ ...base, goals: [{ name: "Dana darurat", target: 20_000_000, saved: 0, deadline: null, monthly: 0 }] });
    expect(r.goals[0].doneDate).not.toBeNull();
    expect(roadmapToText(r)).toContain("lunas ±");
  });

  it("dua mingguan memakai jarak 14 hari", () => {
    const r = buildRoadmap({ ...base, perMonth: 2.17, nextPaydayAmount: 2_400_000, fixedMonthly: 1_000_000, goals: [{ name: "A", target: 5_000_000, saved: 0, deadline: null, monthly: 0 }] });
    expect(r.steps[1].date).toBe("2026-12-11");
  });
});

describe("tambahan sekali", () => {
  it("tambahan sekali di gajian pertama tidak lebih besar dari tambahan tiap gajian dan cukup", () => {
    const r = buildRoadmap({ ...base, goals });
    expect(r.extraOnceToBeOnTime).not.toBeNull();
    expect(r.extraOnceToBeOnTime!).toBeGreaterThanOrEqual(r.extraPerPaydayToBeOnTime!);
    expect(roadmapToText(r)).toContain("SEKALI");
  });
});

describe("teks jadwal", () => {
  it("menggabungkan gajian yang pembagiannya sama dan tidak menulis Rp0", () => {
    const t = roadmapToText(buildRoadmap({ ...base, goals }));
    expect(t).toContain("sampai");
    expect(t.split("\n").slice(5).join("\n")).not.toMatch(/Rp0\b/);
  });
});
