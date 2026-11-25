"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Bubble, ReplyBubble, ReplyRow, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { loadPlanContext, persistPlanAnswers, type PlanContext } from "@/lib/data/plan-basis";
import { resolvePlanBasis, type PlanHints, type PlanBasis } from "@/lib/savings-queue";
import { parseBasisAnswer } from "@/lib/savings-answer";
import type { FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { formatRupiah } from "@/lib/utils";

type Ask = Extract<PlanBasis, { ok: false }>["ask"];

/**
 * Dasar hitung Money Planner untuk halaman yang butuh pemasukan dan pengeluaran bulanan (Kesehatan, Prediksi).
 * Pemasukan = gaji dari jadwal, pengeluaran = biaya hidup + tagihan + cicilan + komitmen rutin.
 * Bagian yang kosong ditanyakan; rata-rata hanya dipakai kalau pengguna memilihnya sendiri.
 */
export function MoneyBasisGate({ snap, children }: { snap: FinanceSnapshot; children: (s: FinanceSnapshot) => React.ReactNode }) {
  const [ctx, setCtx] = React.useState<PlanContext | null>(null);
  const [hints, setHints] = React.useState<PlanHints>({});
  const [incomeAvg, setIncomeAvg] = React.useState(false);
  const [text, setText] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [loadErr, setLoadErr] = React.useState("");
  const saved = React.useRef(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [spend, setSpend] = React.useState<"nyata" | "tetap" | null>(null);
  const [log, setLog] = React.useState<Msg[]>([]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt] = React.useState(() => nowLabel());
  React.useEffect(() => { getUserProfile().then(setProfile).catch(() => {}); }, []);

  React.useEffect(() => { loadPlanContext(snap.monthlyExpense).then(setCtx).catch(() => setLoadErr("Data rencanamu belum bisa dimuat.")); }, [snap.monthlyExpense]);

  const res = React.useMemo<PlanBasis | null>(() => {
    if (!ctx) return null;
    const b = { ...ctx.basisInput };
    if ((!b.payday || b.scheduleIncomeMonthly <= 0) && incomeAvg && snap.monthlyIncome > 0) {
      b.payday = { first: b.today, amount: Math.round(snap.monthlyIncome), frequency: "monthly" };
      b.scheduleIncomeMonthly = Math.round(snap.monthlyIncome);
    }
    return resolvePlanBasis(b, hints);
  }, [ctx, hints, incomeAvg, snap.monthlyIncome]);

  React.useEffect(() => {
    if (!res || !res.ok || saved.current) return;
    saved.current = true;
    persistPlanAnswers({
      newPayday: incomeAvg ? null : res.newPayday ? res.payday : null,
      livingMonthly: res.livingSource === "rencana" ? null : res.livingMonthly,
      otherFixedMonthly: res.otherFixedNew ? res.otherFixedMonthly : null,
    }).catch(() => {});
  }, [res, incomeAvg]);

  // Belum ada catatan sama sekali: tampilkan keadaan kosong bawaan halaman, jangan menanyai pengguna dulu.
  React.useEffect(() => { endRef.current?.scrollIntoView?.({ block: "end" }); }, [log.length, msg]);

  if (!snap.hasData) return <>{children(snap)}</>;
  if (loadErr) return <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{loadErr}</p>;
  if (!ctx || !res) return <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

  const say = (role: "model" | "user", t: string): Msg => ({ role, text: t, time: nowLabel() });
  type Q = { question: string; options: { label: string; run: () => void }[]; onText: (t: string) => boolean; hint: string };
  let q: Q | null = null;

  if (res.ok) {
    const fixedExDebt = Math.max(0, res.fixedMonthly - ctx.basisInput.debtMonthly);
    const actual = Math.round(snap.monthlyExpense);
    // Pengeluaran nyata jauh di atas biaya tetap: tanya dulu, jangan memakai rata-rata sendiri.
    if (spend === null && actual - fixedExDebt >= 100_000) {
      q = {
        question: `Pengeluaranmu selama ini rata-rata ${formatRupiah(actual)} per bulan, lebih besar dari biaya tetapmu ${formatRupiah(fixedExDebt)}. Untuk skor dan perkiraan, mau pakai pengeluaran nyata (rata-rata) atau biaya tetap saja?`,
        options: [
          { label: `Pakai pengeluaran nyata (${formatRupiah(actual)})`, run: () => setSpend("nyata") },
          { label: `Pakai biaya tetap saja (${formatRupiah(fixedExDebt)})`, run: () => setSpend("tetap") },
        ],
        onText: (t) => { if (/nyata|rata|ya\b|boleh/i.test(t)) { setSpend("nyata"); return true; } if (/tetap|tidak|gak|nggak/i.test(t)) { setSpend("tetap"); return true; } return false; },
        hint: 'Jawab "nyata" atau "tetap".',
      };
    } else {
      const label = incomeAvg ? "Pemasukan dari rata-rata pilihanmu" : "Pemasukan dari gaji di Rencana";
      const living = res.livingSource === "rata-rata" ? "biaya hidup dari rata-rata pilihanmu" : "biaya hidup yang kamu isi";
      const useReal = spend === "nyata";
      return <>{children({ ...snap, monthlyIncome: res.incomeMonthly, monthlyExpense: useReal ? Math.max(actual, fixedExDebt) : fixedExDebt, basisNote: `${label}, ${living}, tagihan, cicilan, dan komitmen rutin${useReal ? ", pengeluaran memakai rata-rata nyata pilihanmu" : ""}` })}</>;
    }
  } else {
    const ask: Ask = res.ask;
    const options: { label: string; run: () => void }[] = [];
    if (ask === "gaji" && snap.monthlyIncome > 0) options.push({ label: `Pakai rata-rata (${formatRupiah(snap.monthlyIncome)})`, run: () => setIncomeAvg(true) });
    if (ask === "biaya_hidup" && ctx.basisInput.avgMonthlyExpense > 0) options.push({ label: `Pakai rata-rata (${formatRupiah(ctx.basisInput.avgMonthlyExpense)})`, run: () => setHints((p) => ({ ...p, living_use_average: true })) });
    if (ask === "komitmen_rutin") options.push({ label: "Tidak ada", run: () => setHints((p) => ({ ...p, other_fixed_monthly: 0 })) });
    q = {
      question: res.question,
      options,
      onText: (t) => {
        const h = parseBasisAnswer(ask, t, ask === "biaya_hidup" && ctx.basisInput.avgMonthlyExpense > 0);
        if (!h) return false;
        setHints((p) => ({ ...p, ...h }));
        return true;
      },
      hint: "Tulis angkanya, misalnya 3 juta.",
    };
  }

  const cur = q!;
  const remember = (answerText: string) => setLog((l) => [...l, say("model", cur.question), say("user", answerText)]);
  const pick = (label: string, run: () => void) => { remember(label); setMsg(""); run(); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    if (!cur.onText(t)) { setMsg(`Jawabannya belum terbaca. ${cur.hint}`); return; }
    setMsg(""); setText(""); remember(t);
  };
  const options = cur.options;

  return (
    <div className="flex min-h-[calc(100dvh-17rem)] flex-col pb-20">
      <div className="mt-auto space-y-3 py-2">
        {log.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 || log[i - 1].role !== m.role} profile={profile} />))}
        <Bubble msg={{ role: "model", text: cur.question, time: openedAt || undefined }} first={log.length === 0 || log[log.length - 1].role !== "model"} profile={profile} />
        {options.length > 0 && (
          <ReplyBubble>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ketuk salah satu, atau ketik sendiri di bawah ya:</p>
            <div className="flex flex-col gap-2">
              {options.map((o) => (<ReplyRow key={o.label} label={o.label} onClick={() => pick(o.label, o.run)} />))}
            </div>
          </ReplyBubble>
        )}
        {msg && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{msg}</p>}
        <div ref={endRef} className="scroll-mb-28" />
      </div>
      <form onSubmit={submit} className="sticky z-20 -mx-4 flex shrink-0 items-center gap-2 border-t border-border/80 bg-card/90 p-3 backdrop-blur-md" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} aria-label="Jawabanmu" placeholder="Ketik jawabanmu di sini…" className="flex-1 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-teal-500/40" />
        <button type="submit" disabled={!text.trim()} aria-label="Kirim" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs transition-all hover:bg-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /></button>
      </form>
    </div>
  );
}
