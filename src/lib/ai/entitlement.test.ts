import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));

import { guardAi, logAi, resetAiControlsCache } from "./entitlement";

const cicip = (o: Record<string, { remaining: number; per?: string }>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { limit: 2, used: 2 - v.remaining, remaining: v.remaining, per: v.per ?? "hari" }]));

describe("guardAi: Saklar AI & Batas Anggaran", () => {
  let seq = 0;
  let u = "u0";

  beforeEach(() => {
    rpc.mockReset();
    insert.mockReset();
    resetAiControlsCache();
    u = `u_guard_${++seq}`;
  });

  it("Lapis 1: master_kill_switch aktif -> tolak 503", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: true, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 0, cicip: {} }, error: null };
    });

    const g = await guardAi("ai_chat", u);
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.response.status).toBe(503);
      const json = await g.response.json();
      expect(json.code).toBe("AI_OFF");
      expect(json.error).toMatch(/Layanan AI sedang diistirahatkan sementara/i);
    }
  });

  it("Lapis 2: saklar fitur mati -> tolak 503 untuk fitur tersebut", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return {
          data: {
            master_kill_switch: false,
            basic_ai_disabled_at_100pct: true,
            pro_hard_limit_enabled: false,
            feature_toggles: { struk: false, konsultasi: true },
            budget_exhausted: false,
          },
          error: null,
        };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 0, cicip: {} }, error: null };
    });

    // Struk dimatikan
    const gStruk = await guardAi("ai_struk", u);
    expect(gStruk.ok).toBe(false);
    if (!gStruk.ok) {
      expect(gStruk.response.status).toBe(503);
      const json = await gStruk.response.json();
      expect(json.code).toBe("FITUR_AI_OFF");
      expect(json.error).toMatch(/Foto struk/i);
    }

    // Chat tetap diizinkan
    const gChat = await guardAi("ai_chat", u);
    expect(gChat.ok).toBe(true);
  });

  it("Lapis 3: Anggaran 100% -> Basic ditolak 429, Pro tetap jalan", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return {
          data: {
            master_kill_switch: false,
            basic_ai_disabled_at_100pct: true,
            pro_hard_limit_enabled: false,
            feature_toggles: {},
            budget_exhausted: true,
          },
          error: null,
        };
      }
      // User Basic
      return { data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ konsultasi: { remaining: 2 } }) }, error: null };
    });

    const gBasic = await guardAi("ai_chat", u);
    expect(gBasic.ok).toBe(false);
    if (!gBasic.ok) {
      expect(gBasic.response.status).toBe(429);
      const json = await gBasic.response.json();
      expect(json.code).toBe("ANGGARAN_AI_HABIS");
    }

    // Untuk Pro, tetap lolos saat pro_hard_limit_enabled = false
    resetAiControlsCache();
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return {
          data: {
            master_kill_switch: false,
            basic_ai_disabled_at_100pct: true,
            pro_hard_limit_enabled: false,
            feature_toggles: {},
            budget_exhausted: true,
          },
          error: null,
        };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 10, cicip: {} }, error: null };
    });

    const gPro = await guardAi("ai_chat", u);
    expect(gPro.ok).toBe(true);
  });

  it("Lapis 3: Anggaran 100% + pro_hard_limit_enabled aktif -> Pro juga ditolak 429", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return {
          data: {
            master_kill_switch: false,
            basic_ai_disabled_at_100pct: true,
            pro_hard_limit_enabled: true,
            feature_toggles: {},
            budget_exhausted: true,
          },
          error: null,
        };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 10, cicip: {} }, error: null };
    });

    const gPro = await guardAi("ai_chat", u);
    expect(gPro.ok).toBe(false);
    if (!gPro.ok) {
      expect(gPro.response.status).toBe(429);
      const json = await gPro.response.json();
      expect(json.code).toBe("ANGGARAN_AI_HABIS");
      expect(json.error).toMatch(/batas maksimal/i);
    }
  });

  it("Graceful degradation: galat baca get_ai_runtime_guard tetap mengizinkan bawaan", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: null, error: { message: "connection timeout" } };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 10, cicip: {} }, error: null };
    });

    const g = await guardAi("ai_chat", u);
    expect(g.ok).toBe(true);
  });

  it("logAi mencatat status failed dengan cost_idr = 0", async () => {
    insert.mockResolvedValue({ error: null });
    await logAi("ai_struk", { inputTokens: 50, outputTokens: 20 }, "failed");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "struk",
        cost_idr: 0,
        status: "failed",
      })
    );
  });
});

describe("guardAi: Basic, jatah cicip (regresi)", () => {
  let seq = 0;
  let u = "u0";
  beforeEach(() => {
    rpc.mockReset();
    resetAiControlsCache();
    u = `u_regresi_${++seq}`;
  });

  it("Basic dengan sisa jatah boleh", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 1 } }) }, error: null };
    });
    const g = await guardAi("ai_struk", u);
    expect(g.ok).toBe(true);
  });

  it("Basic jatah habis ditolak 402 dengan pesan ramah", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 0 } }) }, error: null };
    });
    const g = await guardAi("ai_struk", u);
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.response.status).toBe(402);
      expect((await g.response.json()).code).toBe("JATAH_HABIS");
    }
  });

  it("Split Bill (tanpa cicip) ditolak untuk Basic walau jatah masih ada", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ struk: { remaining: 2 } }) }, error: null };
    });
    const g = await guardAi("ai_struk", u, undefined, true);
    expect(g.ok).toBe(false);
    if (!g.ok) expect((await g.response.json()).code).toBe("BUTUH_PAKET");
  });

  it("jenis jatah mengikuti logFeature (tabungan lewat chat)", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "free", ai_limit: 0, ai_used: 0, cicip: cicip({ konsultasi: { remaining: 0 }, tabungan: { remaining: 3 } }) }, error: null };
    });
    expect((await guardAi("ai_chat", u, "tabungan")).ok).toBe(true);
    expect((await guardAi("ai_chat", u, "konsultasi")).ok).toBe(false);
  });

  it("Basic tanpa data cicip (galat server) ditolak, bukan lolos", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "free", ai_limit: 0, ai_used: 0 }, error: null };
    });
    expect((await guardAi("ai_suara", u)).ok).toBe(false);
  });

  it("Pro tidak memakai jatah cicip tetapi tetap dibatasi kuota bulanan", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 10, cicip: {} }, error: null };
    });
    expect((await guardAi("ai_chat", u)).ok).toBe(true);

    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 1000, cicip: {} }, error: null };
    });
    const g = await guardAi("ai_chat", u);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(429);
  });

  it("gagal cek paket = ditolak 503", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: null, error: { message: "x" } };
    });
    const g = await guardAi("ai_chat", u);
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(503);
  });

  it("serangan: 20 permintaan AI paralel dari satu akun, yang lolos dibatasi 8 per menit", async () => {
    rpc.mockImplementation(async (name) => {
      if (name === "get_ai_runtime_guard") {
        return { data: { master_kill_switch: false, basic_ai_disabled_at_100pct: true, pro_hard_limit_enabled: false, feature_toggles: {}, budget_exhausted: false }, error: null };
      }
      return { data: { plan: "pro", ai_limit: 1000, ai_used: 0, cicip: {} }, error: null };
    });
    const hasil = await Promise.all(Array.from({ length: 20 }, () => guardAi("ai_chat", "penyerang_baru")));
    expect(hasil.filter((g) => g.ok).length).toBe(8);
    const ditolak = hasil.find((g) => !g.ok);
    if (ditolak && !ditolak.ok) expect(ditolak.response.status).toBe(429);
  });
});
