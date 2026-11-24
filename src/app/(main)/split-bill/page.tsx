"use client";

import * as React from "react";
import { Check, Copy, Loader2, Plus, Share2, Trash2, UserPlus, X } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateSplit,
  splitSummaryText,
  type SplitExtras,
  type SplitItem,
  type SplitPerson,
} from "@/lib/split-bill";
import { getSpendableWallets, type WalletBalance } from "@/lib/data/wallets";
import { createTransaction } from "@/lib/data/transactions";
import { formatRupiah, triggerHapticFeedback } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { FormCard } from "@/components/ui/form-kit";
import { compressImage } from "@/lib/image-compression";
import { receiptToSplit } from "@/lib/split-bill-scan";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";
import { PageHero } from "@/components/ui/form-kit";

const DRAFT_KEY = "dompet_split_bill_draft";
const uid = () => Math.random().toString(36).slice(2, 9);
const toNum = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtInput = (n: number) => (n > 0 ? n.toLocaleString("id-ID") : "");

interface Draft {
  title: string;
  people: SplitPerson[];
  items: SplitItem[];
  extras: SplitExtras;
  payerId: string;
}

const ME: SplitPerson = { id: "me", name: "Aku" };

function emptyDraft(): Draft {
  return {
    title: "",
    people: [ME],
    // id tetap untuk item pertama supaya aman saat prerender (uid acak hanya dipakai setelah halaman terbuka)
    items: [{ id: "item-1", name: "", price: 0, qty: 1, sharedBy: ["me"] }],
    extras: { taxPercent: 0, servicePercent: 0, discount: 0, shipping: 0, otherFee: 0, shippingMode: "equal" },
    payerId: "me",
  };
}

