import { describe, expect, it } from "vitest";
import { paydayReminderMsg } from "./payday-reminder";
import { shouldOfferPaydayReminder } from "../ai/reminder-offer";
import type { FinanceSummary } from "../ai/finance-summary";

const sum = (over: Partial<FinanceSummary> = {}): FinanceSummary =>
  ({
    today: "2026-11-27",
    totalBalance: 2_417_843,
    savingsBalance: 2_357_843,
    nextPayday: "2026-11-27",
    nextPaydayAmount: 4_885_714,
    paydaysPerMonth: 1,
    planFixedMonthly: 1_284_571,
    goals: [
      { name: "Lamaran", target: 6_000_000, saved: 1_772_353, deadline: "2026-12-25", monthly: 0 },
      { name: "Kuliah", target: 17_432_500, saved: 585_490, deadline: "2027-07-09", monthly: 0 },
    ],
    ...over,
  }) as FinanceSummary;

describe("pesan pengingat gajian", () => {
  it("menyebut gaji dan pembagian ke target, tanpa Rp0", () => {
    const m = paydayReminderMsg(sum(), "2026-11-27")!;
    expect(m.title).toContain("gajian");
    expect(m.body).toContain("Gaji Rp4.885.714");
    expect(m.body).toContain("taruh Rp3.661.143 ke Lamaran");
    expect(m.body).not.toContain("Kuliah");
    expect(m.body).not.toMatch(/Rp0\b/);
  });
  it("bukan hari gajian: tidak mengirim", () => {
    expect(paydayReminderMsg(sum({ nextPayday: "2026-12-27" }), "2026-11-27")).toBeNull();
  });
  it("tanpa sisa untuk dibagi: pesan singkat tanpa nominal Rp0", () => {
    const m = paydayReminderMsg(sum({ nextPaydayAmount: 1_000_000, totalBalance: 2_357_843 }), "2026-11-27")!;
    expect(m.body).toContain("belum ada sisa");
  });
  it("target banyak dipotong menjadi 4 baris", () => {
    const goals = Array.from({ length: 6 }, (_, i) => ({ name: `T${i + 1}`, target: 100_000, saved: 0, deadline: null, monthly: 100_000 }));
    const m = paydayReminderMsg(sum({ goals, totalBalance: 0, savingsBalance: 0 }), "2026-11-27")!;
    expect(m.body).toContain("dan 2 target lain");
  });
});

describe("tawaran pengingat", () => {
  const now = Date.parse("2026-11-27T01:00:00Z");
  const base = { enabled: false, offeredAt: null, nowMs: now, hasPayday: true, hasGoals: true };
  it("menawarkan bila belum pernah", () => expect(shouldOfferPaydayReminder(base)).toBe(true));
  it("tidak menawarkan bila sudah aktif, tanpa gaji, atau tanpa target", () => {
    expect(shouldOfferPaydayReminder({ ...base, enabled: true })).toBe(false);
    expect(shouldOfferPaydayReminder({ ...base, hasPayday: false })).toBe(false);
    expect(shouldOfferPaydayReminder({ ...base, hasGoals: false })).toBe(false);
  });
  it("jeda 3 hari sejak tawaran terakhir", () => {
    expect(shouldOfferPaydayReminder({ ...base, offeredAt: "2026-11-26T01:00:00Z" })).toBe(false);
    expect(shouldOfferPaydayReminder({ ...base, offeredAt: "2026-11-23T00:00:00Z" })).toBe(true);
  });
});
