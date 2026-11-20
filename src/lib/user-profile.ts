import { createClient } from "@/lib/supabase/client";

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  avatarBg?: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Bayu Aji",
  email: "bayuaji@dompetku.id",
  avatarUrl: null,
  avatarEmoji: "🧑‍💻",
  avatarBg: "#0d9488",
};

export const PRESET_AVATARS = [
  { emoji: "🧑‍💻", label: "Dev / Tech", bg: "#0d9488" },
  { emoji: "👨‍💼", label: "Profesional Pria", bg: "#0284c7" },
  { emoji: "👩‍💼", label: "Profesional Wanita", bg: "#7c3aed" },
  { emoji: "🚀", label: "Roket", bg: "#f59e0b" },
  { emoji: "🦁", label: "Singa", bg: "#ea580c" },
  { emoji: "💎", label: "Berlian", bg: "#06b6d4" },
  { emoji: "🍀", label: "Keberuntungan", bg: "#16a34a" },
  { emoji: "🦊", label: "Rubah", bg: "#e11d48" },
];

/**
 * Ambil profil pengguna saat ini (dari Supabase session metadata & localStorage)
 */
export async function getUserProfile(): Promise<UserProfile> {
  let profile = { ...DEFAULT_PROFILE };

  // 1. Baca dari localStorage terlebih dahulu (cepat & offline-ready)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("dompetku_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        profile = { ...profile, ...parsed };
      }
    } catch (e) {
      console.warn("Gagal membaca profil dari localStorage:", e);
    }
  }

  // 2. Sinkronkan dengan Supabase session jika tersedia
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const meta = session.user.user_metadata || {};
      const email = session.user.email || profile.email;
      const name =
        meta.full_name ||
        meta.name ||
        (profile.name !== DEFAULT_PROFILE.name
          ? profile.name
          : email.split("@")[0]);

      // PEMBERSIHAN OTOMATIS: Jika cookie sebelumnya menyimpan base64 gambar yang besar,
      // bersihkan segera agar tidak memicu error 494 Request Header Too Large di Vercel!
      if (meta.avatar_url && typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("data:")) {
        try {
          await supabase.auth.updateUser({
            data: { avatar_url: null },
          });
        } catch (_) {}
      }

      const safeRemoteAvatarUrl =
        meta.avatar_url && !meta.avatar_url.startsWith("data:")
          ? meta.avatar_url
          : profile.avatarUrl;

      profile = {
        ...profile,
        email,
        name: name || profile.name,
        avatarUrl: safeRemoteAvatarUrl,
        avatarEmoji: meta.avatar_emoji || profile.avatarEmoji,
        avatarBg: meta.avatar_bg || profile.avatarBg,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("dompetku_user_profile", JSON.stringify(profile));
      }
    }
  } catch (err) {
    // Abaikan jika offline / koneksi lambat
  }

  return profile;
}

/**
 * Simpan / perbarui profil pengguna
 */
export async function saveUserProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const current = await getUserProfile();
  const nextProfile: UserProfile = {
    ...current,
    ...updates,
  };

  // 1. Simpan ke localStorage (gambar lokal disimpan di sini, TIDAK di cookies)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dompetku_user_profile", JSON.stringify(nextProfile));
      window.dispatchEvent(
        new CustomEvent("profile_updated", { detail: nextProfile })
      );
    } catch (e) {
      console.warn("Gagal simpan profil ke localStorage:", e);
    }
  }

  // 2. Simpan ke Supabase user metadata jika user login
  // PENTING: JANGAN PERNAH mengirim data base64 (data:image/...) ke Supabase user_metadata
  // karena Supabase menyimpannya di cookie HTTP browser yang memiliki limit ukuran header ~8KB-16KB.
  // Menyimpan base64 di cookie akan menghasilkan error Vercel 494 Request Header Too Large!
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const isRemoteUrl =
        nextProfile.avatarUrl &&
        typeof nextProfile.avatarUrl === "string" &&
        !nextProfile.avatarUrl.startsWith("data:");

      await supabase.auth.updateUser({
        data: {
          full_name: nextProfile.name,
          name: nextProfile.name,
          avatar_url: isRemoteUrl ? nextProfile.avatarUrl : null,
          avatar_emoji: nextProfile.avatarEmoji,
          avatar_bg: nextProfile.avatarBg,
        },
      });
    }
  } catch (err) {
    console.warn("Gagal sinkronkan profil ke Supabase:", err);
  }

  return nextProfile;
}
