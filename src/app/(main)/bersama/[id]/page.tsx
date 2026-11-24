"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gate } from "@/components/plan/gate";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { addExpense, addPayment, deleteExpense, deleteGroup, leaveGroup, loadGroup, myUserId } from "@/lib/data/bersama";
import { netBalances, suggestTransfers } from "@/lib/konsultan/shared-balance";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof loadGroup>>;

export default function GrupPage() {
  return (<div className="pb-24"><TopHeader title="Grup Patungan" /><div className="px-4 pt-2"><Gate feature="dompet_bersama"><Detail /></Gate></div></div>);
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ask, dialog] = useConfirm();
  const [d, setD] = React.useState<Data | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);
  const [err, setErr] = React.useState("");
  const [note, setNote] = React.useState(""); const [amount, setAmount] = React.useState(0);
  const [payer, setPayer] = React.useState(""); const [who, setWho] = React.useState<string[]>([]);
  const load = React.useCallback(async () => {
    try { const x = await loadGroup(id); setD(x); setUid(await myUserId()); setWho((w) => (w.length ? w : x.members.map((m) => m.user_id))); } catch { setErr("Grup belum bisa dimuat. Coba lagi sebentar."); }
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void load(); }, [load]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { if (uid && !payer) setPayer(uid); }, [uid, payer]);

  if (err) return <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{err}</p>;
  if (!d) return <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
  if (!d.group) return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Grup tidak ditemukan, atau kamu bukan anggotanya. <Link href="/bersama" className="underline">Kembali</Link></p>;

  const name = (u: string) => d.members.find((m) => m.user_id === u)?.display_name ?? "Anggota";
  const net = netBalances(d.members, d.expenses, d.payments);
  const transfers = suggestTransfers(net);
  const isOwner = d.group.owner_id === uid;
  const valid = note.trim().length > 0 && amount > 0 && who.length > 0 && payer;
  const act = async (fn: () => Promise<void>, ok?: string) => { try { await fn(); await load(); if (ok) notify(ok); } catch { notify("Belum berhasil. Coba lagi sebentar."); } };

  return (
    <div className="space-y-4">
      {dialog}
      <Link href="/bersama" className="inline-flex items-center gap-1 text-sm text-teal-600"><ArrowLeft className="size-4" aria-hidden /> Semua grup</Link>
      <div><h2 className="text-xl font-bold">{d.group.name}</h2>
        <button type="button" className="mt-1 inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(d.group!.invite_code); notify("Kode undangan disalin"); } catch { notify(`Kode undangan: ${d.group!.invite_code}`); } }}><Copy className="size-3" aria-hidden /> Kode undangan: <b>{d.group.invite_code}</b></button>
        <p className="mt-1 text-xs text-muted-foreground">Anggota: {d.members.map((m) => m.display_name).join(", ")}</p></div>

      <section aria-label="Siapa bayar ke siapa" className="space-y-2">
        <h3 className="font-semibold">Siapa bayar ke siapa</h3>
        {transfers.length === 0 ? <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">Semua sudah impas.</p> : (
          <ul className="space-y-2">{transfers.map((t, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg p-3 ring-1 ring-foreground/10 text-sm">
              <span><b>{name(t.from)}</b> bayar ke <b>{name(t.to)}</b><span className="block font-semibold">{formatRupiah(t.amount)}</span></span>
              {(t.from === uid || t.to === uid) && <Button size="sm" variant="outline" onClick={() => act(() => addPayment({ group_id: id, from_user: t.from, to_user: t.to, amount: t.amount }), "Pembayaran dicatat")}>Sudah dibayar</Button>}
            </li>))}</ul>)}
      </section>

      <form aria-label="Catat pengeluaran" className="space-y-2 rounded-xl p-3 ring-1 ring-foreground/10" onSubmit={(e) => { e.preventDefault(); if (!valid) return; void act(async () => { await addExpense({ group_id: id, paid_by: payer, amount, note: note.trim(), split_among: who }); setNote(""); setAmount(0); }, "Pengeluaran dicatat"); }}>
        <p className="font-semibold">Catat pengeluaran</p>
        <Input aria-label="Untuk apa" placeholder="Untuk apa, misal Makan malam" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
        <MoneyInput aria-label="Jumlah pengeluaran" value={amount} onChange={setAmount} suffix="Rp" placeholder="Jumlah" />
        <label className="block text-sm">Dibayar oleh
          <select aria-label="Dibayar oleh" className="mt-1 h-9 w-full rounded-lg border bg-background px-2" value={payer} onChange={(e) => setPayer(e.target.value)}>{d.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
        <fieldset className="text-sm"><legend className="mb-1">Dibagi rata ke</legend>
          <div className="flex flex-wrap gap-2">{d.members.map((m) => (<label key={m.user_id} className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1"><input type="checkbox" checked={who.includes(m.user_id)} onChange={() => setWho(who.includes(m.user_id) ? who.filter((x) => x !== m.user_id) : [...who, m.user_id])} />{m.display_name}</label>))}</div></fieldset>
        <Button type="submit" className="w-full" disabled={!valid}>Simpan pengeluaran</Button>
      </form>

      <section aria-label="Riwayat pengeluaran" className="space-y-2">
        <h3 className="font-semibold">Riwayat</h3>
        {d.expenses.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengeluaran.</p>}
        <ul className="space-y-1.5">{d.expenses.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 rounded-lg p-2.5 ring-1 ring-foreground/10 text-sm">
            <span>{x.note}<span className="block text-xs text-muted-foreground">{name(x.paid_by)} bayar · dibagi {x.split_among.length} orang · {x.date}</span></span>
            <span className="flex items-center gap-2"><b>{formatRupiah(Number(x.amount))}</b>
              {x.created_by === uid && <button type="button" aria-label={`Hapus ${x.note}`} onClick={async () => { if (await ask(`Hapus pengeluaran "${x.note}"?`)) await act(() => deleteExpense(x.id)); }}><Trash2 className="size-4 text-muted-foreground" /></button>}</span>
          </li>))}</ul>
      </section>

      <div className="flex gap-2">
        {!isOwner && uid && <Button variant="outline" className="flex-1" onClick={async () => { if (await ask("Keluar dari grup ini?", "Ya, keluar")) { await leaveGroup(id, uid); router.push("/bersama"); } }}>Keluar grup</Button>}
        {isOwner && <Button variant="outline" className="flex-1" onClick={async () => { if (await ask("Hapus grup beserta semua catatannya untuk semua anggota?")) { await deleteGroup(id); router.push("/bersama"); } }}>Hapus grup</Button>}
      </div>
    </div>
  );
}
