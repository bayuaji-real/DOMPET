"use client";

import * as React from "react";
import { PageHero, Tabs, Pill, Stat, IconBox, chipCls, type PillTone } from "@/components/ui/form-kit";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/konsultan/money-input";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import * as A from "@/lib/data/admin";
import { getSnapshots, type SnapshotRow } from "@/lib/data/invest";
import { MfaChallenge } from "@/components/security/mfa";
import { AdminAcuanSection } from "./acuan-section";
import { apiAlert } from "@/lib/admin-alert";
import { Select } from "@/components/ui/select";

type Tab = "api" | "pengguna" | "permintaan" | "pasar" | "catatan";
const TABS: { id: Tab; label: string; icon: string }[] = [{ id: "api", label: "API", icon: "⚡" }, { id: "pengguna", label: "Pengguna", icon: "👥" }, { id: "permintaan", label: "Minta", icon: "📨" }, { id: "pasar", label: "Pasar", icon: "📈" }, { id: "catatan", label: "Catatan", icon: "📝" }];
const FEATURE_LABEL: Record<string, string> = { tabungan: "Tabungan", konsultasi: "Chat Ruby", struk: "Scan struk", suara: "Suara", insight: "Insight", rencana: "Rencana", impor: "Impor" };
const fmtDate = (s: string | null) => (s ? s.slice(0, 10) : "-");

export default function AdminPage() {
  const [role, setRole] = React.useState<"admin" | "superadmin" | null | undefined>(undefined);
  const [tab, setTab] = React.useState<Tab>("api");
  const [mfa, setMfa] = React.useState<A.MfaStatus | null>(null);
  const reload = React.useCallback(() => { A.getMfaStatus().then((s) => { setMfa(s); setRole(s.role); }).catch(() => { A.getMyAdminRole().then(setRole); }); }, []);
  React.useEffect(() => { reload(); }, [reload]);
  const locked = !!mfa && mfa.require_mfa && mfa.aal !== "aal2";
  return (
    <div className="pb-24">
      <TopHeader title="Admin" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Admin" desc="Pengguna, paket, pemakaian API, dan data pasar." />
        {role === undefined && <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}
        {role === null && <p role="alert" className="rounded-2xl bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">Halaman ini hanya untuk admin.</p>}
        {role && locked && <MfaChallenge onDone={reload} title="Admin wajib memakai kode MFA. Masukkan kode dari aplikasi authenticator." />}
        {role && !locked && (
          <>
            {role === "superadmin" && mfa && <MfaSwitch status={mfa} onChange={reload} />}
            <p className="text-xs text-muted-foreground">Peranmu: {role === "superadmin" ? "Superadmin" : "Admin"}. Semua tindakan dicatat.</p>
            <Tabs value={tab} onChange={setTab} label="Bagian admin" options={TABS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))} />
            {tab === "api" && <ApiTab isSuper={role === "superadmin"} />}
            {tab === "pengguna" && <UsersTab isSuper={role === "superadmin"} />}
            {tab === "permintaan" && <RequestsTab />}
            {tab === "pasar" && <div className="space-y-4"><AdminAcuanSection /><MarketTab /></div>}
            {tab === "catatan" && <AuditTab />}
          </>
        )}
      </div>
    </div>
  );
}

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [err, setErr] = React.useState("");
  const load = React.useCallback(() => { fn().then((d) => { setData(d); setErr(""); }).catch((e) => setErr(A.adminErrorText(e))); }, [fn]);
  React.useEffect(() => { load(); }, [load]);
  return { data, err, load };
}
const Err = ({ t }: { t: string }) => (t ? <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{t}</p> : null);
const Skel = () => <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
async function act(fn: () => Promise<unknown>, ok: string, after: () => void) {
  try { await fn(); notify(ok); after(); } catch (e) { notify(A.adminErrorText(e)); }
}

