import { describe, expect, it } from "vitest";
import { billPushes, paymentPush, proExpiryPush } from "./alerts";

const NOW = Date.parse("2026-11-24T00:00:00Z");

describe("billPushes", () => {
  const row = (id: string, next_date: string) => ({ id, user_id: "u1", note: "Listrik", amount: 250000, next_date });
  it("hanya hari ini dan besok", () => {
    const r = billPushes([row("a", "2026-11-24"), row("b", "2026-11-25"), row("c", "2026-11-26"), row("d", "2026-11-23")], "2026-11-24");
    expect(r.map((x) => x.p.key)).toEqual(["a:2026-11-24:0", "b:2026-11-25:1"]);
    expect(r[0].p.msg.title).toMatch(/hari ini/);
    expect(r[1].p.msg.title).toMatch(/besok/);
  });
});

describe("proExpiryPush", () => {
  it("Pro berbayar sisa 2 hari memberi peringatan, sisa 10 hari tidak", () => {
    const soon = proExpiryPush({ plan: "pro", plan_expires_at: "2026-11-26T00:00:00Z", trial_plan: null, trial_ends_at: null }, NOW);
    expect(soon?.kind).toBe("pro_habis");
    expect(proExpiryPush({ plan: "pro", plan_expires_at: "2026-12-04T00:00:00Z", trial_plan: null, trial_ends_at: null }, NOW)).toBeNull();
  });
  it("sudah lewat tidak dikirim; masa coba berakhir besok dikirim", () => {
    expect(proExpiryPush({ plan: "pro", plan_expires_at: "2026-11-20T00:00:00Z", trial_plan: null, trial_ends_at: null }, NOW)).toBeNull();
    expect(proExpiryPush({ plan: "free", plan_expires_at: null, trial_plan: "pro", trial_ends_at: "2026-11-24T20:00:00Z" }, NOW)?.kind).toBe("coba_habis");
  });
});

describe("paymentPush", () => {
  it("dikonfirmasi dan ditolak punya pesan; status lain tidak", () => {
    expect(paymentPush("dikonfirmasi", 3, "x")?.msg.title).toMatch(/dikonfirmasi/);
    expect(paymentPush("ditolak", 3, "x")?.msg.url).toBe("/paket/bayar");
    expect(paymentPush("menunggu", 3, "x")).toBeNull();
  });
});
