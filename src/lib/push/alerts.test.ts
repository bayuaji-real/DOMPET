import { describe, expect, it } from "vitest";
import { apiPush, limitPushes } from "./alerts";
import { limitStatus, type Limit } from "@/lib/konsultan/spend-limit";

const base = { configured: true, used_pct: 75, days_left: 6, remaining_idr: 250000 };
describe("pesan push", () => {
  it("API aman atau belum diatur tidak mengirim apa pun", () => {
    expect(apiPush({ ...base, level: "aman" }, "2026-11-24")).toBeNull();
    expect(apiPush({ ...base, configured: false, level: "belum_diatur" }, "2026-11-24")).toBeNull();
  });
  it("API menipis, kritis, habis mengirim dengan kunci harian per tingkat", () => {
    const a = apiPush({ ...base, level: "waspada" }, "2026-11-24");
    expect(a?.key).toBe("waspada:2026-11-24");
    expect(a?.msg.url).toBe("/admin");
    expect(apiPush({ ...base, level: "kritis" }, "2026-11-24")?.key).toBe("kritis:2026-11-24");
    expect(apiPush({ ...base, level: "habis" }, "2026-11-24")?.msg.title).toMatch(/habis/i);
  });
  it("batas pengeluaran: hanya yang hampir atau lewat, kunci per periode", () => {
    const lim: Limit = { id: "L1", name: "Makan", period: "harian", amount: 50000, category_ids: [], warn_pct: 80, is_active: true };
    const tx = (a: number) => [{ type: "expense", amount: a, date: "2026-11-24", category_id: null }];
    expect(limitPushes([limitStatus(lim, tx(10000), "2026-11-24")])).toHaveLength(0);
    const near = limitPushes([limitStatus(lim, tx(45000), "2026-11-24")]);
    expect(near[0].key).toBe("L1:2026-11-24:hampir");
    const over = limitPushes([limitStatus(lim, tx(60000), "2026-11-24")]);
    expect(over[0].key).toBe("L1:2026-11-24:lewat");
    expect(over[0].msg.title).toMatch(/terlewati/);
  });
});
