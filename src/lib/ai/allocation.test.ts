import { describe, expect, it } from "vitest";
import { allocationToText, buildAllocation, daysBetween, paydaysUntil } from "./allocation";

const base = {
  today: "2026-11-26",
  totalBalance: 2_417_843,
  savingsBalance: 2_357_843,
  nextPayday: "2026-11-27",
  nextPaydayAmount: 4_885_714,
  perMonth: 1,
  fixedMonthly: 1_284_571,
};

describe("alokasi uang Ruby", () => {
  it("memisahkan uang bebas dari uang terikat di tabungan", () => {
    const a = buildAllocation({ ...base, goals: [] });
    expect(a.freeMoney).toBe(60_000);
    expect(a.lockedInSavings).toBe(2_357_843);
    expect(a.pool).toBe(60_000 + 4_885_714 - 1_284_571);
  });

  it("target tenggat dekat didahulukan dan kekurangan dihitung", () => {
    const a = buildAllocation({
      ...base,
      goals: [
        { name: "Kuliah", target: 17_432_500, saved: 585_490, deadline: "2027-08-01", monthly: 0 },
        { name: "Lamaran", target: 6_000_000, saved: 1_772_353, deadline: "2026-12-25", monthly: 0 },
      ],
    });
    expect(a.goals[0].name).toBe("Lamaran");
    expect(a.goals[0].status).toBe("dekat");
    expect(a.goals[0].paydaysLeft).toBe(1);
    expect(a.goals[0].neededPerPayday).toBe(4_227_647);
    expect(a.goals[0].allocated).toBe(a.pool);
    expect(a.goals[0].shortfall).toBe(4_227_647 - a.pool);
    expect(a.goals[1].allocated).toBe(0);
    expect(a.leftover).toBe(0);
  });

  it("target tanpa tenggat memakai setoran rencana dan tidak dianggap mendesak", () => {
    const a = buildAllocation({ ...base, goals: [{ name: "Dana darurat", target: 10_000_000, saved: 0, deadline: null, monthly: 500_000 }] });
    expect(a.goals[0].status).toBe("tanpa-tenggat");
    expect(a.goals[0].allocated).toBe(500_000);
  });

  it("target tercapai dan tenggat lewat ditandai", () => {
    const a = buildAllocation({
      ...base,
      goals: [
        { name: "Selesai", target: 1_000_000, saved: 1_000_000, deadline: "2026-12-01", monthly: 0 },
        { name: "Telat", target: 1_000_000, saved: 0, deadline: "2026-11-01", monthly: 0 },
      ],
    });
    expect(a.goals.find((g) => g.name === "Selesai")?.status).toBe("tercapai");
    expect(a.goals.find((g) => g.name === "Telat")?.status).toBe("lewat");
  });

  it("tanpa gaji terjadwal, hanya uang bebas yang dibagi", () => {
    const a = buildAllocation({ ...base, nextPaydayAmount: 0, goals: [] });
    expect(a.pool).toBe(60_000);
  });

  it("menghitung jumlah gajian sampai tenggat (bulanan dan dua mingguan)", () => {
    expect(paydaysUntil("2026-11-27", "2026-12-25", 1)).toBe(1);
    expect(paydaysUntil("2026-11-27", "2027-02-27", 1)).toBe(4);
    expect(paydaysUntil("2026-11-27", "2026-12-25", 2.17)).toBe(3);
    expect(paydaysUntil(null, "2026-12-25", 1)).toBe(1);
    expect(daysBetween("2026-11-26", "2026-12-25")).toBe(29);
  });

  it("teks prompt memuat uang bebas, tanda dekat tenggat, dan kekurangan", () => {
    const a = buildAllocation({ ...base, goals: [{ name: "Lamaran", target: 6_000_000, saved: 1_772_353, deadline: "2026-12-25", monthly: 0 }] });
    const t = allocationToText(a, base.nextPayday);
    expect(t).toContain("Uang bebas (di luar tabungan): Rp60.000");
    expect(t).toContain("DEKAT TENGGAT");
    expect(t).toContain("KURANG");
  });
});
