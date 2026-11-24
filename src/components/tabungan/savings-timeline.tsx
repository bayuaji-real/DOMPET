"use client";

import * as React from "react";
import { GoalTimeline } from "./goal-timeline";
import { CalendarClock, CheckCircle2, Flag, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/utils";
import {
  buildSavingsTimeline,
  parseParentsAmount,
  type MonthlyCharge,
  type TimelineEntry,
  type TimelineGoal,
  type TimelinePayday,
} from "@/lib/savings-timeline";
import { Select } from "@/components/ui/select";

const GOAL_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#14b8a6", "#8b5cf6", "#ec4899"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const tgl = (iso: string, withYear = false) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]}${withYear ? ` ${y}` : ""}`;
};

const singkat = (n: number) =>
  n >= 1_000_000
    ? `${(Math.round(n / 10_000) / 100).toString().replace(".", ",")} jt`
    : n >= 1_000
      ? `${Math.round(n / 1_000)} rb`
      : String(n);

interface Props {
  goals: {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    priority: number;
    deadline: string | null;
    status: string;
  }[];
  todayStr: string;
}

export function SavingsTimeline({ goals, todayStr }: Props) {
  const [paydays, setPaydays] = React.useState<TimelinePayday[]>([]);
  const [charges, setCharges] = React.useState<MonthlyCharge[]>([]);
  const [livingCost, setLivingCost] = React.useState(400000);
  const [loaded, setLoaded] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const [mode, setMode] = React.useState<"goal" | "month">("goal");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [payRes, setRes, recRes] = await Promise.all([
          supabase
            .from("payday_schedule")
            .select("date,expected_amount,actual_amount,note")
            .order("date", { ascending: true }),
          supabase.from("user_settings").select("living_cost_per_payday").maybeSingle(),
          supabase
            .from("recurring_transactions")
            .select("amount,day_of_month,rule,type,is_active,note")
            .eq("is_active", true)
            .eq("type", "expense")
            .eq("rule", "monthly"),
        ]);
        if (cancelled) return;
        setPaydays(
          (payRes.data ?? []).map((r) => ({
            date: r.date as string,
            income: Number(r.actual_amount ?? r.expected_amount ?? 0),
            done: r.actual_amount !== null && r.actual_amount !== undefined,
            parents: parseParentsAmount(r.note as string | null),
          }))
        );
        if (setRes.data?.living_cost_per_payday != null) {
          setLivingCost(Number(setRes.data.living_cost_per_payday));
        }
        setCharges(
          (recRes.data ?? [])
            .filter((r) => r.day_of_month)
            .map((r) => ({
              name: (r.note as string | null) || "Tagihan bulanan",
              amount: Number(r.amount),
              dayOfMonth: Number(r.day_of_month),
            }))
        );
      } catch (err) {
        console.error("Gagal memuat jadwal gajian untuk timeline:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timelineGoals: TimelineGoal[] = React.useMemo(
    () =>
      goals
        .filter((g) => g.status === "aktif" || g.status === "tercapai")
        .map((g) => ({
          id: g.id,
          name: g.name,
          target: g.target_amount,
          saved: g.current_amount,
          priority: g.priority,
          deadline: g.deadline,
        })),
    [goals]
  );

  const result = React.useMemo(() => {
    if (!todayStr || timelineGoals.length === 0 || paydays.length === 0) return null;
    return buildSavingsTimeline({ goals: timelineGoals, paydays, livingCost, charges, today: todayStr });
  }, [timelineGoals, paydays, livingCost, charges, todayStr]);

  const colorOf = React.useCallback(
    (id: string) => GOAL_COLORS[timelineGoals.findIndex((g) => g.id === id) % GOAL_COLORS.length],
    [timelineGoals]
  );

  const months = result?.months ?? [];
  const nextMonth = months.find((m) => !m.done)?.key ?? months[months.length - 1]?.key ?? null;
  const activeKey = selected && months.some((m) => m.key === selected) ? selected : nextMonth;

  if (!loaded || !todayStr) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4 text-xs text-muted-foreground">
        Memuat timeline…
      </div>
    );
  }
  if (!result || months.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
        Timeline muncul setelah ada target tabungan dan jadwal gajian.
      </div>
    );
  }

  const shown = showAll ? months : months.filter((m) => m.key === activeKey);

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm" aria-labelledby="tl-title">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <h3 id="tl-title" className="text-sm font-extrabold text-foreground">
          Timeline tabungan
        </h3>
      </div>

      {/* Ringkasan: kapan tiap target penuh */}
      <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
        {timelineGoals.map((g) => {
          const e = result.eta[g.id];
          const late = e && e !== "done" && g.deadline && e > g.deadline;
          return (
            <div key={g.id} className="flex items-start justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colorOf(g.id) }} />
                {g.name}
              </span>
              <span className={`text-right ${late ? "font-bold text-rose-500" : "text-muted-foreground"}`}>
                {e === "done"
                  ? "Sudah penuh ✓"
                  : e
                    ? `Penuh ±${tgl(e, true)}${late && g.deadline ? ` (lewat tenggat ${tgl(g.deadline, true)})` : ""}`
                    : "Belum penuh dalam jadwal"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1" role="group" aria-label="Tampilan timeline">
        {([["goal", "Per tabungan"], ["month", "Per bulan"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`cursor-pointer rounded-xl py-1.5 text-xs font-bold transition-all active:scale-95 ${
              mode === id ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300/70" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "goal" ? (
        <GoalTimeline goals={timelineGoals} result={result} todayStr={todayStr} colorOf={colorOf} />
      ) : (
        <>
      {/* Pilih bulan: dropdown (tanpa geser samping) */}
      <div className="flex items-center gap-2">
        <label htmlFor="tl-bulan" className="text-xs font-semibold text-muted-foreground">Bulan</label>
        <Select
          id="tl-bulan"
          value={showAll ? "all" : activeKey ?? ""}
          onChange={(e) => {
            if (e.target.value === "all") {
              setShowAll(true);
            } else {
              setShowAll(false);
              setSelected(e.target.value);
            }
          }}
          className="flex-1" size="sm"
        >
          {months.map((m) => {
            const [y, mo] = m.key.split("-").map(Number);
            return (
              <option key={m.key} value={m.key}>
                {BULAN[mo - 1]} {y}
                {m.done ? " ✓" : m.key === nextMonth ? " (berikutnya)" : ""}
              </option>
            );
          })}
          <option value="all">Semua bulan</option>
        </Select>
      </div>

      {/* Panel bulan */}
      <div className="space-y-5" aria-live="polite">
        {shown.map((m) => {
          const [y, mo] = m.key.split("-").map(Number);
          const last = m.entries[m.entries.length - 1];
          const totalEnd = timelineGoals.reduce((s, g) => s + m.end[g.id], 0);
          const milestones: string[] = [];
          m.entries.forEach((e, i) => {
            const prev = i === 0 ? m.start : m.entries[i - 1].balance;
            timelineGoals.forEach((g) => {
              if (prev[g.id] < g.target && e.balance[g.id] >= g.target) {
                milestones.push(`${g.name} penuh ${formatRupiah(g.target)} (${tgl(e.date)})`);
              }
            });
          });
          return (
            <div key={m.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-foreground">
                  {BULAN_PANJANG[mo - 1]} {y}
                </h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    m.done
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : m.key === nextMonth
                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.done ? "✓ sudah" : m.key === nextMonth ? "bulan ini" : "rencana"}
                </span>
              </div>

              {/* Seharusnya sudah ada */}
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {m.done ? "Sudah ada" : "Seharusnya sudah ada"} setelah gajian {tgl(last.date)}
                </p>
                {timelineGoals.map((g) => {
                  const v = m.end[g.id];
                  const pct = g.target > 0 ? Math.min(100, (v / g.target) * 100) : 0;
                  const added = v - m.start[g.id];
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colorOf(g.id) }} />
                          {g.name}
                        </span>
                        <span className="text-sm font-extrabold text-foreground">{formatRupiah(v)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorOf(g.id) }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {Math.floor(pct)}% dari target{added > 0 ? ` · +${formatRupiah(added)} bulan ini` : ""}
                      </p>
                    </div>
                  );
                })}
                <div className="flex items-baseline justify-between border-t border-dashed border-border/70 pt-2 text-xs font-bold text-foreground">
                  <span>Total semua target</span>
                  <span className="text-base font-extrabold">{formatRupiah(totalEnd)}</span>
                </div>
              </div>

              {/* Kartu per gajian */}
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Setoran bulan ini
              </p>
              {m.entries.map((e) => (
                <PaydayCard key={e.date} entry={e} goals={timelineGoals} colorOf={colorOf} />
              ))}

              {milestones.map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2 rounded-lg bg-teal-500/10 px-3 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300"
                >
                  <PartyPopper className="h-3.5 w-3.5 shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="w-full cursor-pointer rounded-xl border border-border/70 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted/50"
      >
        {showAll ? "Kembali ke satu bulan" : `Lihat semua bulan (${months.length})`}
      </button>
        </>
      )}
    </section>
  );
}

function PaydayCard({
  entry: e,
  goals,
  colorOf,
}: {
  entry: TimelineEntry;
  goals: TimelineGoal[];
  colorOf: (id: string) => string;
}) {
  const max = Math.max(0, ...goals.map((g) => e.add[g.id]));
  return (
    <div
      className={`space-y-2 rounded-xl border p-3 ${
        e.isNext ? "border-teal-500/60 shadow-sm" : "border-border/60"
      } ${e.done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm text-foreground">Gajian {tgl(e.date)}</b>
        {e.done ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> sudah
          </span>
        ) : e.isNext ? (
          <span className="flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-600 dark:text-teal-400">
            <Flag className="h-3 w-3" /> berikutnya
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground">rencana</span>
        )}
      </div>

      {!e.done && (
        <>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Uang masuk {formatRupiah(e.income)} · biaya hidup {formatRupiah(e.living)}
            {e.parents > 0 ? ` · kasih ortu ${formatRupiah(e.parents)}` : ""}
            {e.charges.map((c) => ` · ${c.name} ${formatRupiah(c.amount)}`).join("")}
          </p>
          <div className="space-y-1">
            {goals.map((g) => (
              <div key={g.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 text-xs">
                <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colorOf(g.id) }} />
                <span className="truncate text-foreground">{g.name}</span>
                <span
                  className={`font-bold ${
                    e.add[g.id] > 0 && e.add[g.id] === max ? "text-teal-600 dark:text-teal-400" : "text-foreground"
                  }`}
                >
                  {e.add[g.id] ? `+${formatRupiah(e.add[g.id])}` : "–"}
                </span>
                <span className="min-w-[72px] text-right text-muted-foreground">jadi {singkat(e.balance[g.id])}</span>
              </div>
            ))}
          </div>
          {e.leftover > 0 && (
            <p className="text-[11px] text-muted-foreground">Sisa bebas {formatRupiah(e.leftover)}</p>
          )}
        </>
      )}
    </div>
  );
}
