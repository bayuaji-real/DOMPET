"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/utils";
import {
  balanceAt,
  buildGoalSeries,
  seriesEnd,
  type Granularity,
  type TimelineGoal,
  type TimelineResult,
} from "@/lib/savings-timeline";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
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

const GRANS: { id: Granularity; label: string }[] = [
  { id: "day", label: "Per tanggal" },
  { id: "week", label: "Per minggu" },
  { id: "month", label: "Per bulan" },
];

interface Props {
  goals: TimelineGoal[];
  result: TimelineResult;
  todayStr: string;
  colorOf: (id: string) => string;
}

export function GoalTimeline({ goals, result, todayStr, colorOf }: Props) {
  const [goalId, setGoalId] = React.useState<string>(goals[0]?.id ?? "");
  const [gran, setGran] = React.useState<Granularity>("month");
  const [checkDate, setCheckDate] = React.useState("");

  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const color = goal ? colorOf(goal.id) : "#14b8a6";
  const eta = goal ? result.eta[goal.id] : null;

  const end = goal ? seriesEnd(result.entries, eta, todayStr) : todayStr;
  const series = React.useMemo(
    () => (goal ? buildGoalSeries(result.entries, goal.id, goal.saved, todayStr, end, gran) : []),
    [goal, result.entries, todayStr, end, gran]
  );

  if (!goal) return null;

  const chartData = series.map((p) => ({ ...p, label: tgl(p.date) }));
  const deadline = goal.deadline && goal.deadline > todayStr ? goal.deadline : null;
  const late = eta && eta !== "done" && goal.deadline && eta > goal.deadline;
  const pctNow = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const listRows = gran === "day" ? series.filter((p, i) => i === 0 || p.added > 0) : series;

  const checkBal = checkDate ? balanceAt(result.entries, goal.id, goal.saved, checkDate) : null;
  const checkPct = checkBal !== null && goal.target > 0 ? Math.min(100, (checkBal / goal.target) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Pilih tabungan */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih tabungan">
        {goals.map((g) => {
          const active = g.id === goal.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={active}
              onClick={() => setGoalId(g.id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                active ? "border-transparent text-white" : "border-border/70 bg-card text-foreground"
              }`}
              style={active ? { background: colorOf(g.id) } : undefined}
            >
              {!active && <i className="h-2 w-2 rounded-full" style={{ background: colorOf(g.id) }} />}
              {g.name}
            </button>
          );
        })}
      </div>

      {/* Ringkas */}
      <div className="space-y-1 rounded-xl bg-muted/40 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Sekarang</span>
          <span className="text-sm font-extrabold text-foreground">
            {formatRupiah(goal.saved)} <span className="text-[10px] font-semibold text-muted-foreground">/ {formatRupiah(goal.target)}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${pctNow}%`, background: color }} />
        </div>
        <p className={`text-xs ${late ? "font-bold text-rose-500" : "text-muted-foreground"}`}>
          {eta === "done"
            ? "Sudah penuh ✓"
            : eta
              ? `Penuh ±${tgl(eta, true)}${late && goal.deadline ? ` — lewat tenggat ${tgl(goal.deadline, true)}` : ""}`
              : "Belum penuh dalam jadwal gajian yang ada"}
        </p>
      </div>

      {/* Pilih skala */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1" role="group" aria-label="Skala waktu">
        {GRANS.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={gran === g.id}
            onClick={() => setGran(g.id)}
            className={`cursor-pointer rounded-xl py-1.5 text-xs font-bold transition-all active:scale-95 ${
              gran === g.id ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300/70" : "text-muted-foreground"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Grafik */}
      {eta === "done" ? (
        <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
          Tabungan ini sudah penuh, tidak ada proyeksi setoran.
        </p>
      ) : (
        <div
          className="h-52 w-full"
          role="img"
          aria-label={`Grafik saldo ${goal.name} dari ${tgl(todayStr)} sampai ${tgl(end)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, Math.max(goal.target, ...series.map((p) => p.balance))]}
                tickFormatter={(v: number) => singkat(v)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                      <p className="font-bold text-foreground">{tgl(p.date, true)}</p>
                      <p className="text-foreground">Saldo {formatRupiah(p.balance)}</p>
                      {p.added > 0 && <p className="text-teal-600 dark:text-teal-400">+{formatRupiah(p.added)}</p>}
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={goal.target}
                stroke={color}
                strokeDasharray="5 4"
                label={{ value: "Target", position: "insideTopLeft", fontSize: 10, fill: color }}
              />
              {deadline && series.some((p) => p.date >= deadline) && (
                <ReferenceLine
                  x={tgl(series.find((p) => p.date >= deadline)!.date)}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: "Tenggat", position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
                />
              )}
              <Area
                type="stepAfter"
                dataKey="balance"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#g-${goal.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cek per tanggal */}
      <div className="space-y-1.5 rounded-xl border border-border/60 p-3">
        <label htmlFor="tl-cek" className="text-xs font-bold text-foreground">
          Cek saldo di tanggal tertentu
        </label>
        <input
          id="tl-cek"
          type="date"
          value={checkDate}
          min={todayStr}
          onChange={(e) => setCheckDate(e.target.value)}
          className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
        />
        {checkBal !== null && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Pada <b className="text-foreground">{tgl(checkDate, true)}</b>, {goal.name} diperkirakan{" "}
            <b className="text-foreground">{formatRupiah(checkBal)}</b> ({Math.floor(checkPct)}% dari target).
          </p>
        )}
      </div>

      {/* Rincian */}
      {eta !== "done" && (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>{gran === "day" ? "Tanggal setoran" : gran === "week" ? "Minggu s.d." : "Akhir bulan"}</span>
            <span className="text-right">Setoran</span>
            <span className="min-w-[64px] text-right">Saldo</span>
          </div>
          <ul className="divide-y divide-border/50">
            {listRows.map((p, i) => (
              <li key={p.date} className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">
                  {i === 0 && p.date === todayStr ? "Hari ini" : tgl(p.date, true)}
                </span>
                <span className={`text-right font-bold ${p.added > 0 ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`}>
                  {p.added > 0 ? `+${formatRupiah(p.added)}` : "–"}
                </span>
                <span className="min-w-[64px] text-right text-foreground">{singkat(p.balance)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Perkiraan memakai jadwal gajian, biaya hidup, kasih ortu, dan tagihan bulanan yang sama dengan timeline per bulan.
      </p>
    </div>
  );
}
