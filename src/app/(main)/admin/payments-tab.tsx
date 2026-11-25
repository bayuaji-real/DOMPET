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
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TONE: Record<PaymentStatus, PillTone> = {
  menunggu: "slate",
  pro_sementara: "amber",
  menunggu_cek: "sky",
  dikonfirmasi: "neon",
  ditolak: "rose",
  kedaluwarsa: "slate",
};

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(new Date(iso))
        .replace(".", ":")
    : "-";

/** Tab Pembayaran: Owner mencocokkan nominal ke mutasi merchant, lalu Konfirmasi atau Tolak. */
export function PaymentsTab() {
  const [rows, setRows] = React.useState<P.AdminPayment[] | null>(null);
  const [nowMs, setNowMs] = React.useState<number>(0);
  const [err, setErr] = React.useState("");
  const [ask, dialog] = useConfirm();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // State untuk modal tolak dengan alasan
  const [rejectModal, setRejectModal] = React.useState<{ id: string; email: string; amount: number } | null>(null);
  const [rejectReasonType, setRejectReasonType] = React.useState("Tidak ditemukan di mutasi merchant");
  const [customReason, setCustomReason] = React.useState("");

  const load = React.useCallback(() => {
    P.listPayments()
      .then((d) => {
        setRows(d);
        setNowMs(Date.now());
        setErr("");
      })
      .catch((e) => setErr(A.adminErrorText(e)));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = async (r: P.AdminPayment) => {
    if (processingId) return;
    const ok = await ask(
      `Apakah mutasi sebesar ${formatRupiah(r.amount)} dari ${r.email} sudah masuk ke rekening/QRIS merchant? Paket Pro ${monthsLabel(r.months)} akan diaktifkan.`,
      "Konfirmasi Lunas"
    );
    if (!ok) return;

    setProcessingId(r.id);
    try {
      await P.confirmPayment(r.id);
      notify("Pembayaran dikonfirmasi.");
      load();
    } catch (e) {
      notify(A.adminErrorText(e));
      load();
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (r: P.AdminPayment) => {
    if (processingId) return;
    setRejectModal({ id: r.id, email: r.email, amount: r.amount });
    setRejectReasonType("Tidak ditemukan di mutasi merchant");
    setCustomReason("");
  };

  const submitReject = async () => {
    if (!rejectModal || processingId) return;
    const reason = rejectReasonType === "lainnya" ? customReason.trim() : rejectReasonType;
    if (!reason) {
      notify("Pilih atau tulis alasan penolakan.");
      return;
    }

    setProcessingId(rejectModal.id);
    try {
      await P.rejectPayment(rejectModal.id, reason);
      notify("Pembayaran ditolak.");
      setRejectModal(null);
      load();
    } catch (e) {
      notify(A.adminErrorText(e));
      load();
    } finally {
      setProcessingId(null);
    }
  };

  if (err) return <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{err}</p>;
  if (!rows) return <div className="h-32 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;

  // Pisahkan antrean cek (pro_sementara + menunggu_cek) dan urutkan yang TERTUA lebih dulu
  const pendingRows = rows
    .filter((r) => r.status === "pro_sementara" || r.status === "menunggu_cek")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Sisanya urutkan terbaru
  const otherRows = rows
    .filter((r) => r.status !== "pro_sementara" && r.status !== "menunggu_cek")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allSorted = [...pendingRows, ...otherRows];

  if (allSorted.length === 0) return <EmptyState emoji="💸">Belum ada permintaan pembayaran.</EmptyState>;

  return (
    <div className="space-y-3">
      {dialog}

      {/* Modal Dialog Tolak Pembayaran */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="tolak-title" className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <h3 id="tolak-title" className="text-base font-bold">Tolak Pembayaran</h3>
            <p className="text-xs text-muted-foreground">
              Tolak pembayaran {formatRupiah(rejectModal.amount)} dari <b>{rejectModal.email}</b>. Hak Pro sementara (bila ada) akan langsung dicabut.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-semibold">Alasan Penolakan</label>
              <Select
                aria-label="Pilihan alasan penolakan"
                value={rejectReasonType}
                onChange={(e) => setRejectReasonType(e.target.value)}
              >
                <option value="Tidak ditemukan di mutasi merchant">Tidak ditemukan di mutasi merchant</option>
                <option value="Nominal transfer tidak cocok">Nominal transfer tidak cocok</option>
                <option value="Bukti transfer buram atau tidak terbaca">Bukti transfer buram atau tidak terbaca</option>
                <option value="Nomor referensi atau bukti tidak valid">Nomor referensi atau bukti tidak valid</option>
                <option value="lainnya">Alasan lain (tulis manual)...</option>
              </Select>
              {rejectReasonType === "lainnya" && (
                <Input
                  aria-label="Ketik alasan penolakan"
                  placeholder="Tuliskan alasan penolakan..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  maxLength={100}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!!processingId}
                onClick={() => setRejectModal(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!!processingId}
                onClick={submitReject}
              >
                {processingId ? "Memproses..." : "Ya, Tolak Pembayaran"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan status antrean */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-xs">
        <p className="font-medium text-foreground" data-testid="bayar-ringkas">
          {pendingRows.length > 0
            ? `⚠️ Ada ${pendingRows.length} pembayaran menunggu cek ke mutasi merchant.`
            : "✅ Tidak ada pembayaran yang menunggu dicek saat ini."}
        </p>
        {pendingRows.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            Diurutkan dari yang tertua
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {allSorted.map((r) => {
          const status = r.status as PaymentStatus;
          const isPending = status === "pro_sementara" || status === "menunggu_cek";
          const open = isPending || status === "menunggu" || (status === "kedaluwarsa" && !!r.proof_path);
          const ageMinutes = nowMs > 0 ? Math.max(0, Math.round((nowMs - new Date(r.created_at).getTime()) / 60000)) : 0;
          const isOld = isPending && ageMinutes > 15;
          const isBusy = processingId === r.id;

          return (
            <li
              key={r.id}
              className={`space-y-3 rounded-3xl border p-4 shadow-xs transition-colors ${
                isPending
                  ? isOld
                    ? "border-amber-500/60 bg-amber-500/5 dark:bg-amber-950/20"
                    : "border-sky-500/40 bg-sky-500/5 dark:bg-sky-950/20"
                  : "border-border/70 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all text-sm font-bold text-foreground">{r.email}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Dibuat {fmt(r.created_at)}
                    {isPending && (
                      <span className={`ml-1 font-semibold ${isOld ? "text-amber-700 dark:text-amber-400" : "text-sky-700 dark:text-sky-400"}`}>
                        ({ageMinutes} menit yang lalu{isOld ? " - perlu segera dicek" : ""})
                      </span>
                    )}
                  </p>
                </div>
                <Pill tone={TONE[status]}>{STATUS_LABEL[status]}</Pill>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">Nominal yang harus masuk</p>
                  <p className="text-base font-black tabular-nums text-foreground">{formatRupiah(r.amount)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/80 p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">Paket yang dibeli</p>
                  <p className="text-base font-extrabold text-foreground">Pro {monthsLabel(r.months)}</p>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground">
                {r.proof_paid_at && <span>Dibayar: {fmt(r.proof_paid_at)} · </span>}
                {r.proof_ref && <span>Ref Bank: <code className="rounded-md bg-muted px-1 font-mono text-[10px]">{r.proof_ref}</code> · </span>}
                {r.temp_pro_until && status === "pro_sementara" && (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Pro darurat 24 jam s.d. {fmt(r.temp_pro_until)}
                  </span>
                )}
                {r.confirmed_at && <span>Dikonfirmasi {fmt(r.confirmed_at)}</span>}
              </div>

              {r.last_note && status === "menunggu" && (
                <p className="rounded-xl bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-300">
                  Bukti terakhir ditolak penyaring: {r.last_note} (Percobaan ke-{r.attempts}).
                </p>
              )}

              {r.proof_path && <ProofLink path={r.proof_path} />}

              {open && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleConfirm(r)}
                    className="rounded-xl font-bold"
                  >
                    {isBusy ? "Memproses..." : "Konfirmasi..."}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => handleOpenReject(r)}
                    className="rounded-xl text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    Tolak...
                  </Button>
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
  React.useEffect(() => {
    let on = true;
    P.proofUrl(path).then((u) => {
      if (on) setUrl(u);
    });
    return () => {
      on = false;
    };
  }, [path]);

  if (url === undefined) return <div className="h-16 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
  if (!url) return <p className="text-[11px] text-rose-600">Bukti tidak bisa dibuka.</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-2xl border border-border/60 bg-muted/30 transition-opacity hover:opacity-90"
      aria-label="Buka bukti pembayaran di tab baru"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Bukti pembayaran" className="max-h-56 w-full object-contain bg-muted" />
    </a>
  );
}
