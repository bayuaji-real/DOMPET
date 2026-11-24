import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

import { guardAi } from "./entitlement";

const cicip = (o: Record<string, { remaining: number; per?: string }>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { limit: 2, used: 2 - v.remaining, remaining: v.remaining, per: v.per ?? "hari" }]));

describe("guardAi: Basic, jatah cicip", () => {
  beforeEach(() => rpc.mockReset());

  it("Basic dengan sisa jatah boleh", async () => {
    rpc.mockResolvedValue({ data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 1 } }) }, error: null });
    const g = await guardAi("ai_struk", "u1");
    expect(g.ok).toBe(true);
  });
  it("Basic jatah habis ditolak 402 dengan pesan ramah", async () => {
    rpc.mockResolvedValue({ data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 0 } }) }, error: null });
    const g = await guardAi("ai_struk", "u1");
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.response.status).toBe(402);
      expect((await g.response.json()).code).toBe("JATAH_HABIS");
    }
  });
  it("Split Bill (tanpa cicip) ditolak untuk Basic walau jatah masih ada", async () => {
    rpc.mockResolvedValue({ data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 2 } }) }, error: null });
    const g = await guardAi("ai_struk", "u1", undefined, true);
    expect(g.ok).toBe(false);
    if (!g.ok) expect((await g.response.json()).code).toBe("BUTUH_PAKET");
  });
  it("jenis jatah mengikuti logFeature (tabungan lewat chat)", async () => {
    rpc.mockResolvedValue({ data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ konsultasi: { remaining: 0 }, tabungan: { remaining: 3 } }) }, error: null });
    expect((await guardAi("ai_chat", "u1", "tabungan")).ok).toBe(true);
    expect((await guardAi("ai_chat", "u1", "konsultasi")).ok).toBe(false);
  });
  it("Basic tanpa data cicip (galat server) ditolak, bukan lolos", async () => {
    rpc.mockResolvedValue({ data: { plan: "free", ai_limit: 0, ai_used: 0 }, error: null });
    expect((await guardAi("ai_suara", "u1")).ok).toBe(false);
  });
  it("Pro tidak memakai jatah cicip tetapi tetap dibatasi kuota bulanan", async () => {
    rpc.mockResolvedValue({ data: { plan: "pro", ai_limit: 1000, ai_used: 10, cicip: {} }, error: null });
    expect((await guardAi("ai_chat", "u1")).ok).toBe(true);
    rpc.mockResolvedValue({ data: { plan: "pro", ai_limit: 1000, ai_used: 1000, cicip: {} }, error: null });
    const g = await guardAi("ai_chat", "u1");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(429);
  });
  it("gagal cek paket = ditolak 503", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    const g = await guardAi("ai_chat", "u1");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(503);
  });
});
