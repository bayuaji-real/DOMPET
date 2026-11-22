import { describe, it, expect } from "vitest";
import { assertSafeSeedEnv, extractProjectRef, parseBlockedRefs } from "./seed-guard";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://stagingref123.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
  SEED_CONFIRM_STAGING: "yes",
  SEED_BLOCKED_PROJECT_REFS: "prodref999, otherprod",
};

describe("seed-guard", () => {
  it("mengambil ref dari URL", () => {
    expect(extractProjectRef("https://AbC123.supabase.co")).toBe("abc123");
    expect(extractProjectRef("https://example.com")).toBeNull();
    expect(extractProjectRef("bukan url")).toBeNull();
  });

  it("parse daftar ref terlarang", () => {
    expect(parseBlockedRefs(" A, b ,,")).toEqual(["a", "b"]);
    expect(parseBlockedRefs(undefined)).toEqual([]);
  });

  it("lolos untuk staging", () => {
    expect(assertSafeSeedEnv(base).url).toBe(base.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("menolak bila URL atau key kosong (tanpa nilai bawaan)", () => {
    expect(() => assertSafeSeedEnv({ ...base, NEXT_PUBLIC_SUPABASE_URL: "" })).toThrow();
    expect(() => assertSafeSeedEnv({ ...base, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow();
  });

  it("menolak tanpa konfirmasi staging", () => {
    expect(() => assertSafeSeedEnv({ ...base, SEED_CONFIRM_STAGING: undefined })).toThrow(/CONFIRM/);
    expect(() => assertSafeSeedEnv({ ...base, SEED_CONFIRM_STAGING: "true" })).toThrow(/CONFIRM/);
  });

  it("menolak bila daftar ref terlarang kosong", () => {
    expect(() => assertSafeSeedEnv({ ...base, SEED_BLOCKED_PROJECT_REFS: "" })).toThrow(/BLOCKED/);
  });

  it("menolak ref database utama tanpa membocorkan ref", () => {
    const env = { ...base, NEXT_PUBLIC_SUPABASE_URL: "https://ProdRef999.supabase.co" };
    try {
      assertSafeSeedEnv(env);
      throw new Error("harusnya gagal");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/database utama/);
      expect(msg).not.toMatch(/prodref999/i);
    }
  });

  it("menolak URL tak dikenali", () => {
    expect(() => assertSafeSeedEnv({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://example.com" })).toThrow();
  });
});
