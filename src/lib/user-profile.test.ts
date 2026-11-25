// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const session = { user: { id: "u2", email: "pacar@mail.com", user_metadata: {} as Record<string, unknown> } };
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session } }), updateUser: vi.fn(async () => ({})) }, storage: { from: () => ({ upload: vi.fn(async () => ({ error: null })), list: async () => ({ data: [] }), remove: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "x" } }) }) } }),
}));

import { getUserProfile, clearProfileCache } from "./user-profile";

beforeEach(() => { localStorage.clear(); clearProfileCache(); session.user.user_metadata = {}; });

describe("profil tidak bocor antar akun", () => {
  it("cache milik akun lain tidak dipakai (nama dan foto)", async () => {
    localStorage.setItem("dompetku_user_profile", JSON.stringify({ name: "Bayu Aji Santoso", avatarUrl: "https://foto/bayu.jpg", avatarEmoji: "🚀", _uid: "u1" }));
    const p = await getUserProfile();
    expect(p.name).toBe("pacar");
    expect(p.avatarUrl).toBeNull();
    expect(p.avatarEmoji).not.toBe("🚀");
  });
  it("cache lama tanpa pemilik juga diabaikan", async () => {
    localStorage.setItem("dompetku_user_profile", JSON.stringify({ name: "Bayu Aji Santoso", avatarUrl: "https://foto/bayu.jpg" }));
    const p = await getUserProfile();
    expect(p.name).toBe("pacar");
    expect(p.avatarUrl).toBeNull();
  });
  it("cache milik akun yang sama tetap dipakai", async () => {
    localStorage.setItem("dompetku_user_profile", JSON.stringify({ name: "Nama Sendiri", avatarEmoji: "🦁", _uid: "u2" }));
    const p = await getUserProfile();
    expect(p.name).toBe("Nama Sendiri");
    expect(p.avatarEmoji).toBe("🦁");
  });
  it("clearProfileCache menghapus cache", async () => {
    localStorage.setItem("dompetku_user_profile", "{}");
    clearProfileCache();
    expect(localStorage.getItem("dompetku_user_profile")).toBeNull();
  });
});
