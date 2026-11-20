import { createClient, isSupabaseConfigured } from "../supabase/client";
import type { Database } from "@/types/database";
import { USE_SAMPLE_DATA, todayJakarta } from "./sample-mode";

export type Budget = Database["public"]["Tables"]["budgets"]["Row"];

export interface CategoryBudgetStatus {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month: string;
  limitAmount: number;
  spentAmount: number;
  percentage: number;
  remainingAmount: number;
  status: "aman" | "waspada" | "kritis"; // <80%: aman, 80-99%: waspada, >=100%: kritis
}

export const SAMPLE_BUDGETS: Budget[] = [
  {
    id: "b-sample-1",
    user_id: "demo-user",
    category_id: "c-bills",
    month: "2026-11",
    limit_amount: 1000000,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "b-sample-2",
    user_id: "demo-user",
    category_id: "c-groceries",
    month: "2026-11",
    limit_amount: 500000,
    created_at: "2026-11-01T00:00:00Z",
  },
  {
    id: "b-sample-3",
    user_id: "demo-user",
    category_id: "c-food",
    month: "2026-11",
    limit_amount: 300000,
    created_at: "2026-11-01T00:00:00Z",
  },
];

/**
 * Mengambil anggaran untuk bulan tertentu (format YYYY-MM)
 */
export async function getBudgets(month = "2026-11"): Promise<Budget[]> {
  if (!isSupabaseConfigured()) {
    return (USE_SAMPLE_DATA ? SAMPLE_BUDGETS : []).filter((b) => b.month === month);
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("month", month);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("Gagal fetch budgets dari DB, gunakan fallback:", err);
  }

  return (USE_SAMPLE_DATA ? SAMPLE_BUDGETS : []).filter((b) => b.month === month);
}

/**
 * Atur / Perbarui batas anggaran bulanan per kategori
 */
export async function setBudget(
  categoryId: string,
  month: string,
  limitAmount: number
): Promise<Budget | null> {
  const userId = "demo-user";

  if (!isSupabaseConfigured()) {
    const existing = SAMPLE_BUDGETS.find(
      (b) => b.category_id === categoryId && b.month === month
    );
    if (existing) {
      existing.limit_amount = limitAmount;
      return existing;
    } else {
      const created: Budget = {
        id: `b-local-${Date.now()}`,
        user_id: userId,
        category_id: categoryId,
        month,
        limit_amount: limitAmount,
        created_at: new Date().toISOString(),
      };
      SAMPLE_BUDGETS.push(created);
      return created;
    }
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id || userId;

  try {
    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        {
          user_id: authUserId,
          category_id: categoryId,
          month,
          limit_amount: limitAmount,
        },
        { onConflict: "user_id,category_id,month" }
      )
      .select()
      .single();

    if (!error && data) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("budget_updated"));
      }
      return data;
    }
  } catch (err) {
    console.warn("Gagal upsert budget di DB:", err);
  }

  // Update in memory fallback
  const existing = SAMPLE_BUDGETS.find(
    (b) => b.category_id === categoryId && b.month === month
  );
  if (existing) {
    existing.limit_amount = limitAmount;
  } else {
    SAMPLE_BUDGETS.push({
      id: `b-local-${Date.now()}`,
      user_id: userId,
      category_id: categoryId,
      month,
      limit_amount: limitAmount,
      created_at: new Date().toISOString(),
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("budget_updated"));
  }

  return {
    id: `b-local-${Date.now()}`,
    user_id: userId,
    category_id: categoryId,
    month,
    limit_amount: limitAmount,
  };
}
