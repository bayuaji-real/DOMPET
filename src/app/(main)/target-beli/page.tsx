"use client";

import * as React from "react";
import { IconBox, EmptyState } from "@/components/ui/form-kit";
import { Send, Trash2, ListChecks } from "lucide-react";
import { PageGate } from "@/components/plan/gate";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { Bubble, ReplyBubble, ReplyRow, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getBenchmarks } from "@/lib/data/admin";
import { addPurchase, deletePurchase, getPurchases, updatePurchase, type PurchaseRow } from "@/lib/data/purchase";
import { analyzePurchase, quickSummary, type PurchaseResult } from "@/lib/konsultan/purchase-calc";
import { parseAmount, parsePurchase, type ParsedPurchase } from "@/lib/konsultan/purchase-parse";
import { loadPlanContext, persistPlanAnswers, type PlanContext } from "@/lib/data/plan-basis";
import { resolvePlanBasis, type PlanBasis, type PlanHints, type QueueBasis, type QueueGoal } from "@/lib/savings-queue";
import { parseBasisAnswer, type AskKind } from "@/lib/savings-answer";
import { addMonths } from "@/lib/savings-feasibility";

const rp = (n: number) => formatRupiah(Math.round(n));
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const TONE: Record<string, string> = { aman: "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold", pas: "border-amber-400/50 bg-amber-500/15 text-amber-800 dark:text-amber-300", berat: "border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-300", belum_ada_data: "border-border/70 bg-muted text-muted-foreground" };
const EMOJI: Record<string, string> = { aman: "✅", pas: "⚖️", berat: "🔥", belum_ada_data: "❔" };
const LABEL: Record<string, string> = { aman: "Aman", pas: "Pas-pasan", berat: "Berat", belum_ada_data: "Belum bisa dinilai" };
const SUGGEST = ["Laptop 12jt tunai", "Motor 25jt cicilan 24 bulan dp 5jt", "HP 3jt 6 bulan lagi"];

const cashNeededOf = (g: PurchaseRow) => (g.mode === "cicilan" ? Number(g.down_payment) : Number(g.price));

/**
 * Dasar hitung Money Planner: gaji - biaya tetap, antrean bersama tabungan dan target beli lain.
 * Data yang kurang tidak ditebak: hasilnya "resolved" berisi pertanyaan untuk pengguna.
 */
function basisFor(ctx: PlanContext, hints: PlanHints, purchases: PurchaseRow[], selfId: string | null, avgIncome = 0): { resolved: PlanBasis; basis: QueueBasis | null } {
  const input = { ...ctx.basisInput };
  // Pemasukan rata-rata hanya dipakai kalau pengguna sendiri memilihnya.
  if ((!input.payday || input.scheduleIncomeMonthly <= 0) && avgIncome > 0) {
    input.payday = { first: input.today, amount: Math.round(avgIncome), frequency: "monthly" };
    input.scheduleIncomeMonthly = Math.round(avgIncome);
  }
  const resolved = resolvePlanBasis(input, hints);
  if (!resolved.ok) return { resolved, basis: null };
  const others: QueueGoal[] = [
    ...ctx.savingsGoals,
    ...purchases.filter((p) => p.status === "aktif" && p.id !== selfId).map((p) => ({ name: p.name, target: cashNeededOf(p), saved: Number(p.saved), deadline: p.target_date })),
  ];
  return { resolved, basis: { incomeMonthly: resolved.incomeMonthly, fixedMonthly: resolved.fixedMonthly, payday: resolved.payday, otherMonthlyCommitments: ctx.savingsMonthly, others } };
}

function analyze(g: PurchaseRow, today: string, infl: number | null, basis: QueueBasis | null): PurchaseResult {
  return analyzePurchase({ name: g.name, price: Number(g.price), downPayment: Number(g.down_payment), saved: Number(g.saved), mode: g.mode, months: g.months ?? 12, ratePctYear: Number(g.rate_pct ?? 0), targetDate: g.target_date, today, basis, inflationPct: infl });
}

