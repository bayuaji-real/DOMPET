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
const CACHE_KEY = "dompetku_user_profile";
/** Pemilik cache profil di perangkat ini. Cache milik akun lain tidak boleh dipakai (nama dan foto bisa bocor antar akun). */
let currentUid: string | null = null;

function writeCache(p: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...p, _uid: currentUid }));
}

/** Hapus cache profil di perangkat ini (dipanggil saat keluar akun). */
export function clearProfileCache() {
  currentUid = null;
  try { if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY); } catch {}
}

export async function getUserProfile(): Promise<UserProfile> {
  let profile = { ...DEFAULT_PROFILE };
  let cachedUid: string | null | undefined;

  // 1. Baca dari localStorage terlebih dahulu (cepat & offline-ready)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("dompetku_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        cachedUid = parsed._uid ?? null;
        delete parsed._uid;
        if (parsed.name === "Sobat Finansial") {
          delete parsed.name;
        }
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
      currentUid = session.user.id;
      // Cache tanpa pemilik, atau milik akun lain: jangan dipakai, supaya nama dan foto akun sebelumnya tidak tampil di akun ini.
      if (cachedUid !== undefined && cachedUid !== session.user.id) {
        profile = { ...DEFAULT_PROFILE };
        try { localStorage.removeItem(CACHE_KEY); } catch {}
      }
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

      let safeRemoteAvatarUrl =
        meta.avatar_url && !meta.avatar_url.startsWith("data:")
          ? meta.avatar_url
          : profile.avatarUrl;

      // Migrasi sekali jalan: foto lama yang cuma tersimpan di perangkat ini diunggah ke server
      if (!meta.avatar_url && profile.avatarUrl?.startsWith("data:") && typeof window !== "undefined") {
        // Beberapa komponen bisa memanggil ini bersamaan: cukup unggah sekali
        migrationPromise ??= uploadAvatar(session.user.id, profile.avatarUrl);
        const uploaded = await migrationPromise;
        if (uploaded) {
          safeRemoteAvatarUrl = uploaded;
          try {
            await supabase.auth.updateUser({ data: { avatar_url: uploaded } });
          } catch {}
        }
      }

      profile = {
        ...profile,
        email,
        name: name || profile.name,
        avatarUrl: safeRemoteAvatarUrl,
        avatarEmoji: meta.avatar_emoji || profile.avatarEmoji,
        avatarBg: meta.avatar_bg || profile.avatarBg,
      };

      if (typeof window !== "undefined") {
        writeCache(profile);
      }
    }
  } catch (err) {
    // Abaikan jika offline / koneksi lambat
  }

  return profile;
}

let migrationPromise: Promise<string | null> | null = null;

/** Unggah foto profil (data URL) ke bucket publik 'avatars'. Mengembalikan URL publik, atau null kalau gagal. */
async function uploadAvatar(userId: string, dataUrl: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const blob = await (await fetch(dataUrl)).blob();
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: type, upsert: true });
    if (error) {
      console.warn("Gagal unggah foto profil:", error.message);
      return null;
    }
    // Hapus foto lama milik user ini supaya tidak menumpuk
    const { data: list } = await supabase.storage.from("avatars").list(userId);
    const old = (list ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
    if (old.length) await supabase.storage.from("avatars").remove(old);
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn("Gagal unggah foto profil:", err);
    return null;
  }
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
      writeCache(nextProfile);
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
      // Foto baru (data:image/...) diunggah ke Storage 'avatars' supaya sama di semua perangkat.
      // Yang disimpan di akun hanya alamat pendeknya (aman untuk cookie).
      if (nextProfile.avatarUrl && nextProfile.avatarUrl.startsWith("data:")) {
        const uploaded = await uploadAvatar(session.user.id, nextProfile.avatarUrl);
        if (uploaded) {
          nextProfile.avatarUrl = uploaded;
          if (typeof window !== "undefined") {
            writeCache(nextProfile);
            window.dispatchEvent(new CustomEvent("profile_updated", { detail: nextProfile }));
          }
        }
      }

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
