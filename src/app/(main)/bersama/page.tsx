"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/layout/top-header";
import { Input } from "@/components/ui/input";
import { Gate } from "@/components/plan/gate";
import { createGroup, joinGroup, listGroups, type GroupRow } from "@/lib/data/bersama";
import { PageHero, FormCard, Field, Cta, IconBox, Notice, EmptyState, Pill } from "@/components/ui/form-kit";

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
      <Pill icon="🤝">Patungan: aplikasi hitung siapa bayar ke siapa, terpisah dari dompet pribadimu</Pill>
      {err && <Notice tone="rose" emoji="⚠️" role="alert">{err}</Notice>}
      {groups === null && !err && <div className="h-20 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
      {groups && groups.length === 0 && <EmptyState emoji="👯">Belum ada grup. Buat grup baru atau gabung dengan kode dari temanmu.</EmptyState>}
      <ul className="space-y-2">{(groups ?? []).map((g) => (<li key={g.id}><Link href={`/bersama/${g.id}`} className="flex items-center gap-3 rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs transition-all active:scale-[0.98]"><IconBox tone="neon">👥</IconBox><span className="font-extrabold text-sm">{g.name}</span></Link></li>))}</ul>
      <form aria-label="Buat grup" onSubmit={(e) => { e.preventDefault(); if (name.trim() && me.trim()) void run(() => createGroup(name.trim(), me.trim())); }}>
        <FormCard title="Buat grup baru" desc="Mulai patungan bareng teman." icon="✨">
        <Input className="h-10 rounded-xl" aria-label="Nama grup" placeholder="Nama grup, misal Liburan Bali" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="h-10 rounded-xl" aria-label="Namamu di grup" placeholder="Namamu di grup" maxLength={30} value={me} onChange={(e) => setMe(e.target.value)} />
        <Cta type="submit" disabled={busy || !name.trim() || !me.trim()}>Buat grup</Cta></FormCard>
      </form>
      <form aria-label="Gabung grup" onSubmit={(e) => { e.preventDefault(); if (code.trim() && me2.trim()) void run(() => joinGroup(code.trim(), me2.trim())); }}>
        <FormCard title="Gabung dengan kode" desc="Minta kode 8 huruf dari temanmu." icon="🔑">
        <Input className="h-10 rounded-xl" aria-label="Kode undangan" placeholder="Kode 8 huruf/angka" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Input className="h-10 rounded-xl" aria-label="Namamu di grup (gabung)" placeholder="Namamu di grup" maxLength={30} value={me2} onChange={(e) => setMe2(e.target.value)} />
        <Cta type="submit" disabled={busy || code.trim().length < 8 || !me2.trim()} className="from-indigo-600 to-violet-500 shadow-indigo-600/25 hover:from-indigo-700 hover:to-violet-600">Gabung</Cta></FormCard>
      </form>
    </div>
  );
}
