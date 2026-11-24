"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gate } from "@/components/plan/gate";
import { createGroup, joinGroup, listGroups, type GroupRow } from "@/lib/data/bersama";
import { PageHero } from "@/components/ui/form-kit";

export default function BersamaPage() {
  return (<div className="pb-24"><TopHeader title="Dompet Bersama" /><div className="space-y-4 px-4 pt-2"><PageHero title="Dompet Bersama" desc="Kelola uang berdua atau beramai-ramai." /><Gate feature="dompet_bersama"><Daftar /></Gate></div></div>);
}

function Daftar() {
  const router = useRouter();
  const [groups, setGroups] = React.useState<GroupRow[] | null>(null);
  const [err, setErr] = React.useState("");
  const [name, setName] = React.useState(""); const [me, setMe] = React.useState("");
  const [code, setCode] = React.useState(""); const [me2, setMe2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { listGroups().then(setGroups).catch(() => setErr("Daftar grup belum bisa dimuat. Coba lagi sebentar.")); }, []);
  const run = async (fn: () => Promise<string>) => { setBusy(true); setErr(""); try { router.push(`/bersama/${await fn()}`); } catch (e) { setErr(e instanceof Error ? e.message : "Belum berhasil."); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Catat patungan, aplikasi hitung siapa bayar ke siapa. Terpisah dari dompet pribadimu.</p>
      {err && <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>}
      {groups === null && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
      {groups && groups.length === 0 && <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada grup. Buat grup baru atau gabung dengan kode dari temanmu.</p>}
      <ul className="space-y-2">{(groups ?? []).map((g) => (<li key={g.id}><Link href={`/bersama/${g.id}`} className="flex items-center gap-3 rounded-2xl p-3 border border-border/70 bg-card shadow-xs"><Users className="size-5 text-teal-600" aria-hidden /><span className="font-medium">{g.name}</span></Link></li>))}</ul>
      <form className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs" aria-label="Buat grup" onSubmit={(e) => { e.preventDefault(); if (name.trim() && me.trim()) void run(() => createGroup(name.trim(), me.trim())); }}>
        <p className="font-semibold">Buat grup baru</p>
        <Input aria-label="Nama grup" placeholder="Nama grup, misal Liburan Bali" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Namamu di grup" placeholder="Namamu di grup" maxLength={30} value={me} onChange={(e) => setMe(e.target.value)} />
        <Button type="submit" className="w-full" disabled={busy || !name.trim() || !me.trim()}>Buat grup</Button>
      </form>
      <form className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs" aria-label="Gabung grup" onSubmit={(e) => { e.preventDefault(); if (code.trim() && me2.trim()) void run(() => joinGroup(code.trim(), me2.trim())); }}>
        <p className="font-semibold">Gabung dengan kode</p>
        <Input aria-label="Kode undangan" placeholder="Kode 8 huruf/angka" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Input aria-label="Namamu di grup (gabung)" placeholder="Namamu di grup" maxLength={30} value={me2} onChange={(e) => setMe2(e.target.value)} />
        <Button type="submit" variant="outline" className="w-full" disabled={busy || code.trim().length < 8 || !me2.trim()}>Gabung</Button>
      </form>
    </div>
  );
}
