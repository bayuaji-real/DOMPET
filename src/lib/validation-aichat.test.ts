import { describe, expect, it } from "vitest";
import { aiChatSchema } from "./validation";

describe("aiChatSchema", () => {
  it("jawaban Ruby panjang (rencana + strategi) diterima sebagai riwayat", () => {
    const r = aiChatSchema.safeParse({
      mode: "advisor",
      messages: [
        { role: "user", text: "halo" },
        { role: "model", text: "x".repeat(3000) },
        { role: "user", text: "oke" },
      ],
    });
    expect(r.success).toBe(true);
  });
  it("pesan pengguna tetap maksimal 1000 huruf, jawaban Ruby maksimal 4000", () => {
    expect(aiChatSchema.safeParse({ mode: "advisor", messages: [{ role: "user", text: "x".repeat(1001) }] }).success).toBe(false);
    expect(aiChatSchema.safeParse({ mode: "advisor", messages: [{ role: "model", text: "x".repeat(4001) }, { role: "user", text: "a" }] }).success).toBe(false);
  });
});