type Field = "dp" | "months" | "rate";
const fieldQuestion = (f: Field) => f === "dp" ? "DP-nya berapa? Contoh: 5jt, atau ketik 0 kalau tanpa DP." : f === "months" ? "Tenornya berapa bulan? Contoh: 24 bulan." : "Bunga cicilannya berapa persen per tahun (flat)? Contoh: 10%.";
function readField(f: Field, text: string): Partial<ParsedPurchase> | null {
  const t = text.toLowerCase().trim();
  if (f === "dp") {
    if (/^(0|nol|tidak ada|tanpa dp|nggak ada|gak ada)\W*$/.test(t)) return { downPayment: 0 };
    const v = parseAmount(t.replace(/^dp\s*/, ""));
    return v > 0 ? { downPayment: v } : null;
  }
  if (f === "months") {
    const m = /(\d+)\s*(bulan|bln|tahun|thn|x)?/.exec(t);
    if (!m) return null;
    const n = Number(m[1]) * (m[2] && /^t/.test(m[2]) ? 12 : 1);
    return n >= 1 && n <= 360 ? { months: n } : null;
  }
  const m = /(\d+(?:[.,]\d+)?)/.exec(t);
  if (!m) return null;
  const r = Number(m[1].replace(",", "."));
  return r >= 0 && r <= 100 ? { ratePct: r } : null;
}

export default function TargetBeliPage() {
  return <PageGate feature="target_beli" title="Target Beli"><TargetBeliInner /></PageGate>;
}

