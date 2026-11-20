import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database, CategoryType } from "@/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const SAMPLE_CATEGORIES: Category[] = [
  {
    id: "c-food",
    user_id: "demo-user",
    name: "Makanan & Minuman",
    type: "expense",
    icon: "Utensils",
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
    icon: "Receipt",
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
    icon: "ShoppingBag",
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
    icon: "Car",
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
    icon: "Tv",
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
    icon: "Briefcase",
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
    icon: "Wallet",
    color: "#eab308",
    sort_order: 7,
    is_default: true,
    created_at: "2026-11-01T00:00:00Z",
  },
];

export async function getCategories(type?: CategoryType): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    if (type) {
      return SAMPLE_CATEGORIES.filter((c) => c.type === type);
    }
    return [...SAMPLE_CATEGORIES];
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
      return SAMPLE_CATEGORIES.filter((c) => c.type === type);
    }
    return [...SAMPLE_CATEGORIES];
  }

  return data && data.length > 0 ? data : SAMPLE_CATEGORIES;
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
      icon: category.icon || "Tag",
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
