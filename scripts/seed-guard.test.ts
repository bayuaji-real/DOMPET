import { describe, it, expect } from "vitest";
import {
  assertSafeSeedEnv,
  extractProjectRef,
  parseAllowedRef,
  parseBlockedRefs,
  SeedGuardError,
  type SeedEnv,
  type SeedGuardCode,
} from "./seed-guard";

const base: SeedEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://stagingref123.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
  SEED_CONFIRM_STAGING: "yes",
  SEED_BLOCKED_PROJECT_REFS: "prodref999, otherprod",
  SEED_ALLOWED_PROJECT_REF: "stagingref123",
};

/** Jalankan guard, kembalikan kode galat (atau null bila lolos). Tidak membaca teks pesan. */
function codeOf(env: SeedEnv): SeedGuardCode | null {
  try {
    assertSafeSeedEnv(env);
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(SeedGuardError);
    return (e as SeedGuardError).code;
  }
}

const withUrl = (u: string): SeedEnv => ({ ...base, NEXT_PUBLIC_SUPABASE_URL: u });

describe("seed-guard: parsing", () => {
  it("mengambil ref dari URL", () => {
    expect(extractProjectRef("https://AbC123.supabase.co")).toBe("abc123");
    expect(extractProjectRef("https://example.com")).toBeNull();
    expect(extractProjectRef("bukan url")).toBeNull();
  });

  it("parse daftar ref terlarang", () => {
    expect(parseBlockedRefs(" A, b ,,")).toEqual(["a", "b"]);
    expect(parseBlockedRefs(undefined)).toEqual([]);
  });

  it("parse ref izin: satu nilai, huruf/angka saja", () => {
    expect(parseAllowedRef(" AbC1 ")).toBe("abc1");
    expect(parseAllowedRef("a,b")).toBeNull();
    expect(parseAllowedRef("a b")).toBeNull();
    expect(parseAllowedRef("")).toBeNull();
    expect(parseAllowedRef(undefined)).toBeNull();
  });
});

describe("seed-guard: jalur normal", () => {
  it("lolos untuk staging yang cocok dengan daftar izin", () => {
    expect(codeOf(base)).toBeNull();
    expect(assertSafeSeedEnv(base).url).toBe(base.NEXT_PUBLIC_SUPABASE_URL);
  });

  it("lolos dengan spasi di sekitar nilai, trailing slash, dan huruf besar", () => {
    expect(codeOf(withUrl("  https://stagingref123.supabase.co  "))).toBeNull();
    expect(codeOf(withUrl("https://stagingref123.supabase.co/"))).toBeNull();
    expect(codeOf(withUrl("https://StagingRef123.Supabase.CO"))).toBeNull();
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: " STAGINGREF123 " })).toBeNull();
  });
});

describe("seed-guard: gagal tertutup", () => {
  it("menolak bila URL atau key kosong", () => {
    expect(codeOf(withUrl(""))).toBe("MISSING_CREDENTIALS");
    expect(codeOf({ ...base, SUPABASE_SERVICE_ROLE_KEY: "" })).toBe("MISSING_CREDENTIALS");
  });

  it("menolak tanpa konfirmasi staging", () => {
    expect(codeOf({ ...base, SEED_CONFIRM_STAGING: undefined })).toBe("NOT_CONFIRMED");
    expect(codeOf({ ...base, SEED_CONFIRM_STAGING: "true" })).toBe("NOT_CONFIRMED");
  });

  it("menolak bila daftar larang kosong", () => {
    expect(codeOf({ ...base, SEED_BLOCKED_PROJECT_REFS: "" })).toBe("BLOCKLIST_EMPTY");
    expect(codeOf({ ...base, SEED_BLOCKED_PROJECT_REFS: undefined })).toBe("BLOCKLIST_EMPTY");
  });

  it("menolak bila daftar izin kosong atau tidak valid", () => {
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: undefined })).toBe("ALLOWLIST_MISSING");
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: "   " })).toBe("ALLOWLIST_MISSING");
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: "a,b" })).toBe("ALLOWLIST_INVALID");
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: "stagingref123.supabase.co" })).toBe("ALLOWLIST_INVALID");
  });

  it("menolak ref yang tidak sama dengan daftar izin", () => {
    expect(codeOf(withUrl("https://lainnya456.supabase.co"))).toBe("REF_NOT_ALLOWED");
    expect(codeOf({ ...base, SEED_ALLOWED_PROJECT_REF: "stagingref12" })).toBe("REF_NOT_ALLOWED");
  });

  it("menolak URL tak dikenali", () => {
    expect(codeOf(withUrl("https://example.com"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("bukan url"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("http://stagingref123.supabase.co"))).toBe("URL_INVALID");
  });
});

