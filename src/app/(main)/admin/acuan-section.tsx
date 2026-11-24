"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import * as A from "@/lib/data/admin";
import { Select } from "@/components/ui/select";

const empty = { code: "", name: "", value: "", unit: "persen", as_of: "", source_name: "", source_url: "", note: "" };

/** Form admin untuk acuan pasar (BI-Rate, LPS, SUN, SBN, IHSG, kurs, inflasi). */
export function AdminAcuanSection() {
  const [rows, setRows] = React.useState<A.Benchmark[] | null>(null);
  const [f, setF] = React.useState(empty);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(() => { A.getBenchmarks().then(setRows).catch(() => setRows([])); }, []);
  React.useEffect(() => { load(); }, [load]);
  const v = Number(f.value.replace(",", "."));
  const valid = /^[a-z0-9_]{2,40}$/.test(f.code) && f.name.trim() && f.value.trim() !== "" && Number.isFinite(v) && f.as_of && f.source_name.trim() && /^https:\/\//.test(f.source_url);
  const save = async () => {
    setBusy(true);
    try { await A.upsertBenchmark({ code: f.code, name: f.name.trim(), value: v, unit: f.unit, as_of: f.as_of, source_name: f.source_name.trim(), source_url: f.source_url, note: f.note.trim() || null }); notify("Acuan tersimpan"); setF(empty); load(); }
    catch (e) { notify(A.adminErrorText(e)); } finally { setBusy(false); }
  };
  const del = async (code: string) => { try { await A.deleteBenchmark(code); notify("Dihapus"); load(); } catch (e) { notify(A.adminErrorText(e)); } };
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-sm font-semibold">Acuan pasar (angka tunggal)</p>
      <p className="text-xs text-muted-foreground">Contoh kode: bi_rate, lps_tbp_umum, sun_10y, sr025_kupon, ihsg_ytd. Isi dari situs resmi (bi.go.id, lps.go.id, djppr.kemenkeu.go.id, idx.co.id).</p>
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Kode acuan" placeholder="kode_huruf_kecil" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.trim().toLowerCase() })} />
        <Select aria-label="Satuan" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}><option value="persen">Persen</option><option value="poin">Poin</option><option value="rupiah">Rupiah</option></Select>
      </div>
      <Input aria-label="Nama acuan" placeholder="Nama acuan" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Nilai acuan" inputMode="decimal" placeholder="Nilai" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value.replace(/[^\d.,-]/g, "") })} />
        <Input aria-label="Tanggal acuan" type="date" value={f.as_of} onChange={(e) => setF({ ...f, as_of: e.target.value })} />
      </div>
      <Input aria-label="Nama sumber" placeholder="Nama sumber, mis. Bank Indonesia" value={f.source_name} onChange={(e) => setF({ ...f, source_name: e.target.value })} />
      <Input aria-label="Alamat sumber acuan" placeholder="https:// alamat halaman resmi" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value.trim() })} />
      <Input aria-label="Catatan acuan" placeholder="Catatan (boleh kosong)" maxLength={120} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <Button className="h-10 w-full rounded-2xl text-xs" disabled={!valid || busy} onClick={save}>Simpan acuan</Button>
      <ul className="space-y-1">
        {(rows ?? []).map((b) => (
          <li key={b.code} className="flex items-center justify-between gap-2 rounded-lg bg-muted p-2 text-xs">
            <span className="min-w-0 truncate"><b>{b.code}</b> = {b.value} {b.unit} · {b.as_of}</span>
            <span className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setF({ code: b.code, name: b.name, value: String(b.value), unit: b.unit, as_of: b.as_of, source_name: b.source_name, source_url: b.source_url, note: b.note ?? "" })}>Ubah</Button><Button size="sm" variant="outline" aria-label={`Hapus ${b.code}`} onClick={() => del(b.code)}>Hapus</Button></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
