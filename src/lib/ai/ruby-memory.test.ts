import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ai/gemini", () => ({
  usageOf: () => ({ model: "m", inputTokens: 1000, outputTokens: 100 }),
  estimateCostIdr: () => 0.5,
  generateJson: vi.fn(async () => ({
    summary: "Pengguna sedang menabung untuk menikah.",
    facts: [
      { key: "gaji bulanan", value: "Rp8.000.000", said_at: "2026-11-26" },
      { key: "", value: "kosong", said_at: "2026-11-26" },
      { key: "tanggal rusak", value: "x", said_at: "kemarin" },
    ],
  })),
}));

import { memoryToText, loadMemory, refreshMemoryIfDue, saveTurn, MEMORY_REFRESH_EVERY } from "./ruby-memory";
import { generateJson } from "@/lib/ai/gemini";

/** Klien palsu: tiap tabel punya hasil tetap; query bisa dirantai. */
function fakeDb(tables: Record<string, { data?: unknown; error?: { message: string } | null }>, spy?: { upserts: unknown[] }) {
  const chain = (t: string) => {
    const res = { data: tables[t]?.data ?? null, error: tables[t]?.error ?? null };
    const q: Record<string, unknown> = {};
    for (const m of ["select", "order", "limit", "gt", "eq", "is", "insert", "update"]) q[m] = () => q;
    q.maybeSingle = async () => res;
    q.single = async () => res;
    q.upsert = async (row: unknown) => {
      spy?.upserts.push(row);
      return { error: null };
    };
    q.then = (ok: (r: typeof res) => unknown) => Promise.resolve(res).then(ok);
    return q;
  };
  return { from: (t: string) => chain(t) } as never;
}

describe("memoryToText", () => {
  it("kosong bila belum ada memori", () => {
    expect(memoryToText({ summary: "", facts: [], summarizedUntil: null })).toBe("");
  });
  it("memuat ringkasan, fakta bertanggal, dan aturan data hidup menang", () => {
    const t = memoryToText({
      summary: "Menabung untuk menikah.",
      facts: [{ key: "gaji bulanan", value: "Rp8.000.000", said_at: "2026-11-26" }],
      summarizedUntil: null,
    });
    expect(t).toContain("Menabung untuk menikah.");
    expect(t).toContain("gaji bulanan: Rp8.000.000 (disebut 2026-11-26)");
    expect(t).toContain("data keuangan itulah yang benar");
  });
});

describe("loadMemory", () => {
  it("tidak melempar saat database gagal", async () => {
    const m = await loadMemory(fakeDb({ ruby_memory: { error: { message: "boom" } } }));
    expect(m).toEqual({ summary: "", facts: [], summarizedUntil: null });
  });
});

describe("refreshMemoryIfDue", () => {
  const msgs = (n: number) =>
    Array.from({ length: n * 2 }, (_, i) => ({ role: i % 2 ? "model" : "user", text: `p${i}`, created_at: `2026-11-26T10:${String(i).padStart(2, "0")}:00Z` }));

  it("belum memperbarui bila pesan pengguna kurang dari batas", async () => {
    vi.mocked(generateJson).mockClear();
    const spy = { upserts: [] as unknown[] };
    await refreshMemoryIfDue(fakeDb({ ruby_memory: { data: null }, ruby_messages: { data: msgs(MEMORY_REFRESH_EVERY - 1) } }, spy), "u1", "2026-11-26");
    expect(generateJson).not.toHaveBeenCalled();
    expect(spy.upserts).toHaveLength(0);
  });

  it("memperbarui saat mencapai batas pesan pengguna, membuang fakta tidak valid", async () => {
    const spy = { upserts: [] as unknown[] };
    await refreshMemoryIfDue(fakeDb({ ruby_memory: { data: null }, ruby_messages: { data: msgs(MEMORY_REFRESH_EVERY) } }, spy), "u1", "2026-11-26");
    expect(spy.upserts).toHaveLength(1);
    const row = spy.upserts[0] as { user_id: string; facts: { key: string; said_at: string }[]; summarized_until: string };
    expect(row.user_id).toBe("u1");
    expect(row.facts.map((f) => f.key)).toEqual(["gaji bulanan", "tanggal rusak"]);
    expect(row.facts[1].said_at).toBe("2026-11-26"); // tanggal rusak diganti hari ini
    expect(row.summarized_until).toBe(`2026-11-26T10:${String(MEMORY_REFRESH_EVERY * 2 - 1).padStart(2, "0")}:00Z`);
  });

  it("tidak melempar saat model gagal", async () => {
    vi.mocked(generateJson).mockRejectedValueOnce(new Error("503"));
    await expect(
      refreshMemoryIfDue(fakeDb({ ruby_memory: { data: null }, ruby_messages: { data: msgs(MEMORY_REFRESH_EVERY) } }), "u1", "2026-11-26")
    ).resolves.toBeUndefined();
  });
});

describe("saveTurn", () => {
  it("mengembalikan null (bukan error) bila thread tidak bisa dibuat", async () => {
    const id = await saveTurn(fakeDb({ ruby_threads: { data: null, error: { message: "ditolak" } } }), "advisor", undefined, "halo", "hai");
    expect(id).toBeNull();
  });
});
