"use client";

import * as React from "react";
import Link from "next/link";
import { TopHeader } from "@/components/layout/top-header";
import { createClient } from "@/lib/supabase/client";
import { getMfaStatus } from "@/lib/data/admin";
import { creativeSummary, parseCreativeExport, type CreativeRow, type CreativeSnapshot } from "@/lib/marketing-creative";

const idr = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const integer = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const percent = (n: number) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)}%`;

export default function MarketingPerformancePage() {
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  const [snapshot, setSnapshot] = React.useState<CreativeSnapshot | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);

  const load = React.useCallback(async () => {
    const status = await getMfaStatus();
    if (!status.role || (status.require_mfa && status.aal !== "aal2")) { setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await createClient().rpc("admin_latest_marketing_creative");
    if (error) throw error;
    setSnapshot(data as CreativeSnapshot | null);
  }, []);
  React.useEffect(() => { Promise.resolve().then(load).catch((e) => setMessage(e instanceof Error ? e.message : "Data belum bisa dibaca.")); }, [load]);

  async function importFile(file: File) {
    setBusy(true); setMessage("");
    try {
      if (file.size > 5_000_000) throw new Error("CSV terlalu besar (maksimal 5 MB).");
      const parsed = parseCreativeExport(await file.text());
      const { data, error } = await createClient().rpc("admin_import_marketing_creative", {
        p_start: parsed.period_start, p_end: parsed.period_end, p_rows: parsed.rows,
      });
      if (error) throw error;
      setMessage(`${integer(data ?? parsed.rows.length)} iklan tersimpan untuk ${parsed.period_start} – ${parsed.period_end}.`);
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Impor gagal."); }
    finally { setBusy(false); }
  }

  const rows = snapshot?.rows ?? [];
  const summary = creativeSummary(rows);
  const q = query.toLocaleLowerCase("id-ID").trim();
  const filtered = q ? rows.filter((r) => [r.ADVERTISER, r.PRODUK, r["NAMA IKLAN"], r.CAMPAIGN, r.CREATOR, r.EDITOR].some((s) => s.toLocaleLowerCase("id-ID").includes(q))) : rows;
  const ranked = [...filtered].sort((a, b) => Number(b.SPEND) - Number(a.SPEND));
  const visible = showAll ? ranked.slice(0, 200) : ranked.slice(0, 20);

  return <div className="pb-24">
    <TopHeader title="Performa marketing" />
    <div className="space-y-4 px-4 pt-2">
      <div><Link href="/admin" className="text-xs font-semibold text-teal-600">← Admin</Link><h1 className="mt-2 text-xl font-extrabold">Performa Creative</h1><p className="text-xs text-muted-foreground">Data iklan dari tab Creative Marketing Suite Mr.BOB.</p></div>
      {allowed === null && <p className="text-sm text-muted-foreground">Memeriksa akses…</p>}
      {allowed === false && <p role="alert" className="rounded-2xl bg-rose-500/10 p-4 text-sm">Hanya admin dengan verifikasi yang diperlukan yang dapat membuka data ini.</p>}
      {allowed && <>
        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <h2 className="text-sm font-bold">Impor dari Marketing Suite</h2>
          <p className="mt-1 text-xs text-muted-foreground">Buka tab Creative, pilih periode, klik Export CSV, lalu unggah berkasnya di sini. Mengimpor periode yang sama akan memperbarui snapshotnya.</p>
          <label className="mt-3 block rounded-2xl border border-dashed border-teal-500/50 bg-teal-500/5 px-4 py-3 text-center text-xs font-bold text-teal-700 dark:text-teal-300">
            {busy ? "Menyimpan…" : "Pilih CSV Creative"}
            <input type="file" accept=".csv,text/csv" disabled={busy} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ""; }} />
          </label>
          {message && <p role="status" className="mt-2 text-xs">{message}</p>}
        </section>
        {snapshot ? <>
          <p className="text-xs text-muted-foreground">Periode {snapshot.period_start} – {snapshot.period_end} · Impor {new Date(snapshot.imported_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>
          <div className="grid grid-cols-2 gap-2">
            {[["Link konten unik", integer(summary.contents)], ["Iklan", integer(summary.ads)], ["Spend", idr(summary.spend)], ["Impression", integer(summary.impressions)], ["CTR", percent(summary.ctr)], ["Lead", integer(summary.leads)], ["CPL", summary.cpl === null ? "–" : idr(summary.cpl)], ["Klik link", integer(summary.clicks)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>)}
          </div>
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Iklan berdasarkan spend</h2>
            <input aria-label="Cari iklan" placeholder="Cari iklan, produk, advertiser, creator…" value={query} onChange={(e) => { setQuery(e.target.value); setShowAll(false); }} className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm" />
            <p className="text-[11px] text-muted-foreground">{integer(filtered.length)} iklan cocok · Iklan dengan post yang sama tetap ditampilkan terpisah.</p>
            {visible.map((r, i) => <CreativeAd key={`${i}-${r["NAMA IKLAN"]}`} row={r} />)}
            {ranked.length > visible.length && <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-2xl bg-muted px-3 py-2 text-xs font-bold">Tampilkan hingga 200 iklan</button>}
          </section>
        </> : <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada snapshot. Impor CSV Creative pertama untuk mulai melihat performa.</p>}
      </>}
    </div>
  </div>;
}

function CreativeAd({ row }: { row: CreativeRow }) {
  const spend = Number(row.SPEND) || 0, leads = Number(row.LEADS) || 0;
  return <article className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
    <div className="flex justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{row["NAMA IKLAN"] || "Tanpa nama"}</p><p className="truncate text-[11px] text-muted-foreground">{row.PRODUK || row.ADVERTISER} · {row["FORMAT KONTEN"]} · {row.STATUS}</p></div><span className="shrink-0 text-xs font-bold">{idr(spend)}</span></div>
    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]"><span>Impr<br/><b>{integer(Number(row.IMPRESSION) || 0)}</b></span><span>CTR<br/><b>{row["CTR %"] || "0"}%</b></span><span>Lead<br/><b>{integer(leads)}</b></span><span>CPL<br/><b>{leads ? idr(spend / leads) : "–"}</b></span></div>
    {(row.CREATOR || row.EDITOR) && <p className="mt-2 text-[10px] text-muted-foreground">Creator: {row.CREATOR || "–"} · Editor: {row.EDITOR || "–"}</p>}
    {row["LINK KONTEN"].startsWith("https://") && <a href={row["LINK KONTEN"]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-teal-600">Lihat konten ↗</a>}
  </article>;
}