export default function SplitBillPage() {
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [walletId, setWalletId] = React.useState("");
  const [recordState, setRecordState] = React.useState<"idle" | "saving" | "done" | "error">("idle");
  // Layar pertama: pilih cara mengisi. Draf lama yang sudah berisi langsung dilanjutkan.
  const [mode, setMode] = React.useState<"pilih" | "manual" | "foto">("pilih");
  const [scanning, setScanning] = React.useState(false);
  const [scanMsg, setScanMsg] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Pulihkan draf terakhir (kalau ada) dan muat dompet untuk fitur "catat bagianku"
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = { ...emptyDraft(), ...JSON.parse(raw) } as Draft;
        setDraft(d);
        const filled = d.title.trim() || d.people.length > 1 || d.items.some((i) => i.name.trim() || i.price > 0);
        if (filled) setMode("manual");
      }
    } catch {}
    setLoaded(true);
    getSpendableWallets()
      .then((list) => {
        const active = list.filter((w) => !w.is_archived);
        setWallets(active);
        if (active[0]) setWalletId(active[0].id);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft, loaded]);

  const update = (patch: Partial<Draft>) => {
    setRecordState("idle");
    setDraft((d) => ({ ...d, ...patch }));
  };
  const setExtras = (patch: Partial<SplitExtras>) => update({ extras: { ...draft.extras, ...patch } });

  const result = React.useMemo(() => calculateSplit(draft.people, draft.items, draft.extras), [draft]);
  const payer = draft.people.find((p) => p.id === draft.payerId) ?? draft.people[0];
  const myShare = result.shares.find((s) => s.personId === "me")?.total ?? 0;

  // --- orang ---
  const addPerson = () => {
    const name = newName.trim();
    if (!name) return;
    const p = { id: uid(), name: name.slice(0, 24) };
    update({
      people: [...draft.people, p],
      // orang baru otomatis ikut item yang dibagi ke semua orang
      items: draft.items.map((it) =>
        it.sharedBy.length === draft.people.length ? { ...it, sharedBy: [...it.sharedBy, p.id] } : it
      ),
    });
    setNewName("");
  };
  const removePerson = (id: string) => {
    if (id === "me") return;
    update({
      people: draft.people.filter((p) => p.id !== id),
      items: draft.items.map((it) => ({ ...it, sharedBy: it.sharedBy.filter((x) => x !== id) })),
      payerId: draft.payerId === id ? "me" : draft.payerId,
    });
  };

  // --- item ---
  const setItem = (id: string, patch: Partial<SplitItem>) =>
    update({ items: draft.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const toggleShare = (itemId: string, personId: string) => {
    const it = draft.items.find((x) => x.id === itemId);
    if (!it) return;
    const has = it.sharedBy.includes(personId);
    setItem(itemId, { sharedBy: has ? it.sharedBy.filter((x) => x !== personId) : [...it.sharedBy, personId] });
  };
  const addItem = () =>
    update({ items: [...draft.items, { id: uid(), name: "", price: 0, qty: 1, sharedBy: draft.people.map((p) => p.id) }] });
  const removeItem = (id: string) => update({ items: draft.items.filter((it) => it.id !== id) });

  // --- hasil ---
  const summary = splitSummaryText(draft.title, result, payer?.id !== "me" ? payer?.name : "aku");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: draft.title || "Split bill", text: summary });
        return;
      } catch {
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener");
  };
  const recordMyShare = async () => {
    if (!walletId || myShare <= 0) return;
    setRecordState("saving");
    try {
      await createTransaction({
        type: "expense",
        amount: myShare,
        wallet_id: walletId,
        note: `${draft.title.trim() || "Split bill"} (bagianku)`,
        source: "manual",
      });
      triggerHapticFeedback([20, 40, 20]);
      window.dispatchEvent(new CustomEvent("transaction_created"));
      setRecordState("done");
    } catch {
      setRecordState("error");
    }
  };

  const handleFoto = async (file: File) => {
    setScanning(true);
    setScanMsg("");
    try {
      const compressed = await compressImage(file, 1600, 0.8);
      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressed.base64, mimeType: "image/jpeg" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setScanMsg(typeof j.error === "string" && (res.status === 402 || res.status === 429) ? j.error : "Struk belum bisa dibaca. Coba foto lagi, atau isi manual.");
        return;
      }
      const r: ScanReceiptResult = await res.json();
      const conv = receiptToSplit(r, draft.people.map((p) => p.id), uid);
      if (!r.is_receipt || conv.items.length === 0) {
        setScanMsg("Rincian pesanan tidak terbaca dari foto ini. Coba foto yang lebih jelas, atau isi manual.");
        return;
      }
      update({ title: conv.title || draft.title, items: conv.items, extras: conv.extras });
      setMode("foto");
    } catch {
      setScanMsg("Struk belum bisa dibaca. Coba foto lagi, atau isi manual.");
    } finally {
      setScanning(false);
    }
  };

  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      on ? "border-emerald-400 bg-emerald-400/20 text-emerald-700 shadow-[0_0_12px_rgba(52,211,153,0.4)] dark:text-emerald-300" : "border-border text-muted-foreground"
    }`;

  return (
    <div className="flex flex-1 flex-col">
      <TopHeader title="Split Bill" />

      <div className="space-y-4 px-4 pb-6 pt-4">
        <PageHero title="Split Bill" desc="Bagi tagihan adil, sesuai pesanan masing-masing." />
        {mode === "pilih" ? (
          <div className="space-y-4">
            <FormCard title="Mau isi tagihan dari mana?" desc="Pilih satu dulu. Nama teman dan pembagian diisi sesudahnya.">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Pilih foto struk"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleFoto(f);
                }}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-emerald-400/60 bg-emerald-400/10 p-4 text-center text-emerald-700 shadow-[0_0_14px_rgba(52,211,153,0.3)] shadow-xs transition-all hover:bg-teal-500/15 active:scale-95 disabled:opacity-60 dark:text-teal-300"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-2xl">{scanning ? <Loader2 className="h-6 w-6 animate-spin" /> : "📸"}</span>
                  <span className="text-sm font-extrabold">{scanning ? "Membaca..." : "Foto Struk"}</span>
                  <span className="text-[10px] leading-snug text-muted-foreground">Ruby baca pesanan, pajak, dan diskon</span>
                </button>
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => setMode("manual")}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-center text-indigo-700 shadow-xs transition-all hover:bg-indigo-500/15 active:scale-95 disabled:opacity-60 dark:text-indigo-300"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl">✍️</span>
                  <span className="text-sm font-extrabold">Input Manual</span>
                  <span className="text-[10px] leading-snug text-muted-foreground">Ketik sendiri pesanan dan harganya</span>
                </button>
              </div>
              {scanMsg && <p role="alert" className="rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{scanMsg}</p>}
            </FormCard>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {mode === "foto" ? "Struk terbaca. Cek item, tambah nama teman, lalu pilih siapa makan apa." : "Pilih siapa makan apa. Diskon, pajak & service ikut porsi masing-masing."}
          </p>
          <button type="button" onClick={() => setMode("pilih")} className="shrink-0 cursor-pointer text-xs font-bold text-teal-600 hover:underline dark:text-teal-400">Ganti cara</button>
        </div>
        <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="sb-title">Nama tagihan</Label>
            <Input id="sb-title" placeholder="Misal: Makan malam GoFood" value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={60} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Siapa saja?</p>
            <div className="flex flex-wrap gap-2">
              {draft.people.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {p.name}
                  {p.id !== "me" && (
                    <button type="button" onClick={() => removePerson(p.id)} aria-label={`Hapus ${p.name}`} className="text-muted-foreground hover:text-rose-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPerson();
              }}
              className="flex gap-2"
            >
              <Input placeholder="Nama teman" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Nama teman" />
              <Button type="submit" variant="outline" className="shrink-0 rounded-xl" disabled={!newName.trim()}>
                <UserPlus className="h-4 w-4" /> Tambah
              </Button>
            </form>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pesanan</h2>
          {draft.items.map((it, idx) => (
            <div key={it.id} className="space-y-2.5 rounded-3xl border border-border/70 bg-card p-3.5">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Item ${idx + 1}`}
                  value={it.name}
                  onChange={(e) => setItem(it.id, { name: e.target.value })}
                  aria-label={`Nama item ${idx + 1}`}
                />
                {draft.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(it.id)} aria-label="Hapus item" className="rounded-lg p-2 text-muted-foreground hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[1fr_72px] gap-2">
                <div className="flex items-center rounded-xl border border-input bg-background px-3">
                  <span className="text-xs font-bold text-muted-foreground">Rp</span>
                  <input
                    inputMode="numeric"
                    placeholder="Harga satuan"
                    value={fmtInput(it.price)}
                    onChange={(e) => setItem(it.id, { price: toNum(e.target.value) })}
                    aria-label={`Harga item ${idx + 1}`}
                    className="h-10 w-full bg-transparent px-2 text-sm font-bold outline-none"
                  />
                </div>
                <div className="flex items-center rounded-xl border border-input bg-background px-2">
                  <span className="text-xs text-muted-foreground">×</span>
                  <input
                    inputMode="numeric"
                    value={it.qty || ""}
                    onChange={(e) => setItem(it.id, { qty: Math.min(99, toNum(e.target.value)) })}
                    aria-label={`Jumlah item ${idx + 1}`}
                    className="h-10 w-full bg-transparent px-1 text-center text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Dibagi:</span>
                {draft.people.map((p) => (
                  <button key={p.id} type="button" onClick={() => toggleShare(it.id, p.id)} className={chip(it.sharedBy.includes(p.id))} aria-pressed={it.sharedBy.includes(p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addItem} className="w-full rounded-2xl">
            <Plus className="h-4 w-4" /> Tambah item
          </Button>
        </section>

        <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-bold">Diskon, pajak & ongkir</h2>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Diskon / voucher" value={draft.extras.discount ?? 0} onChange={(v) => setExtras({ discount: v })} />
            <MoneyField label="Ongkir" value={draft.extras.shipping ?? 0} onChange={(v) => setExtras({ shipping: v })} />
            <PercentField label="Pajak (PB1/PPN)" value={draft.extras.taxPercent ?? 0} onChange={(v) => setExtras({ taxPercent: v })} />
            <PercentField label="Service charge" value={draft.extras.servicePercent ?? 0} onChange={(v) => setExtras({ servicePercent: v })} />
            <MoneyField label="Biaya lain (aplikasi, packing)" value={draft.extras.otherFee ?? 0} onChange={(v) => setExtras({ otherFee: v })} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Ongkir & biaya lain dibagi</p>
            <div className="grid grid-cols-2 gap-2">
              {(["equal", "proportional"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setExtras({ shippingMode: m })}
                  aria-pressed={draft.extras.shippingMode === m}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                    draft.extras.shippingMode === m ? "border-emerald-400 bg-emerald-400/20 text-emerald-700 shadow-[0_0_12px_rgba(52,211,153,0.4)] dark:text-emerald-300" : "border-border"
                  }`}
                >
                  {m === "equal" ? "Rata per orang" : "Sesuai porsi pesanan"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Diskon, pajak & service selalu dibagi sesuai porsi pesanan masing-masing, jadi adil.</p>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-emerald-400/50 bg-emerald-400/10 p-4" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">Hasil</h2>
            <p className="text-lg font-extrabold">{formatRupiah(result.grandTotal)}</p>
          </div>
          {result.unassignedItems.length > 0 && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Belum ada yang dipilih untuk: {result.unassignedItems.join(", ")}. Item ini belum dihitung.
            </p>
          )}
          <div className="divide-y divide-border/50 rounded-2xl bg-card">
            {result.shares.map((s) => (
              <div key={s.personId} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Pesanan {formatRupiah(s.subtotal)}
                    {s.discount ? ` · diskon -${formatRupiah(s.discount)}` : ""}
                    {s.tax ? ` · pajak ${formatRupiah(s.tax)}` : ""}
                    {s.service ? ` · service ${formatRupiah(s.service)}` : ""}
                    {s.shipping ? ` · ongkir ${formatRupiah(s.shipping)}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold">{formatRupiah(s.total)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sb-payer" className="text-xs">Yang bayar duluan</Label>
            <Select
              id="sb-payer"
              value={draft.payerId}
              onChange={(e) => update({ payerId: e.target.value })}
             
            >
              {draft.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {payer && (
              <ul className="space-y-0.5 pt-1 text-[11px] text-muted-foreground">
                {result.shares
                  .filter((s) => s.personId !== payer.id && s.total > 0)
                  .map((s) => (
                    <li key={s.personId}>
                      {s.name} transfer <b className="text-foreground">{formatRupiah(s.total)}</b> ke {payer.name}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={copy} className="rounded-xl" disabled={result.grandTotal <= 0}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Tersalin" : "Salin"}
            </Button>
            <Button type="button" onClick={share} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-600 active:scale-95" disabled={result.grandTotal <= 0}>
              <Share2 className="h-4 w-4" /> Bagikan
            </Button>
          </div>

          {myShare > 0 && wallets.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3">
              <p className="text-xs font-semibold">Catat bagianku ({formatRupiah(myShare)}) sebagai pengeluaran</p>
              <Select
                value={walletId}
                onChange={(e) => {
                  setWalletId(e.target.value);
                  setRecordState("idle");
                }}
                aria-label="Dompet untuk mencatat"
               
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="outline" onClick={recordMyShare} disabled={recordState === "saving" || recordState === "done"} className="h-10 w-full rounded-2xl border-emerald-400/60 font-bold">
                {recordState === "saving" ? "Menyimpan…" : recordState === "done" ? "Sudah dicatat ✓" : "Catat ke Riwayat"}
              </Button>
              {recordState === "error" && <p role="alert" className="text-[11px] font-semibold text-rose-600">Gagal mencatat. Coba lagi.</p>}
            </div>
          )}

          <button type="button" onClick={() => setDraft(emptyDraft())} className="w-full text-center text-[11px] font-semibold text-muted-foreground underline">
            Mulai tagihan baru
          </button>
        </section>
        </>
        )}
      </div>
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px]">{label}</Label>
      <div className="flex items-center rounded-xl border border-input bg-background px-2.5">
        <span className="text-[11px] font-bold text-muted-foreground">Rp</span>
        <input id={id} inputMode="numeric" value={fmtInput(value)} onChange={(e) => onChange(toNum(e.target.value))} className="h-10 w-full bg-transparent px-1.5 text-sm font-bold outline-none" />
      </div>
    </div>
  );
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = React.useId();
  // simpan teks apa adanya supaya "10," / "10.5" bisa diketik
  const [text, setText] = React.useState(value ? String(value).replace(".", ",") : "");
  React.useEffect(() => {
    const cur = parseFloat(text.replace(",", ".")) || 0;
    if (cur !== value) setText(value ? String(value).replace(".", ",") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px]">{label}</Label>
      <div className="flex items-center rounded-xl border border-input bg-background px-2.5">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.,]/g, "").slice(0, 5);
            setText(t);
            const v = parseFloat(t.replace(",", "."));
            onChange(Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);
          }}
          className="h-10 w-full bg-transparent px-1 text-sm font-bold outline-none"
        />
        <span className="text-[11px] font-bold text-muted-foreground">%</span>
      </div>
    </div>
  );
}
