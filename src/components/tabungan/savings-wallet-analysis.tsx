"use client";

import * as React from "react";
import { PiggyBank } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { getSavingsGoals, type GoalProgress } from "@/lib/data/goals";
import { getTransactions, type Transaction } from "@/lib/data/transactions";
import { calculateSavingsProjection } from "@/lib/savings";
import { formatRupiah, formatTanggalWIB } from "@/lib/utils";
import { todayJakarta } from "@/lib/data/sample-mode";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

interface Props {
  /** Dompet tabungan yang dianalisis. */
  wallet: { id: string; name: string; goal_id?: string | null; balance?: number | null };
  /** Sembunyikan nominal (mode sembunyikan saldo di Beranda). */
  hide?: boolean;
}

interface MonthBar {
  key: string;
  label: string;
  deposit: number;
  /** Setoran dikurangi penarikan bulan itu. */
  net: number;
}

/** Enam bulan terakhir (termasuk bulan ini), dari yang terlama. */
function lastSixMonths(today: string): { key: string; label: string }[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - (5 - i), 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: MONTH_SHORT[d.getUTCMonth()] };
  });
}

/**
 * Analisis satu dompet tabungan: progres menuju target, sisa dan tenggat, setoran per bulan
 * (6 bulan terakhir), dan perkiraan kapan tercapai bila kecepatan menabung seperti rata-rata sekarang.
 */
