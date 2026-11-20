"use client";

import * as React from "react";
import {
  PieChart,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { getBudgets, setBudget, type Budget } from "@/lib/data/budgets";
import type { CategoryExpense } from "@/types/analytics";

interface BudgetCardProps {
  categories: CategoryExpense[];
  monthKey?: string; // YYYY-MM
  monthLabel?: string;
}

export function BudgetCard({
  categories,
  monthKey = "2026-11",
  monthLabel = "Bulan Ini",
}: BudgetCardProps) {
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editLimits, setEditLimits] = React.useState<Record<string, string>>({});

  const loadBudgets = React.useCallback(async () => {
    try {
      const data = await getBudgets(monthKey);
      setBudgets(data);

      const map: Record<string, string> = {};
      categories.forEach((c) => {
        const found = data.find((b) => b.category_id === c.id);
        const limit = found ? found.limit_amount : 500000;
        map[c.id] = limit.toLocaleString("id-ID");
      });
      setEditLimits(map);
    } catch (err) {
      console.warn("Gagal load budgets:", err);
    }
  }, [monthKey, categories]);

  React.useEffect(() => {
    loadBudgets();

    const handleUpdate = () => loadBudgets();
    window.addEventListener("budget_updated", handleUpdate);
    return () => window.removeEventListener("budget_updated", handleUpdate);
  }, [loadBudgets]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      for (const cat of categories) {
        const raw = editLimits[cat.id]?.replace(/\D/g, "") || "0";
        const val = Number(raw);
        if (val > 0) {
          await setBudget(cat.id, monthKey, val);
        }
      }
      setShowModal(false);
      await loadBudgets();
    } catch (err) {
      console.error("Gagal menyimpan anggaran:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Gabungkan kategori pengeluaran dengan anggaran
  const budgetStatuses = categories.map((cat) => {
    const found = budgets.find((b) => b.category_id === cat.id);
    const limit = found ? found.limit_amount : 500000; // default 500rb
    const spent = cat.nominal;
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const remaining = limit - spent;

    let status: "aman" | "waspada" | "kritis" = "aman";
    if (percentage >= 100) {
      status = "kritis";
    } else if (percentage >= 80) {
      status = "waspada";
    }

    return {
      id: cat.id,
      name: cat.name,
      color: cat.color,
      limit,
      spent,
      percentage,
      remaining,
      status,
    };
  });

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            Anggaran per Kategori
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Batas belanja bulanan & status pemakaian
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
        >
          <Sliders className="h-3 w-3" />
          Atur Batas
        </button>
      </div>

      {/* Daftar Progress Bar Anggaran per Kategori */}
      <div className="space-y-3">
        {budgetStatuses.map((item) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-foreground truncate">
                  {item.name}
                </span>
                {item.status === "kritis" ? (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <ShieldAlert className="h-2.5 w-2.5" /> 100%+ Over
                  </span>
                ) : item.status === "waspada" ? (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" /> 80%+ Waspada
                  </span>
                ) : null}
              </div>

              <div className="text-right shrink-0">
                <span className="font-extrabold text-foreground">
                  {formatRupiah(item.spent, { absolute: true })}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {" / "}
                  {formatRupiah(item.limit, { absolute: true })}
                </span>
              </div>
            </div>

            {/* Progress Bar Dinamis */}
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden relative">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  item.status === "kritis"
                    ? "bg-rose-500"
                    : item.status === "waspada"
                      ? "bg-amber-500"
                      : "bg-teal-500"
                )}
                style={{
                  width: `${Math.min(100, item.percentage)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
              <span>{item.percentage}% terpakai</span>
              <span>
                {item.remaining >= 0
                  ? `Sisa ${formatRupiah(item.remaining, { absolute: true })}`
                  : `Lebih ${formatRupiah(Math.abs(item.remaining), { absolute: true })}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Atur Batas Anggaran */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-4.5 space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Atur Batas Anggaran
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Bulan: {monthLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3 pt-1">
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-foreground truncate">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 w-32 border-b border-border/80 pb-0.5">
                      <span className="text-[11px] font-bold text-muted-foreground">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editLimits[cat.id] || ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const num = Number(raw) || 0;
                          setEditLimits((prev) => ({
                            ...prev,
                            [cat.id]: raw ? num.toLocaleString("id-ID") : "",
                          }));
                        }}
                        className="w-full bg-transparent text-xs font-bold text-foreground text-right focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 h-10 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Simpan Batas"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
