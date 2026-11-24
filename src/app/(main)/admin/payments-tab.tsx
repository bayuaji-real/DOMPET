"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Pill, EmptyState, type PillTone } from "@/components/ui/form-kit";
import { useConfirm } from "@/components/ui/use-confirm";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import * as A from "@/lib/data/admin";
import * as P from "@/lib/data/payment";
import { STATUS_LABEL, monthsLabel, type PaymentStatus } from "@/lib/payment";

const TONE: Record<PaymentStatus, PillTone> = { menunggu: "slate", pro_sementara: "amber", menunggu_cek: "sky", dikonfirmasi: "neon", ditolak: "rose", kedaluwarsa: "slate" };
const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(".", ":") : "-";

/** Tab Pembayaran: Owner mencocokkan nominal ke mutasi merchant, lalu Konfirmasi atau Tolak. Dicek di server, tindakan dicatat. */
export function PaymentsTab() {
  const [rows, setRows] = React.useState<P.AdminPayment[] | null>(null);
  const [err, setErr] = React.useState("");
  const [ask, dialog] = useConfirm();
  const load = React.useCallback(() => { P.listPayments().then((d) => { setRows(d); setErr(""); }).catch((e) => setErr(A.adminErrorText(e))); }, []);
  React.useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); notify(ok); load(); } catch (e) { notify(A.adminErrorText(e)); load(); }
  };

  if (err) return <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>;
  if (!rows) return <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
  const pending = rows.filter((r) => r.status === "pro_sementara" || r.status === "menunggu_cek").length;
  if (rows.length === 0) return <EmptyState emoji="💸">Belum ada permintaan pembayaran.</EmptyState>;

  return (
    <div className="space-y-2">
      {dialog}
      <p className="text-xs text-muted-foreground" data-testid="bayar-ringkas">{pending > 0 ? `${pending} pembayaran perlu kamu cek ke mutasi merchant.` : "Tidak ada pembayaran yang menunggu dicek."}</p>
      <ul className="space-y-2">
        {rows.map((r) => {
          const status = r.status as PaymentStatus;
          const open = status === "pro_sementara" || status === "menunggu_cek" || (status === "menunggu") || (status === "kedaluwarsa" && !!r.proof_path);
          return (
            <li key={r.id} className="space-y-2.5 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-all text-sm font-medium">{r.email}</p>
                <Pill tone={TONE[status]}>{STATUS_LABEL[status]}</Pill>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border/60 p-2"><p className="text-[10px] font-semibold text-muted-foreground">Cocokkan nominal</p><p className="text-sm font-extrabold tabular-nums">{formatRupiah(r.amount)}</p></div>
                <div className="rounded-xl border border-border/60 p-2"><p className="text-[10px] font-semibold text-muted-foreground">Paket</p><p className="text-sm font-extrabold">Pro {monthsLabel(r.months)}</p></div>
              </div>
              <p className="text-[11px] text-muted-foreground">Dibuat {fmt(r.created_at)}{r.proof_paid_at ? ` · dibayar ${fmt(r.proof_paid_at)}` : ""}{r.proof_ref ? ` · ref ${r.proof_ref}` : ""}{r.temp_pro_until && status === "pro_sementara" ? ` · Pro sementara sampai ${fmt(r.temp_pro_until)}` : ""}</p>
              {r.last_note && status === "menunggu" && <p className="text-[11px] text-amber-700 dark:text-amber-300">Bukti terakhir ditolak penyaring ({r.last_note}), percobaan {r.attempts}.</p>}
              {r.proof_path && <ProofLink path={r.proof_path} />}
              {open && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => { if (await ask(`Konfirmasi ${formatRupiah(r.amount)} dari ${r.email}? Pro ${monthsLabel(r.months)} aktif penuh. Pastikan nominal ini sudah ada di mutasi merchant.`, "Konfirmasi")) void act(() => P.confirmPayment(r.id), "Pembayaran dikonfirmasi"); }}>Konfirmasi</Button>
                  <Button size="sm" variant="outline" onClick={async () => { if (await ask(`Tolak pembayaran ${r.email}? Pro sementara (kalau ada) langsung dicabut.`, "Tolak")) void act(() => P.rejectPayment(r.id, "Tidak ditemukan di mutasi merchant"), "Pembayaran ditolak"); }}>Tolak</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProofLink({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null | undefined>(undefined);
  React.useEffect(() => { let on = true; P.proofUrl(path).then((u) => { if (on) setUrl(u); }); return () => { on = false; }; }, [path]);
  if (url === undefined) return <div className="h-16 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
  if (!url) return <p className="text-[11px] text-rose-600">Bukti tidak bisa dibuka.</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-border/60" aria-label="Buka bukti pembayaran">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Bukti pembayaran" className="max-h-48 w-full object-contain bg-muted" />
    </a>
  );
}