export function SavingsWalletAnalysis({ wallet, hide = false }: Props) {
  const [goal, setGoal] = React.useState<GoalProgress | null>(null);
  const [txs, setTxs] = React.useState<Transaction[]>([]);
  const [state, setState] = React.useState<"loading" | "ready" | "failed">("loading");

  React.useEffect(() => {
    let alive = true;
    setState("loading");
    const today = todayJakarta();
    const months = lastSixMonths(today);
    Promise.all([
      getSavingsGoals().catch(() => [] as GoalProgress[]),
      getTransactions({ walletId: wallet.id, startDate: `${months[0].key}-01`, endDate: today }).catch(() => null),
    ]).then(([goals, list]) => {
      if (!alive) return;
      setGoal(goals.find((g) => g.id === wallet.goal_id) ?? null);
      if (list === null) {
        setState("failed");
        return;
      }
      setTxs(list);
      setState("ready");
    });
    return () => {
      alive = false;
    };
  }, [wallet.id, wallet.goal_id]);

  const money = (n: number) => (hide ? "••••••" : formatRupiah(n, { absolute: true }));

  const today = todayJakarta();
  const months = React.useMemo(() => lastSixMonths(today), [today]);

  const { bars, depositThisMonth, withdrawThisMonth, avgDeposit } = React.useMemo(() => {
    const byMonth = new Map<string, number>(months.map((m) => [m.key, 0]));
    const netByMonth = new Map<string, number>(months.map((m) => [m.key, 0]));
    let withdraw = 0;
    for (const t of txs) {
      const key = String(t.date).slice(0, 7);
      const amt = Number(t.amount) || 0;
      const forThisWallet = t.to_wallet_id === wallet.id || (wallet.goal_id && t.goal_id === wallet.goal_id);
      if (t.type === "goal_deposit" && forThisWallet && byMonth.has(key)) {
        byMonth.set(key, (byMonth.get(key) ?? 0) + amt);
        netByMonth.set(key, (netByMonth.get(key) ?? 0) + amt);
      }
      if (t.type === "goal_withdraw" && forThisWallet && netByMonth.has(key)) netByMonth.set(key, (netByMonth.get(key) ?? 0) - amt);
      if (t.type === "goal_withdraw" && forThisWallet && key === today.slice(0, 7)) withdraw += amt;
    }
    const list: MonthBar[] = months.map((m) => ({ ...m, deposit: byMonth.get(m.key) ?? 0, net: netByMonth.get(m.key) ?? 0 }));
    // Rata-rata dihitung dari bulan yang sudah ada setoran (jangan menghukum bulan sebelum mulai menabung).
    const active = list.filter((b) => b.deposit > 0);
    const avg = active.length ? active.reduce((s, b) => s + b.deposit, 0) / active.length : 0;
    return {
      bars: list,
      depositThisMonth: byMonth.get(today.slice(0, 7)) ?? 0,
      withdrawThisMonth: withdraw,
      avgDeposit: avg,
    };
  }, [txs, months, today, wallet.id, wallet.goal_id]);

  if (state === "loading") return <div className="h-24 animate-pulse rounded-2xl bg-muted/50" aria-label="Memuat analisis tabungan" />;
  if (state === "failed") return <p className="text-xs text-muted-foreground">Analisis tabungan belum bisa dimuat. Coba lagi sebentar lagi.</p>;

  const saved = goal ? Number(goal.saved) || 0 : Math.max(0, Number(wallet.balance) || 0);
  const target = goal ? Number(goal.target_amount) || 0 : 0;
  const proj = goal
    ? calculateSavingsProjection({
        currentAmount: saved,
        targetAmount: target,
        deadline: goal.deadline,
        plannedPerPayday: goal.planned_per_payday,
      })
    : null;
  const remaining = Math.max(0, target - saved);
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  // Perkiraan tercapai bila menabung seperti rata-rata bulanan sekarang.
  let estimate: string | null = null;
  if (remaining > 0 && avgDeposit > 0) {
    const monthsLeft = Math.ceil(remaining / avgDeposit);
    const d = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + monthsLeft, 1));
    estimate = `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()} (±${monthsLeft} bulan lagi)`;
  }

  // Kebutuhan per bulan agar tepat tenggat.
  let neededPerMonth: number | null = null;
  if (remaining > 0 && goal?.deadline) {
    const dl = new Date(goal.deadline);
    const now = new Date(`${today}T00:00:00Z`);
    const monthsToDeadline = (dl.getUTCFullYear() - now.getUTCFullYear()) * 12 + (dl.getUTCMonth() - now.getUTCMonth());
    if (monthsToDeadline > 0) neededPerMonth = Math.ceil(remaining / monthsToDeadline);
  }

  const maxBar = Math.max(1, ...bars.map((b) => b.deposit));
  const hasAnyDeposit = bars.some((b) => b.deposit > 0);
  // Saldo akhir tiap bulan: mundur dari saldo sekarang dikurangi mutasi bulan-bulan sesudahnya.
  const balanceSeries = bars.map((b, i) => {
    const after = bars.slice(i + 1).reduce((sum, x) => sum + x.net, 0);
    return { label: b.label, saldo: Math.max(0, saved - after) };
  });

  return (
    <section aria-label={`Analisis tabungan ${wallet.name}`} className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <PiggyBank className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold leading-tight text-foreground">Analisis Tabungan</h3>
          <p className="text-[11px] text-muted-foreground">{wallet.name}</p>
        </div>
        {proj && (
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              proj.status === "tercapai"
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : proj.status === "telat"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {proj.statusLabel}
          </span>
        )}
      </div>

      {target > 0 ? (
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground tabular-nums">
              {money(saved)} dari {money(target)}
            </span>
            <span className="font-bold tabular-nums text-violet-600 dark:text-violet-400">{Math.round(percent)}%</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Terkumpul <b className="text-foreground tabular-nums">{money(saved)}</b>. Target belum diatur, atur di menu Tabungan supaya progresnya terlihat.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-muted/40 p-2.5">
          <dt className="text-muted-foreground">Setoran bulan ini</dt>
          <dd className="font-extrabold tabular-nums text-foreground">{money(depositThisMonth)}</dd>
        </div>
        <div className="rounded-xl bg-muted/40 p-2.5">
          <dt className="text-muted-foreground">Rata-rata per bulan</dt>
          <dd className="font-extrabold tabular-nums text-foreground">{avgDeposit > 0 ? money(Math.round(avgDeposit)) : "Belum ada"}</dd>
        </div>
        {target > 0 && (
          <div className="rounded-xl bg-muted/40 p-2.5">
            <dt className="text-muted-foreground">Sisa target</dt>
            <dd className="font-extrabold tabular-nums text-foreground">{money(remaining)}</dd>
          </div>
        )}
        {goal?.deadline && (
          <div className="rounded-xl bg-muted/40 p-2.5">
            <dt className="text-muted-foreground">Tenggat</dt>
            <dd className="font-extrabold text-foreground">
              {formatTanggalWIB(goal.deadline)}
              {proj?.daysRemainingText && <span className="block text-[10px] font-semibold text-muted-foreground">{proj.daysRemainingText}</span>}
            </dd>
          </div>
        )}
      </dl>

      {withdrawThisMonth > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Penarikan bulan ini: <b className="tabular-nums text-foreground">{money(withdrawThisMonth)}</b>
        </p>
      )}

      {/* Grafik 1: saldo tabungan 6 bulan terakhir menuju target (selalu tampil) */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Saldo tabungan 6 bulan terakhir{target > 0 ? " (garis putus = target)" : ""}</p>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceSeries} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="savBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} interval={0} />
              <YAxis hide domain={[0, Math.max(target, saved, 1)]} />
              <Tooltip
                formatter={(v) => [money(Number(v)), "Saldo"]}
                contentStyle={{ borderRadius: 12, fontSize: 11, border: "none", background: "rgba(24,24,27,0.95)", color: "#fff" }}
              />
              {target > 0 && <ReferenceLine y={target} stroke="#14b8a6" strokeDasharray="4 4" strokeWidth={1.5} />}
              <Area type="monotone" dataKey="saldo" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#savBalance)" isAnimationActive={false} dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grafik 2: setoran per bulan (selalu tampil, bulan kosong = batang rata) */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Setoran per bulan</p>
        <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
          {bars.map((b) => (
            <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                className={`w-full rounded-t-md ${b.deposit > 0 ? "bg-violet-500/80" : "bg-muted-foreground/25"}`}
                style={{ height: b.deposit > 0 ? `${Math.max(8, (b.deposit / maxBar) * 100)}%` : "3px" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5 text-center text-[9px] text-muted-foreground" aria-hidden="true">
          {bars.map((b) => (
            <span key={b.key} className="flex-1">
              {b.label}
            </span>
          ))}
        </div>
        {!hasAnyDeposit && (
          <p className="mt-2 rounded-2xl bg-muted/40 p-2.5 text-center text-[11px] text-muted-foreground">
            Belum ada setoran dalam 6 bulan terakhir. Setor lewat menu Tabungan, batang di atas akan terisi.
          </p>
        )}
      </div>

      {(estimate || neededPerMonth) && (
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {estimate && (
            <li>
              Kalau menabung seperti rata-rata sekarang, target tercapai sekitar <b className="text-foreground">{estimate}</b>.
            </li>
          )}
          {neededPerMonth && (
            <li>
              Agar tepat tenggat, perlu menyetor sekitar <b className="tabular-nums text-foreground">{money(neededPerMonth)}</b> per bulan.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
