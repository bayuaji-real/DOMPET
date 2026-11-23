import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database, CategoryType } from "@/types/database";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const DEFAULT_CATEGORY_EMOJIS = [
  "🍔", "⚡", "🛒", "🚗", "🎬", "💰", "💵", "💊", "📚", "🏠", "☕", "🎮", "✈️", "🏷️"
];

export function getCategoryEmoji(iconOrName?: string | null, type?: "expense" | "income"): string {
  if (!iconOrName) return type === "income" ? "💰" : "🏷️";
  
  // Jika sudah berupa emoji (single/double character non-ascii or matching emoji)
  if (/\p{Extended_Pictographic}/u.test(iconOrName)) {
    return iconOrName;
  }

  const n = iconOrName.toLowerCase();
  if (n.includes("makan") || n.includes("minum") || n.includes("food") || n.includes("utensils")) return "🍔";
  if (n.includes("tagihan") || n.includes("receipt") || n.includes("listrik") || n.includes("wifi")) return "⚡";
  if (n.includes("belanja") || n.includes("grocer") || n.includes("shopping")) return "🛒";
  if (n.includes("trans") || n.includes("bensin") || n.includes("car")) return "🚗";
  if (n.includes("hiburan") || n.includes("tv") || n.includes("film") || n.includes("nonton")) return "🎬";
  if (n.includes("gaji") || n.includes("salary") || n.includes("briefcase")) return "💰";
  if (n.includes("bonus") || n.includes("sampingan") || n.includes("wallet")) return "💵";
  if (n.includes("medis") || n.includes("sehat") || n.includes("obat")) return "💊";
  if (n.includes("pendidikan") || n.includes("buku") || n.includes("kuliah")) return "📚";
  if (n.includes("rumah") || n.includes("kost")) return "🏠";
  if (n.includes("kopi") || n.includes("cafe")) return "☕";
  if (n.includes("keluarga") || n.includes("ortu") || n.includes("anak")) return "👨‍👩‍👧";
  if (n.includes("investasi") || n.includes("saham") || n.includes("reksa")) return "📈";
  if (n.includes("hadiah") || n.includes("donasi") || n.includes("sedekah")) return "🎁";
  if (n.includes("lain")) return "📦";

  return type === "income" ? "💰" : "🏷️";
}

export const SAMPLE_CATEGORIES: Category[] = [
  {
    id: "c-food",
    user_id: "demo-user",
    name: "Makanan & Minuman",
    type: "expense",
    icon: "🍔",
    color: "#14b8a6",
    sort_order: 1,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-bills",
    user_id: "demo-user",
    name: "Tagihan",
    type: "expense",
    icon: "⚡",
    color: "#0284c7",
    sort_order: 2,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-groceries",
    user_id: "demo-user",
    name: "Belanja Harian",
    type: "expense",
    icon: "🛒",
    color: "#ec4899",
    sort_order: 3,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-trans",
    user_id: "demo-user",
    name: "Transportasi",
    type: "expense",
    icon: "🚗",
    color: "#6366f1",
    sort_order: 4,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-ent",
    user_id: "demo-user",
    name: "Hiburan",
    type: "expense",
    icon: "🎬",
    color: "#a855f7",
    sort_order: 5,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-salary",
    user_id: "demo-user",
    name: "Gaji",
    type: "income",
    icon: "💰",
    color: "#10b981",
    sort_order: 6,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "c-side",
    user_id: "demo-user",
    name: "Bonus & Sampingan",
    type: "income",
    icon: "💵",
    color: "#eab308",
    sort_order: 7,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
];

/** Emoji untuk tampilan: pakai emoji tersimpan, kalau bukan emoji tebak dari nama. */
export function categoryEmoji(c: { icon?: string | null; name: string; type?: string | null }): string {
  if (c.icon && /\p{Extended_Pictographic}/u.test(c.icon)) return c.icon;
  return getCategoryEmoji(c.name, c.type === "income" ? "income" : "expense");
}

export async function getCategories(type?: CategoryType): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    if (type) {
      return (USE_SAMPLE_DATA ? SAMPLE_CATEGORIES : []).filter((c) => c.type === type);
    }
    return USE_SAMPLE_DATA ? [...SAMPLE_CATEGORIES] : [];
  }

  const supabase = createClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("Gagal mengambil kategori, fallback:", error);
    if (type) {
      return (USE_SAMPLE_DATA ? SAMPLE_CATEGORIES : []).filter((c) => c.type === type);
    }
    return USE_SAMPLE_DATA ? [...SAMPLE_CATEGORIES] : [];
  }

  return data && data.length > 0 ? data : USE_SAMPLE_DATA ? SAMPLE_CATEGORIES : [];
}

export async function createCategory(
  category: Omit<Database["public"]["Tables"]["categories"]["Insert"], "user_id">
): Promise<Category | null> {
  if (!isSupabaseConfigured()) {
    const newCat: Category = {
      id: `c-local-${Date.now()}`,
      user_id: "demo-user",
      name: category.name,
      type: category.type,
      icon: category.icon || getCategoryEmoji(category.name, category.type),
      color: category.color || "#0d9488",
      sort_order: category.sort_order || SAMPLE_CATEGORIES.length + 1,
      is_default: false,
      created_at: new Date().toISOString(),
    };
    SAMPLE_CATEGORIES.push(newCat);
    return newCat;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error("Gagal membuat kategori baru:", error);
    throw error;
  }

  return data;
}

export async function deleteCategory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const idx = SAMPLE_CATEGORIES.findIndex((c) => c.id === id);
    if (idx !== -1) {
      SAMPLE_CATEGORIES.splice(idx, 1);
    }
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Gagal menghapus kategori:", error);
    throw error;
  }

  return true;
}
