"use client";

import * as React from "react";
import { PageHero } from "@/components/ui/form-kit";
import { Send, Trash2, ListChecks } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { Bubble, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { getFinanceSnapshot, type FinanceSnapshot } from "@/lib/data/finance-snapshot";
import { getBenchmarks } from "@/lib/data/admin";
import { addPurchase, deletePurchase, getPurchases, updatePurchase, type PurchaseRow } from "@/lib/data/purchase";
import { analyzePurchase, quickSummary, type PurchaseResult } from "@/lib/konsultan/purchase-calc";
import { parsePurchase, type ParsedPurchase } from "@/lib/konsultan/purchase-parse";
import { addMonths } from "@/lib/savings-feasibility";

const rp = (n: number) => formatRupiah(Math.round(n));
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const TONE: Record<string, string> = { aman: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", pas: "bg-amber-500/15 text-amber-800 dark:text-amber-300", berat: "bg-red-500/15 text-red-700 dark:text-red-300", belum_ada_data: "bg-muted text-muted-foreground" };
const LABEL: Record<string, string> = { aman: "Aman", pas: "Pas-pasan", berat: "Berat", belum_ada_data: "Belum bisa dinilai" };
const SUGGEST = ["Laptop 12jt tunai", "Motor 25jt cicilan 24 bulan dp 5jt", "HP 3jt 6 bulan lagi"];

function analyze(g: PurchaseRow, snap: FinanceSnapshot, infl: number): PurchaseResult {
  return analyzePurchase({ price: Number(g.price), downPayment: Number(g.down_payment), saved: Number(g.saved), mode: g.mode, months: g.months ?? 12, ratePctYear: Number(g.rate_pct ?? 0), targetDate: g.target_date, today: snap.today, income: snap.monthlyIncome, expense: snap.monthlyExpense, commitments: 0, inflationPct: infl });
}

export default function TargetBeliPage() {
  const [list, setList] = React.useState<PurchaseRow[] | null>(null);
  const [snap, setSnap] = React.useState<FinanceSnapshot | null>(null);
  const [infl, setInfl] = React.useState(3);
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
    try { const [l, s] = await Promise.all([getPurchases(), getFinanceSnapshot()]); setList(l); setSnap(s); return s; } catch { return null; }
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

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 300);
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: "user", text, time: nowLabel() }]);
    setInput("");
    setBusy(true);
    try {
      const p = parsePurchase(text);
      const merged: ParsedPurchase = { ...pending, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) };
      if (!merged.price) { setPending(merged); reply(merged.name ? `${merged.name}, harganya berapa? Contoh: 12jt` : "Mau beli apa dan harganya berapa? Contoh: Laptop 12jt"); return; }
      if (!merged.name) merged.name = "Barang";
      const cicil = merged.mode === "cicilan";
      const months = cicil ? Math.min(Math.max(merged.months ?? 12, 1), 360) : null;
      const dp = cicil ? Math.min(merged.downPayment ?? 0, merged.price - 1) : 0;
      const rate = cicil ? (merged.ratePct ?? 10) : null;
      const s = snap ?? (await load());
      const today = s?.today ?? new Date().toISOString().slice(0, 10);
      const row = { name: merged.name, price: merged.price, mode: cicil ? "cicilan" as const : "tunai" as const, down_payment: dp, months, rate_pct: rate, saved: merged.saved ?? 0, target_date: merged.targetMonths ? addMonths(today, merged.targetMonths) : null };
      await addPurchase(row);
      setPending(null);
      const fresh = await load();
      const g = { ...row, id: "", status: "aktif" } as unknown as PurchaseRow;
      const r = fresh ? analyze(g, fresh, infl) : null;
      const head = `**${row.name}** ${rp(row.price)}, ${cicil ? `cicilan ${months} bulan` : "tunai"}${r ? `: ${LABEL[r.verdict]}.` : " tersimpan."}`;
      const assume = cicil && (merged.months === undefined || merged.ratePct === undefined) ? "\nAsumsi cicilan 12 bulan dan bunga 10% per tahun kalau belum kamu sebut." : "";
      reply([head, ...(r && fresh ? quickSummary(r, rp, fmtDate).map((l) => `- ${l}`) : [])].join("\n") + assume);
    } catch { reply("Belum bisa disimpan. Coba lagi sebentar."); }
    finally { setBusy(false); }
  };

  const empty = (list?.length ?? 0) === 0;

  return (
    <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
      {dialog}
      <TopHeader title="Target Beli" subtitle="Ketik barang dan harganya" />
      <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-3 dark:bg-[#0b141a]">
        <PageHero title="Target Beli" desc="Ketik barang dan harganya, Ruby hitung mampu atau belum." className="mb-3" />
        <Bubble msg={{ role: "model", text: "Mau beli apa? Ketik barang dan harganya, nanti aku hitung mampu atau tidak.", time: openedAt || undefined }} first profile={profile} />
        {msgs.length === 0 && (
          <div className="ml-10 mt-2 flex flex-wrap gap-1.5">
            {SUGGEST.map((t) => (<button key={t} type="button" onClick={() => void send(t)} className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-[11px] text-zinc-800 shadow-sm dark:bg-[#202c33] dark:text-zinc-100">{t}</button>))}
          </div>
        )}
        {msgs.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 || msgs[i - 1].role !== m.role} profile={profile} />))}
        {busy && <p className="ml-10 mt-2 text-[11px] text-zinc-500">Menghitung...</p>}
        {showList && (
          <ul className="mt-3 space-y-2">
            {empty && <li className="rounded-xl bg-white p-3 text-xs text-zinc-600 shadow-sm dark:bg-[#202c33] dark:text-zinc-300">Belum ada target.</li>}
            {snap && list?.map((g) => {
              const r = analyze(g, snap, infl);
              return (
                <li key={g.id} className="space-y-1.5 rounded-xl bg-white p-3 text-xs text-zinc-900 shadow-sm dark:bg-[#202c33] dark:text-zinc-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate font-semibold">{g.name}{g.status === "terbeli" ? " (terbeli)" : ""}</p><p className="text-[11px] text-zinc-500 dark:text-zinc-400">{rp(Number(g.price))} · {g.mode === "cicilan" ? `cicilan ${g.months} bln` : "tunai"} · terkumpul {rp(Number(g.saved))}</p></div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[r.verdict]}`}>{LABEL[r.verdict]}</span>
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
      <p className="bg-background px-3 pt-1.5 text-center text-[10px] leading-tight text-muted-foreground">Perkiraan dari datamu, bukan nasihat keuangan atau tawaran kredit.</p>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background px-3 py-2.5">
        <button type="button" onClick={() => setShowList(!showList)} aria-pressed={showList} aria-label="Target saya" className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border ${showList ? "bg-teal-600 text-white" : "bg-muted/40"}`}><ListChecks className="h-4 w-4" /></button>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} aria-label="Pesan Target Beli" placeholder="Misal: Laptop 12jt cicilan 12 bulan" className="h-10 flex-1 rounded-full border border-border bg-muted/40 px-4 text-xs outline-none focus:ring-2 focus:ring-teal-500/40" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Kirim" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-teal-600 text-white shadow-sm disabled:opacity-40"><Send className="h-4 w-4" /></button>
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
