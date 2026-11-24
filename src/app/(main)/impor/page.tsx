"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Gate } from "@/components/plan/gate";
import { parseStatementCsv, suggestCategory, type ParsedRow } from "@/lib/konsultan/csv-import";
import { getSpendableWallets, type WalletBalance } from "@/lib/data/wallets";
import { getCategories, type Category } from "@/lib/data/categories";
import { createTransactions, getTransactions } from "@/lib/data/transactions";
import { formatRupiah } from "@/lib/utils";

const MAX_BYTES = 1_000_000;

export default function ImporPage() {
  return (<div className="pb-24"><TopHeader title="Impor Mutasi" /><div className="px-4 pt-2"><Gate feature="impor_csv"><Impor /></Gate></div></div>);
}

function Impor() {
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<(ParsedRow & { on: boolean; cat: string | null })[] | null>(null);
  const [skipped, setSkipped] = React.useState(0);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [walletId, setWalletId] = React.useState("");
  const [cats, setCats] = React.useState<Category[]>([]);
  const [state, setState] = React.useState<"idle" | "saving" | "done">("idle");
  const [msg, setMsg] = React.useState("");
  const [history, setHistory] = React.useState<{ text: string; categoryId: string }[]>([]);

  React.useEffect(() => {
    getSpendableWallets().then((w) => { const a = w.filter((x) => !x.is_archived); setWallets(a); if (a[0]) setWalletId(a[0].id); }).catch(() => {});
    getCategories().then(setCats).catch(() => {});
    getTransactions({ limit: 300 }).then((t) => setHistory(t.filter((x) => x.category_id).map((x) => ({ text: `${x.merchant ?? ""} ${x.note ?? ""}`, categoryId: x.category_id as string })))).catch(() => {});
  }, []);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { setMsg("Berkas terlalu besar (maksimal 1 MB). Potong per bulan ya."); return; }
    setText(await f.text()); setMsg("");
  };
  const baca = () => {
    const r = parseStatementCsv(text);
    setSkipped(r.skipped); setState("idle");
    if (r.rows.length === 0) { setRows(null); setMsg("Tidak ada baris yang bisa dibaca. Pastikan ada kolom Tanggal dan Jumlah (atau Debit/Kredit) di baris pertama."); return; }
    setMsg("");
    setRows(r.rows.slice(0, 500).map((x) => ({ ...x, on: true, cat: suggestCategory(x.description, history) })));
  };
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiText, setAiText] = React.useState("");
  const [aiPdf, setAiPdf] = React.useState<string>("");
  const [aiPdfName, setAiPdfName] = React.useState("");
  const onPdf = async (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf") { setMsg("Berkas harus PDF."); return; }
    if (f.size > 2_900_000) { setMsg("PDF terlalu besar (maksimal sekitar 3 MB). Potong per bulan ya."); return; }
    const buf = new Uint8Array(await f.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    setAiPdf(btoa(bin)); setAiPdfName(f.name); setMsg("");
  };
  const bacaAi = async () => {
    setAiBusy(true); setMsg(""); setState("idle");
    try {
      const res = await fetch("/api/import-statement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: aiText || undefined, pdfBase64: aiPdf || undefined }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) { setMsg(typeof j.error === "string" ? j.error : "Mutasi belum bisa dibaca. Coba lagi sebentar."); setRows(null); return; }
      const got = (j.rows as ParsedRow[]);
      if (got.length === 0) { setMsg("AI tidak menemukan transaksi di isi tadi."); setRows(null); return; }
      setSkipped(0); setRows(got.slice(0, 300).map((x) => ({ ...x, on: true, cat: suggestCategory(x.description, history) })));
    } catch { setMsg("Mutasi belum bisa dibaca. Periksa sambungan internet lalu coba lagi."); }
    finally { setAiBusy(false); }
  };
  const chosen = (rows ?? []).filter((r) => r.on);
  const simpan = async () => {
    if (!walletId || chosen.length === 0) return;
    setState("saving"); setMsg("");
    try {
      await createTransactions(chosen.map((r) => ({ type: r.type, amount: r.amount, wallet_id: walletId, category_id: r.cat, date: r.date, merchant: r.description || null, note: "Impor mutasi", source: "manual" as const })));
      setState("done"); setMsg(`${chosen.length} transaksi berhasil dicatat.`); setRows(null); setText("");
    } catch { setState("idle"); setMsg("Belum bisa menyimpan. Tidak ada yang tercatat sebagian, coba lagi sebentar."); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Unduh mutasi dari m-banking dalam format CSV, lalu pilih berkasnya atau tempel isinya di sini. Kamu bisa meninjau dulu sebelum disimpan.</p>
      <input type="file" accept=".csv,text/csv,text/plain" aria-label="Pilih berkas CSV" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm" />
      <textarea aria-label="Isi CSV" className="h-32 w-full rounded-lg border bg-background p-2 text-xs" placeholder={"Tanggal,Keterangan,Jumlah\n24/11/2026,Kopi,-25.000"} value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="w-full" disabled={!text.trim()} onClick={baca}>Baca mutasi</Button>
      <Gate feature="impor_ai">
        <section aria-label="Impor dengan AI" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="font-semibold">Atau baca dengan AI (teks atau PDF)</p>
          <p className="text-xs text-muted-foreground">Tempel mutasi dari m-banking atau pilih PDF e-statement. Memakai 1 kuota AI. Hasilnya bisa salah, jadi selalu tinjau dulu sebelum disimpan.</p>
          <textarea aria-label="Isi mutasi untuk AI" className="h-24 w-full rounded-lg border bg-background p-2 text-xs" placeholder="Tempel isi mutasi di sini" value={aiText} onChange={(e) => setAiText(e.target.value)} />
          <input type="file" accept="application/pdf" aria-label="Pilih PDF e-statement" onChange={(e) => onPdf(e.target.files?.[0])} className="block w-full text-sm" />
          {aiPdfName && <p className="text-xs text-muted-foreground">PDF dipilih: {aiPdfName}</p>}
          <Button className="w-full" variant="outline" disabled={aiBusy || (!aiText.trim() && !aiPdf)} onClick={bacaAi}>{aiBusy ? "Membaca..." : "Baca dengan AI"}</Button>
        </section>
      </Gate>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${state === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{msg}</p>}
      {rows && (
        <div className="space-y-2">
          <p className="text-sm">{rows.length} baris terbaca{skipped > 0 ? `, ${skipped} baris dilewati karena tidak lengkap` : ""}. Hapus centang untuk yang tidak mau dicatat.</p>
          <label className="block space-y-1 text-sm">Masuk ke dompet
            <select aria-label="Dompet tujuan" className="h-9 w-full rounded-lg border bg-background px-2" value={walletId} onChange={(e) => setWalletId(e.target.value)}>{wallets.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</select></label>
          <ul className="max-h-80 space-y-1.5 overflow-auto">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 rounded-2xl p-2 border border-border/70 bg-card shadow-xs">
                <input type="checkbox" aria-label={`Catat ${r.description || "baris " + (i + 1)}`} checked={r.on} onChange={() => setRows(rows.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
                <span className="flex-1 text-sm">{r.description || "(tanpa keterangan)"}<span className="block text-xs text-muted-foreground">{r.date}</span>
                  <select aria-label={`Kategori ${r.description || "baris " + (i + 1)}`} className="mt-1 h-7 w-full max-w-[11rem] rounded-md border bg-background px-1 text-xs" value={r.cat ?? ""} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, cat: e.target.value || null } : x)))}>
                    <option value="">Tanpa kategori</option>{cats.filter((c) => c.type === r.type).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select></span>
                <b className={`text-sm ${r.type === "income" ? "text-emerald-600" : ""}`}>{r.type === "income" ? "+" : "-"}{formatRupiah(r.amount)}</b>
              </li>
            ))}
          </ul>
          <Button className="w-full" disabled={state === "saving" || chosen.length === 0 || !walletId} onClick={simpan}>{state === "saving" ? "Menyimpan..." : `Catat ${chosen.length} transaksi`}</Button>
        </div>
      )}
    </div>
  );
}