describe("seed-guard: larangan menang atas izin", () => {
  it("menolak ref database utama walau juga ada di daftar izin", () => {
    const env = { ...base, NEXT_PUBLIC_SUPABASE_URL: "https://prodref999.supabase.co", SEED_ALLOWED_PROJECT_REF: "prodref999" };
    expect(codeOf(env)).toBe("REF_BLOCKED");
  });

  it("pesan error tidak membocorkan ref, URL, atau key", () => {
    const secrets = ["prodref999", "stagingref123", "dummy-key", "supabase.co"];
    const cases: SeedEnv[] = [
      withUrl("https://ProdRef999.supabase.co"),
      withUrl("https://lainnya456.supabase.co"),
      withUrl("https://user@stagingref123.supabase.co"),
      { ...base, SEED_ALLOWED_PROJECT_REF: "a,b" },
    ];
    for (const env of cases) {
      try {
        assertSafeSeedEnv(env);
        throw new Error("harusnya gagal");
      } catch (e) {
        const msg = (e as Error).message.toLowerCase();
        for (const s of secrets) expect(msg).not.toContain(s);
      }
    }
  });
});

describe("seed-guard: variasi bypass ref database utama", () => {
  const blockedEnv = (u: string): SeedEnv => ({ ...base, NEXT_PUBLIC_SUPABASE_URL: u, SEED_ALLOWED_PROJECT_REF: "prodref999" });

  it("huruf besar tetap diblokir", () => {
    expect(codeOf(blockedEnv("https://PRODREF999.SUPABASE.CO"))).toBe("REF_BLOCKED");
  });

  it("spasi di sekitar URL tetap diblokir", () => {
    expect(codeOf(blockedEnv("  https://prodref999.supabase.co \t"))).toBe("REF_BLOCKED");
  });

  it("trailing slash tetap diblokir", () => {
    expect(codeOf(blockedEnv("https://prodref999.supabase.co/"))).toBe("REF_BLOCKED");
  });

  it("user@host ditolak (tidak lolos sebagai staging)", () => {
    expect(codeOf(blockedEnv("https://stagingref123@prodref999.supabase.co"))).not.toBeNull();
    expect(codeOf(withUrl("https://prodref999@stagingref123.supabase.co"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://user:pw@stagingref123.supabase.co"))).toBe("URL_INVALID");
  });

  it("subdomain tambahan ditolak", () => {
    expect(codeOf(withUrl("https://x.prodref999.supabase.co"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://prodref999.supabase.co.evil.com"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://x.stagingref123.supabase.co"))).toBe("URL_INVALID");
  });

  it("titik di akhir host ditolak", () => {
    expect(codeOf(blockedEnv("https://prodref999.supabase.co."))).not.toBeNull();
    expect(codeOf(withUrl("https://stagingref123.supabase.co."))).toBe("URL_INVALID");
  });

  it("port, path, query, dan hash ditolak", () => {
    expect(codeOf(withUrl("https://stagingref123.supabase.co:8443"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://stagingref123.supabase.co/rest/v1"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://stagingref123.supabase.co/?a=prodref999"))).toBe("URL_INVALID");
    expect(codeOf(withUrl("https://stagingref123.supabase.co/#prodref999"))).toBe("URL_INVALID");
  });

  it("spasi di dalam URL ditolak", () => {
    expect(codeOf(withUrl("https://stagingref123 .supabase.co"))).toBe("URL_INVALID");
  });
});