function TargetBeliInner() {
  const [list, setList] = React.useState<PurchaseRow[] | null>(null);
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [infl, setInfl] = React.useState<number | null>(null);
  const [ctx, setCtx] = React.useState<PlanContext | null>(null);
  const [hints, setHints] = React.useState<PlanHints>({});
  const [awaitBasis, setAwaitBasis] = React.useState<{ kind: AskKind; question: string } | null>(null);
  const [incomeAvg, setIncomeAvg] = React.useState(false);
  const [askField, setAskField] = React.useState<Field | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState<ParsedPurchase | null>(null);
  const [showList, setShowList] = React.useState(false);
  const [openedAt, setOpenedAt] = React.useState("");
  const [ask, dialog] = useConfirm();
  const endRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const [l, s] = await Promise.all([getPurchases(), getFinanceSnapshot()]);
      const c = await loadPlanContext(s.monthlyExpense);
      setList(l); setSnap(s); setCtx(c);
      return { l, s, c };
    } catch { return null; }
  }, []);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenedAt(nowLabel());
    void load();
    getBenchmarks().then((b) => { const x = b.find((r) => r.code === "inflasi_yoy"); if (x) setInfl(Number(x.value)); }).catch(() => {});
    getUserProfile().then(setProfile).catch(() => {});
  }, [load]);
  React.useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [msgs, busy, showList]);

  const reply = (text: string) => setMsgs((m) => [...m, { role: "model", text, time: nowLabel() }]);

  const finish = async (merged: ParsedPurchase, h: PlanHints, avg = incomeAvg) => {
    const loaded = ctx && snap && list ? { l: list, s: snap, c: ctx } : await load();
    if (!loaded) { reply("Belum bisa membaca datamu. Coba lagi sebentar."); return; }
    const { l, s, c } = loaded;
    const bp = basisFor(c, h, l, null, avg ? s.monthlyIncome : 0);
    if (!bp.resolved.ok) {
      // Gaji, biaya hidup, atau komitmen rutin belum ada: tanya, jangan tebak dan jangan pakai rata-rata tanpa persetujuan.
      setPending(merged);
      setAwaitBasis({ kind: bp.resolved.ask, question: bp.resolved.question });
      reply(bp.resolved.question);
      return;
    }
    const rb = bp.resolved;
    if ((rb.newPayday && !avg) || rb.livingSource !== "rencana" || rb.otherFixedNew) {
      await persistPlanAnswers({ newPayday: rb.newPayday && !avg ? rb.payday : null, livingMonthly: rb.livingSource !== "rencana" ? rb.livingMonthly : null, otherFixedMonthly: rb.otherFixedNew ? rb.otherFixedMonthly : null });
    }
    const cicil = merged.mode === "cicilan";
    const months = cicil ? Math.min(Math.max(merged.months ?? 1, 1), 360) : null;
    const dp = cicil ? Math.min(merged.downPayment ?? 0, merged.price! - 1) : 0;
    const rate = cicil ? (merged.ratePct ?? 0) : null;
    const today = s.today;
    const row = { name: merged.name!, price: merged.price!, mode: cicil ? "cicilan" as const : "tunai" as const, down_payment: dp, months, rate_pct: rate, saved: merged.saved ?? 0, target_date: merged.targetMonths ? addMonths(today, merged.targetMonths) : null };
    await addPurchase(row);
    setPending(null); setAwaitBasis(null); setHints({}); setAskField(null); setIncomeAvg(false);
    const g = { ...row, id: "", status: "aktif" } as unknown as PurchaseRow;
    const r = analyze(g, today, infl, bp.basis);
    const head = `**${row.name}** ${rp(row.price)}, ${cicil ? `cicilan ${months} bulan` : "tunai"}: ${LABEL[r.verdict]}.`;
    reply([head, ...quickSummary(r, rp, fmtDate).map((x) => `- ${x}`)].join("\n"));
    await load();
  };

  const chips: { label: string; run: () => void }[] = [];
  if (awaitBasis && pending && !busy) {
    if (awaitBasis.kind === "gaji" && (snap?.monthlyIncome ?? 0) > 0) chips.push({ label: `Pakai rata-rata (${rp(snap!.monthlyIncome)})`, run: () => { setIncomeAvg(true); void finish(pending, hints, true); } });
    if (awaitBasis.kind === "biaya_hidup" && (ctx?.basisInput.avgMonthlyExpense ?? 0) > 0) chips.push({ label: `Pakai rata-rata (${rp(ctx!.basisInput.avgMonthlyExpense)})`, run: () => { const n = { ...hints, living_use_average: true }; setHints(n); void finish(pending, n); } });
    if (awaitBasis.kind === "komitmen_rutin") chips.push({ label: "Tidak ada", run: () => { const n = { ...hints, other_fixed_monthly: 0 }; setHints(n); void finish(pending, n); } });
  }
  const pickChip = async (label: string, run: () => void) => {
    if (busy) return;
    setMsgs((m) => [...m, { role: "user", text: label, time: nowLabel() }]);
    setBusy(true);
    try { run(); } finally { setBusy(false); }
  };

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 300);
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: "user", text, time: nowLabel() }]);
    setInput("");
    setBusy(true);
    try {
      let base = pending;
      // 1. Jawaban atas pertanyaan balik (gaji, tanggal gajian, biaya hidup, komitmen rutin)
      if (awaitBasis && base) {
        const ans = parseBasisAnswer(awaitBasis.kind, text, (snap?.monthlyExpense ?? 0) > 0);
        if (ans) {
          const next: PlanHints = { ...hints, ...ans };
          if (ans.monthly_living_cost) delete next.living_use_average;
          setHints(next);
          await finish(base, next);
          return;
        }
        if (!parsePurchase(text).price) { reply(`Belum terbaca ya. ${awaitBasis.question}`); return; }
        // Pengguna malah mengetik barang baru: mulai dari awal.
        setAwaitBasis(null); setHints({}); setPending(null); base = null;
      }
      // 2. Isian cicilan yang kurang, atau kalimat barang baru
      let merged: ParsedPurchase;
      if (askField && base) {
        const patch = readField(askField, text);
        if (!patch) { reply(fieldQuestion(askField)); return; }
        merged = { ...base, ...patch };
      } else {
        const p = parsePurchase(text);
        merged = { ...base, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) };
      }
      setAskField(null);
      if (!merged.price) { setPending(merged); reply(merged.name ? `${merged.name}, harganya berapa? Contoh: 12jt` : "Mau beli apa dan harganya berapa? Contoh: Laptop 12jt"); return; }
      if (!merged.name) merged.name = "Barang";
      if (merged.mode === "cicilan") {
        const missing: Field | null = merged.downPayment === undefined ? "dp" : merged.months === undefined ? "months" : merged.ratePct === undefined ? "rate" : null;
        if (missing) { setPending(merged); setAskField(missing); reply(fieldQuestion(missing)); return; }
      }
      await finish(merged, hints);
    } catch { reply("Belum bisa disimpan. Coba lagi sebentar."); }
    finally { setBusy(false); }
  };

  const empty = (list?.length ?? 0) === 0;

  return (
    <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
      {dialog}
      <TopHeader title="Target Beli" subtitle="Ketik barang dan harganya" />
      <div className="flex-1 overflow-y-auto bg-background/50 px-3.5 py-4 space-y-3">
        <Bubble msg={{ role: "model", text: "Mau beli apa? Ketik barang dan harganya, nanti aku bantu budgetingnya.", time: openedAt || undefined }} first profile={profile} />
        {msgs.length === 0 && (
          <ReplyBubble>
            <p className="mb-1.5">Ketuk salah satu, atau ketik sendiri di bawah ya:</p>
            <div className="flex flex-col gap-1.5">{SUGGEST.map((t) => (<ReplyRow key={t} label={t} onClick={() => void send(t)} />))}</div>
          </ReplyBubble>
        )}
        {msgs.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 || msgs[i - 1].role !== m.role} profile={profile} />))}
        {chips.length > 0 && (
          <ReplyBubble>
            <p className="mb-1.5">Ketuk salah satu, atau ketik sendiri di bawah ya:</p>
            <div className="flex flex-col gap-1.5">{chips.map((c) => (<ReplyRow key={c.label} label={c.label} onClick={() => void pickChip(c.label, c.run)} />))}</div>
          </ReplyBubble>
        )}
        {busy && <p className="ml-10 mt-2 text-[11px] text-zinc-500">Menghitung...</p>}
        {showList && (
          <ul className="mt-3 space-y-2">
            {empty && <li><EmptyState emoji="🛍️">Belum ada target.</EmptyState></li>}
            {snap && ctx && list?.map((g) => {
              const r = analyze(g, snap.today, infl, basisFor(ctx, {}, list, g.id).basis);
              return (
                <li key={g.id} className="space-y-2 rounded-3xl border border-border/60 bg-white p-3.5 text-xs text-zinc-900 shadow-sm dark:bg-[#202c33] dark:text-zinc-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5"><IconBox tone={r.verdict === "aman" ? "neon" : r.verdict === "berat" ? "rose" : "amber"}>🛍️</IconBox><div className="min-w-0"><p className="truncate text-sm font-extrabold">{g.name}{g.status === "terbeli" ? " (terbeli)" : ""}</p><p className="text-[11px] text-zinc-500 dark:text-zinc-400">{rp(Number(g.price))} · {g.mode === "cicilan" ? `cicilan ${g.months} bln` : "tunai"} · terkumpul {rp(Number(g.saved))}</p></div></div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${TONE[r.verdict]}`}><span aria-hidden>{EMOJI[r.verdict]} </span>{LABEL[r.verdict]}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <AddFunds onSave={async (n) => { try { await updatePurchase(g.id, { saved: Number(g.saved) + n }); await load(); } catch { notify("Belum bisa disimpan."); } }} />
                    {g.status === "aktif" && <Button size="sm" variant="outline" onClick={async () => { try { await updatePurchase(g.id, { status: "terbeli" }); await load(); } catch { notify("Belum bisa diubah."); } }}>Sudah terbeli</Button>}
                    <Button size="sm" variant="outline" aria-label={`Hapus ${g.name}`} onClick={async () => { if (await ask(`Hapus target beli "${g.name}"?`, "Hapus")) { try { await deletePurchase(g.id); await load(); } catch { notify("Belum bisa dihapus."); } } }}><Trash2 className="size-4" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background px-3 py-2.5">
        <button type="button" onClick={() => setShowList(!showList)} aria-pressed={showList} aria-label="Target saya" className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border ${showList ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300" : "bg-muted/40"}`}><ListChecks className="h-4 w-4" /></button>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} aria-label="Pesan Target Beli" placeholder="Misal: Laptop 12jt cicilan 12 bulan" className="h-10 flex-1 rounded-full border border-border bg-muted/40 px-4 text-xs outline-none focus:ring-2 focus:ring-emerald-400/50" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Kirim" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30 transition-all active:scale-90 disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function AddFunds({ onSave }: { onSave: (n: number) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState(0);
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Tambah dana</Button>;
  return (
    <div className="flex w-full items-center gap-2">
      <div className="min-w-0 flex-1"><MoneyInput value={v} onChange={setV} aria-label="Tambah dana terkumpul" suffix="Rp" /></div>
      <Button size="sm" disabled={v <= 0} onClick={async () => { await onSave(v); setV(0); setOpen(false); }}>Simpan</Button>
      <Button size="sm" variant="outline" onClick={() => { setV(0); setOpen(false); }}>Batal</Button>
    </div>
  );
}