function ApiTab({ isSuper }: { isSuper: boolean }) {
  const { data: u, err, load } = useLoad(A.getApiUsage);
  const [f, setF] = React.useState({ budget: 0, since: new Date().toISOString().slice(0, 10), warn: "70" });
  if (err) return <Err t={err.includes("Belum berhasil") ? "Dashboard API belum aktif di database ini. Minta Pak Slamet memasang migrasi api_budget." : err} />;
  if (!u) return <Skel />;
  const al = apiAlert(u, (n) => formatRupiah(Math.round(n)));
  const cls = { ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", info: "bg-sky-500/10 text-sky-700 dark:text-sky-300", warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300", bad: "bg-red-500/10 text-red-700 dark:text-red-300" }[al.tone];
  const max = Math.max(1, ...u.daily.map((d) => d.cost_idr));
  return (
    <div className="space-y-3">
      <div role={al.tone === "bad" || al.tone === "warn" ? "alert" : "status"} className={`rounded-2xl p-4 ${cls}`}><p className="font-semibold">{al.title}</p><p className="text-sm">{al.body}</p></div>
      {u.configured && <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${u.level === "aman" ? "bg-emerald-500" : u.level === "waspada" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, u.used_pct ?? 0)}%` }} /></div>}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[["Top-up diisi", formatRupiah(u.budget_idr)], ["Terpakai sejak " + fmtDate(u.since), formatRupiah(Math.round(u.spent_idr))], ["Bulan ini", formatRupiah(Math.round(u.month_spent_idr))], ["Hari ini", formatRupiah(Math.round(u.today_spent_idr))], ["Panggilan AI bulan ini", String(u.calls_month)], ["Rata-rata per hari (7 hari)", formatRupiah(Math.round(u.avg_daily_idr))]].map(([k, v]) => (<div key={k} className="rounded-2xl p-3 border border-border/70 bg-card shadow-xs"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>))}
      </div>
      <div><p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Biaya per hari (30 hari)</p>
        {u.daily.length === 0 ? <p className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">Belum ada pemakaian AI.</p> : (
          <div className="flex h-20 items-end gap-1 rounded-2xl border border-border/70 bg-card p-3 shadow-xs" role="img" aria-label="Grafik biaya AI per hari">{u.daily.map((d) => (<div key={d.day} title={`${d.day}: ${formatRupiah(Math.round(d.cost_idr))}`} className="max-w-6 flex-1 rounded-t-md bg-teal-500/70" style={{ height: `${Math.max(4, (d.cost_idr / max) * 100)}%` }} />))}</div>
        )}</div>
      <div><p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Per fitur (bulan ini)</p>
        <ul className="space-y-1">{u.by_feature.map((x) => (<li key={x.feature} className="flex justify-between rounded-lg bg-muted p-2 text-sm"><span>{FEATURE_LABEL[x.feature] ?? x.feature} <span className="text-xs text-muted-foreground">({x.calls}x)</span></span><span>{formatRupiah(Math.round(x.cost_idr))}</span></li>))}{u.by_feature.length === 0 && <li className="text-xs text-muted-foreground">Belum ada data.</li>}</ul></div>
      <p className="text-xs text-muted-foreground">Biaya adalah perkiraan. Cocokkan dengan tagihan asli di Google AI Studio.</p>
      {isSuper ? (
        <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <p className="text-sm font-semibold">Catat top-up terakhir</p>
          <label className="block space-y-1 text-xs">Nilai top-up (sisa saldo saat dicatat)<MoneyInput value={f.budget} onChange={(n) => setF({ ...f, budget: n })} aria-label="Nilai top-up" suffix="Rp" /></label>
          <div className="grid grid-cols-2 gap-2"><label className="block space-y-1 text-xs font-semibold">Berlaku sejak<Input type="date" aria-label="Berlaku sejak" value={f.since} onChange={(e) => setF({ ...f, since: e.target.value })} /></label><label className="block space-y-1 text-xs font-semibold">Peringatkan di (%)<Input inputMode="numeric" aria-label="Ambang peringatan" value={f.warn} onChange={(e) => setF({ ...f, warn: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></label></div>
          <Button className="h-10 w-full rounded-2xl text-xs" disabled={f.budget <= 0} onClick={() => act(() => A.setApiBudget(f.budget, new Date(f.since + "T00:00:00+07:00").toISOString(), Number(f.warn) || 70), "Tersimpan", load)}>Simpan</Button>
        </div>
      ) : <p className="text-xs text-muted-foreground">Hanya Superadmin yang bisa mengubah nilai top-up.</p>}
    </div>
  );
}

const PLAN_PILL: Record<string, { label: string; tone: PillTone; icon: string }> = {
  free: { label: "Gratis", tone: "slate", icon: "🌱" },
  premium: { label: "Premium", tone: "violet", icon: "⭐" },
  pro: { label: "Pro", tone: "neon", icon: "👑" },
};
const planPill = (plan: string) => PLAN_PILL[plan] ?? { label: plan, tone: "slate" as PillTone, icon: "•" };
const fmtShort = (s: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }) : "-");

function UsersTab({ isSuper }: { isSuper: boolean }) {
  const { data, err, load } = useLoad(A.listUsers);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(null);
  const [ask, dialog] = useConfirm();
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  const list = data.filter((u) => u.email.toLowerCase().includes(q.trim().toLowerCase()));
  const byPlan = (p: string) => data.filter((u) => u.plan === p).length;
  const user = data.find((u) => u.user_id === sel) ?? null;
  const changePlan = async (u: A.AdminUser, plan: string, days: number | null) => {
    setSel(null);
    if (await ask(`Ubah paket ${u.email} menjadi ${plan}${days ? ` selama ${days} hari` : plan === "free" ? "" : " tanpa batas waktu"}?`, "Ubah")) void act(() => A.setPlan(u.user_id, plan, days), "Paket diubah", load);
  };
  const changeRole = async (u: A.AdminUser, role: string) => {
    setSel(null);
    if (await ask(`Ubah peran ${u.email} menjadi ${role === "none" ? "pengguna biasa" : role}?`, "Ubah")) void act(() => A.setRole(u.user_id, role), "Peran diubah", load);
  };
  return (
    <div className="space-y-3">
      {dialog}
      <div className="grid grid-cols-4 gap-1.5">
        <Pill tone="sky" className="justify-center" icon="👥">{data.length} total</Pill>
        <Pill tone="slate" className="justify-center" icon="🌱">{byPlan("free")} Gratis</Pill>
        <Pill tone="violet" className="justify-center" icon="⭐">{byPlan("premium")} Prem.</Pill>
        <Pill tone="neon" className="justify-center" icon="👑">{byPlan("pro")} Pro</Pill>
      </div>
      <Input aria-label="Cari email" placeholder="🔎 Cari email" className="h-10 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-muted/70 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2">Pengguna</th><th className="w-[78px] px-1 py-2">Paket</th><th className="w-9 px-1 py-2 text-right">AI</th><th className="w-[74px] px-2 py-2 text-right">Daftar</th></tr>
          </thead>
          <tbody>
            {list.map((u) => { const pp = planPill(u.plan); return (
              <tr key={u.user_id} onClick={() => setSel(u.user_id)} className="cursor-pointer border-t border-border/50 transition-colors hover:bg-emerald-400/10 active:bg-emerald-400/20">
                <td className="px-3 py-2.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSel(u.user_id); }} aria-label={`Detail ${u.email}`} className="block w-full cursor-pointer truncate text-left font-semibold">{u.email}</button>
                  {u.admin_role && <span className="mt-0.5 inline-block rounded-full bg-indigo-500/15 px-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-300">{u.admin_role}</span>}
                </td>
                <td className="px-1 py-2.5"><Pill tone={pp.tone} icon={pp.icon} className="px-1.5 text-[10px]">{pp.label}</Pill></td>
                <td className="px-1 py-2.5 text-right font-bold tabular-nums">{u.ai_used}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right text-[11px] tabular-nums text-muted-foreground">{fmtShort(u.created_at)}</td>
              </tr>); })}
            {list.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-xs text-muted-foreground">Tidak ada pengguna yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">Ketuk baris untuk melihat detail dan mengubah paket.</p>
      <Sheet open={!!user} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <SheetContent side="bottom" showCloseButton overlayClassName="bg-black/50 backdrop-blur-sm" className="mx-auto max-h-[88dvh] max-w-[430px] overflow-y-auto rounded-t-3xl border-border/80 bg-background px-5 pb-6 pt-4 shadow-2xl">
          {user && (() => { const pp = planPill(user.plan); return (
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <IconBox tone="neon" className="size-11 text-xl">👤</IconBox>
                <div className="min-w-0">
                  <SheetTitle className="break-all text-sm font-extrabold">{user.email}</SheetTitle>
                  <div className="mt-1 flex flex-wrap gap-1"><Pill tone={pp.tone} icon={pp.icon}>{pp.label}</Pill>{user.admin_role && <Pill tone="indigo" icon="🛡️">{user.admin_role}</Pill>}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat icon="📅" tone="sky" label="Daftar" value={fmtDate(user.created_at)} />
                <Stat icon="🔑" tone="violet" label="Login terakhir" value={fmtDate(user.last_sign_in_at)} />
                <Stat icon="🤖" tone="neon" label="AI bulan ini" value={user.ai_used} />
                <Stat icon="🎟️" tone="amber" label="Status paket" value={user.source === "paid" ? (user.plan_expires_at ? `sampai ${fmtDate(user.plan_expires_at)}` : "aktif, tanpa batas") : user.source === "trial" ? `uji coba s.d. ${fmtDate(user.trial_ends_at)}` : "gratis"} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Ubah paket</p>
                <div role="group" aria-label={`Paket ${user.email}`} className="flex flex-wrap gap-1.5">
                  {([["Pro tanpa batas", "pro", null], ["Pro 30 hari", "pro", 30], ["Premium tanpa batas", "premium", null], ["Premium 30 hari", "premium", 30], ["Kembalikan ke Gratis", "free", null]] as const).map(([label, plan, days]) => (
                    <button key={label} type="button" className={chipCls(false)} onClick={() => void changePlan(user, plan, days)}>{label}</button>))}
                </div>
              </div>
              {isSuper && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Ubah peran</p>
                  <div role="group" aria-label={`Peran ${user.email}`} className="flex flex-wrap gap-1.5">
                    {([["Admin", "admin"], ["Superadmin", "superadmin"], ["Pengguna biasa", "none"]] as const).map(([label, role]) => (
                      <button key={role} type="button" className={chipCls(false)} onClick={() => void changeRole(user, role)}>{label}</button>))}
                  </div>
                </div>
              )}
            </div>); })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RequestsTab() {
  const { data, err, load } = useLoad(A.listRequests);
  const [ask, dialog] = useConfirm();
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  if (data.length === 0) return <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada permintaan berlangganan.</p>;
  return (
    <ul className="space-y-2">{dialog}{data.map((r) => (
      <li key={r.id} className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <p className="break-all text-sm font-medium">{r.email}</p>
        <p className="text-xs text-muted-foreground">Minta {r.plan} · {fmtDate(r.created_at)} · status {r.status}{r.note ? ` · "${r.note}"` : ""}</p>
        {(r.status === "baru" || r.status === "diproses") && <div className="flex gap-2">
          <Button size="sm" onClick={async () => { if (await ask(`Aktifkan ${r.plan} 30 hari untuk ${r.email}?`, "Aktifkan")) void act(() => A.resolveRequest(r.id, "aktif", 30), "Diaktifkan", load); }}>Aktifkan 30 hari</Button>
          <Button size="sm" variant="outline" onClick={() => act(() => A.resolveRequest(r.id, "diproses", 30), "Ditandai diproses", load)}>Diproses</Button>
          <Button size="sm" variant="outline" onClick={async () => { if (await ask(`Tolak permintaan ${r.email}?`, "Tolak")) void act(() => A.resolveRequest(r.id, "ditolak", 30), "Ditolak", load); }}>Tolak</Button></div>}
      </li>))}</ul>
  );
}

function MarketTab() {
  const { data, err, load } = useLoad(getSnapshots);
  const [ask, dialog] = useConfirm();
  const empty = { id: null as string | null, name: "", category: "pasar_uang", risk: "rendah", ret_1m: "", ret_ytd: "", ret_1y: "", aum: "", as_of: new Date().toISOString().slice(0, 10), source_url: "" };
  const [f, setF] = React.useState(empty);
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  const num = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".")));
  const bad = (t: string) => { const n = num(t); return n !== null && !Number.isFinite(n); };
  const valid = f.name.trim() && /^https:\/\//.test(f.source_url) && ![f.ret_1m, f.ret_ytd, f.ret_1y, f.aum].some(bad);
  const field = (k: "ret_1m" | "ret_ytd" | "ret_1y" | "aum", label: string) => (<label className="block space-y-1 text-xs font-semibold">{label}<Input inputMode="decimal" aria-label={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^\d.,-]/g, "") })} /></label>);
  return (
    <div className="space-y-3">
      {dialog}
      <p className="text-xs text-muted-foreground">Isi dari sumber resmi. Wajib ada tanggal dan alamat sumber https.</p>
      <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <p className="text-sm font-semibold">{f.id ? "Ubah data" : "Tambah data"}</p>
        <Input aria-label="Nama produk" placeholder="Nama produk atau kategori" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Select aria-label="Kategori" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="pasar_uang">Pasar uang</option><option value="pendapatan_tetap">Pendapatan tetap</option><option value="campuran">Campuran</option><option value="saham">Saham</option></Select>
          <Select aria-label="Risiko" value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })}><option value="rendah">Risiko rendah</option><option value="sedang">Risiko sedang</option><option value="tinggi">Risiko tinggi</option></Select>
        </div>
        <div className="grid grid-cols-2 gap-2">{field("ret_1m", "Return 1 bulan (%)")}{field("ret_ytd", "Return tahun berjalan (%)")}{field("ret_1y", "Return 1 tahun (%)")}{field("aum", "Dana kelolaan (Rp)")}</div>
        <label className="block space-y-1 text-xs">Tanggal data<Input type="date" aria-label="Tanggal data" value={f.as_of} onChange={(e) => setF({ ...f, as_of: e.target.value })} /></label>
        <Input aria-label="Alamat sumber" placeholder="https:// alamat factsheet atau sumber resmi" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value.trim() })} />
        <div className="flex gap-2"><Button className="flex-1" disabled={!valid} onClick={() => act(() => A.upsertMarket({ id: f.id, name: f.name.trim(), category: f.category, risk: f.risk, ret_1m: num(f.ret_1m), ret_ytd: num(f.ret_ytd), ret_1y: num(f.ret_1y), aum: num(f.aum), as_of: f.as_of, source_url: f.source_url }), "Tersimpan", () => { setF(empty); load(); })}>Simpan</Button>{f.id && <Button variant="outline" onClick={() => setF(empty)}>Batal</Button>}</div>
      </div>
      <ul className="space-y-2">{data.map((s: SnapshotRow) => (
        <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl p-3 border border-border/70 bg-card shadow-xs"><div className="min-w-0"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.category} · {s.risk} · {s.as_of} · 1th {s.ret_1y ?? "-"}%</p></div>
          <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setF({ id: s.id, name: s.name, category: s.category, risk: s.risk, ret_1m: s.ret_1m?.toString() ?? "", ret_ytd: s.ret_ytd?.toString() ?? "", ret_1y: s.ret_1y?.toString() ?? "", aum: s.aum?.toString() ?? "", as_of: s.as_of, source_url: s.source_url })}>Ubah</Button>
            <Button size="sm" variant="outline" aria-label={`Hapus ${s.name}`} onClick={async () => { if (await ask(`Hapus data "${s.name}"?`, "Hapus")) void act(() => A.deleteMarket(s.id), "Dihapus", load); }}>Hapus</Button></div></li>))}
        {data.length === 0 && <li className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">Belum ada data pasar.</li>}</ul>
    </div>
  );
}

function AuditTab() {
  const { data, err } = useLoad(A.listAudit);
  if (err) return <Err t={err} />;
  if (!data) return <Skel />;
  if (data.length === 0) return <p className="rounded-3xl border border-dashed border-border/70 p-5 text-center text-xs text-muted-foreground">Belum ada aktivitas admin.</p>;
  return <ul className="space-y-1">{data.map((a) => (<li key={a.id} className="rounded-lg bg-muted p-2 text-xs"><b>{a.action}</b> oleh {a.actor_email ?? "-"}{a.target_email ? ` untuk ${a.target_email}` : ""}{a.detail ? ` (${a.detail})` : ""} · {a.created_at.slice(0, 16).replace("T", " ")}</li>))}</ul>;
}

function MfaSwitch({ status, onChange }: { status: A.MfaStatus; onChange: () => void }) {
  const [err, setErr] = React.useState("");
  const [needCode, setNeedCode] = React.useState(false);
  const flip = async () => {
    setErr("");
    try { await A.setRequireMfa(!status.require_mfa); setNeedCode(false); onChange(); }
    catch (e) { if (e instanceof Error && e.message.includes("MFA_BELUM_AKTIF")) setNeedCode(true); setErr(A.adminErrorText(e)); }
  };
  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-sm font-extrabold"><span aria-hidden>🔐 </span>Kode MFA wajib untuk admin: {status.require_mfa ? "Aktif" : "Belum aktif"}</p>
      <p className="text-xs text-muted-foreground">{status.require_mfa ? "Semua admin harus memasukkan kode dari aplikasi authenticator sebelum memakai halaman Admin." : "Daftarkan MFA-mu dulu di menu Keamanan, masukkan kodenya di sini, lalu wajibkan. Dengan begitu kamu tidak terkunci."}</p>
      {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
      {needCode && <MfaChallenge onDone={() => { setNeedCode(false); setErr(""); onChange(); }} />}
      <Button size="sm" variant="outline" className="h-9 rounded-2xl border-emerald-400/60 text-xs font-bold" onClick={flip}>{status.require_mfa ? "Matikan kewajiban" : "Wajibkan MFA untuk admin"}</Button>
    </div>
  );
}
