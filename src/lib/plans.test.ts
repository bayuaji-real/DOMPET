import { describe, it, expect } from "vitest";
import { canUse, parseEntitlement, trialDaysLeft, upgradeMessage, trialErrorMessage, FEATURE_MIN_PLAN, type FeatureKey } from "./plans";

describe("plans", () => {
  it("Gratis tidak boleh memakai fitur AI", () => {
    for (const k of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) {
      if (k.startsWith("ai_")) expect(canUse("free", k)).toBe(false);
    }
  });
  it("Gratis tidak boleh fitur berbayar mana pun (tidak ada paket Premium lagi)", () => {
    for (const k of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) {
      expect(["free", "pro"]).toContain(FEATURE_MIN_PLAN[k]);
    }
    expect(canUse("free", "proyeksi_arus_kas")).toBe(false);
    expect(canUse("free", "info_pasar")).toBe(false);
    expect(canUse("free", "portofolio")).toBe(false);
  });
  it("Pro boleh semua", () => {
    for (const k of Object.keys(FEATURE_MIN_PLAN) as FeatureKey[]) expect(canUse("pro", k)).toBe(true);
  });
  it("fitur gratis memang terbuka untuk semua", () => {
    expect(canUse("free", "kalkulator_investasi")).toBe(true);
    expect(canUse("free", "laporan_mingguan")).toBe(true);
    expect(canUse("free", "kalkulator_zakat")).toBe(true);
  });
  it("parseEntitlement: data rusak jadi Gratis aman", () => {
    const e = parseEntitlement(null);
    expect(e.plan).toBe("free");
    expect(e.aiLimit).toBe(0);
    expect(e.trialAvailable).toEqual({ premium: false, pro: false });
    expect(parseEntitlement({ plan: "admin", ai_limit: -5, ai_used: "x" }).plan).toBe("free");
  });
  it("parseEntitlement: data normal", () => {
    const e = parseEntitlement({ plan: "pro", source: "trial", trial_ends_at: "2026-12-01T00:00:00Z", ai_used: 30, ai_limit: 100, trial_available: { premium: true, pro: false } });
    expect(e.plan).toBe("pro");
    expect(e.source).toBe("trial");
    expect(e.aiRemaining).toBe(70);
    expect(e.trialAvailable).toEqual({ premium: true, pro: false });
  });
  it("sisa AI tidak negatif", () => {
    expect(parseEntitlement({ plan: "premium", ai_used: 120, ai_limit: 100 }).aiRemaining).toBe(0);
  });
  it("trialDaysLeft", () => {
    const now = new Date("2026-11-24T00:00:00Z");
    expect(trialDaysLeft(null, now)).toBe(0);
    expect(trialDaysLeft("2026-11-23T00:00:00Z", now)).toBe(0);
    expect(trialDaysLeft("2026-11-24T10:00:00Z", now)).toBe(1);
    expect(trialDaysLeft("2026-12-01T00:00:00Z", now)).toBe(7);
    expect(trialDaysLeft("bukan-tanggal", now)).toBe(0);
  });
  it("pesan ramah tanpa istilah teknis", () => {
    expect(upgradeMessage("ai_chat")).toContain("Pro");
    expect(trialErrorMessage("UJICOBA_SUDAH_DIPAKAI")).toContain("sudah pernah");
    expect(trialErrorMessage("apa saja")).not.toMatch(/supabase|rpc|sql/i);
  });
});
