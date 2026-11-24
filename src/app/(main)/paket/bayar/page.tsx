"use client";

import * as React from "react";
import { FormCard, PageHero, Cta, Notice, Pill, EmptyState } from "@/components/ui/form-kit";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { formatRupiah } from "@/lib/utils";
import { useEntitlement } from "@/hooks/use-entitlement";
import { createPaymentRequest, getMyPaymentRequest, getPrices, submitProof, type PayPrice } from "@/lib/data/payment";
import { MERCHANT_NAME, PROOF_MAX_ATTEMPTS, QRIS_IMAGE, TEMP_PRO_HOURS, countdown, monthsLabel, savingPct, type PaymentRequest } from "@/lib/payment";

const fmtDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(".", ":") + " WIB" : "-";

export default function BayarProPage() {
  const { ent, reload: reloadEnt } = useEntitlement();
  const [prices, setPrices] = React.useState<PayPrice[] | null>(null);
  const [req, setReq] = React.useState<PaymentRequest | null | undefined>(undefined);
  const [choosing, setChoosing] = React.useState(false);
  const [busy, setBusy] = React.useState<number | "kirim" | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = React.useState(() => new Date());
  const [qrisOk, setQrisOk] = React.useState(true);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    setReq(await getMyPaymentRequest());
    void reloadEnt();
  }, [reloadEnt]);

  React.useEffect(() => {
    let on = true;
    getPrices().then((p) => { if (on) setPrices(p); }).catch(() => { if (on) setPrices([]); });
    getMyPaymentRequest().then((r) => { if (on) setReq(r); });
    return () => { on = false; };
  }, []);

  // Hitung mundur tiap detik; cek ulang status tiap 30 detik saat menunggu
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const status = req?.status;
  React.useEffect(() => {
    if (status !== "menunggu" && status !== "pro_sementara" && status !== "menunggu_cek") return;
    const t = setInterval(() => { void refresh(); }, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [status, refresh]);

  const monthly = prices?.find((p) => p.months === 1)?.amount ?? 0;

  const pilih = async (months: number) => {
    setBusy(months); setMsg(null);
    const r = await createPaymentRequest(months);
    setBusy(null);
    if (r.ok) { setReq(r.req); setChoosing(false); } else setMsg({ ok: false, text: r.message });
  };

  const salin = async () => {
    if (!req) return;
    try { await navigator.clipboard.writeText(String(req.amount)); notify("Nominal disalin"); } catch { notify("Salin manual ya: " + req.amount); }
  };

  const kirim = async (file?: File) => {
    if (!file || !req) return;
    setBusy("kirim"); setMsg(null);
    const r = await submitProof(req.id, file);
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    if (r.ok) {
      setMsg({ ok: true, text: r.status === "pro_sementara" ? "Bukti diterima. Pro aktif sementara 24 jam." : "Bukti diterima. Admin akan mengecek pembayaranmu." });
      await refresh();
    } else {
      setMsg({ ok: false, text: r.message });
      await refresh();
    }
  };

  const cd = req ? countdown(req.expiresAt, now) : null;
  const paidPro = ent.plan === "pro" && ent.source === "paid";

  return (
    <div className="pb-24">
      <TopHeader title="Bayar Pro" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Berlangganan Pro" desc="Bayar sekali di muka lewat QRIS. Tanpa perpanjangan otomatis." />

        {paidPro && ent.planExpiresAt && (
          <Notice tone="emerald" emoji="👑">Pro kamu aktif sampai {fmtDateTime(ent.planExpiresAt)}. Membayar lagi menyambung dari tanggal itu.</Notice>
        )}
        {msg && <Notice role={msg.ok ? "status" : "alert"} tone={msg.ok ? "emerald" : "rose"} emoji={msg.ok ? "🎉" : "⚠️"}>{msg.text}</Notice>}

        {req === undefined || prices === null ? (
          <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" />
        ) : (
          <>
            {/* Pilih paket */}
            {(!req || !["menunggu", "pro_sementara", "menunggu_cek"].includes(req.status) || choosing) && (
              <FormCard title="Pilih lama berlangganan" icon={<span aria-hidden>👑</span>} desc="Harga sudah pasti, tanpa biaya tambahan.">
                {prices.length === 0 && <EmptyState emoji="🛠️">Harga belum bisa dimuat. Coba lagi sebentar.</EmptyState>}
                <div className="space-y-2">
                  {prices.map((p) => {
                    const hemat = savingPct(p.months, p.amount, monthly);
                    return (
                      <button key={p.months} type="button" disabled={busy !== null} onClick={() => pilih(p.months)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 text-left transition-all hover:border-teal-500 hover:bg-teal-500/5 active:scale-[0.98] disabled:opacity-60"
                        aria-label={`Pilih Pro ${monthsLabel(p.months)} ${formatRupiah(p.amount)}`}>
                        <span>
                          <span className="block text-sm font-extrabold">{monthsLabel(p.months)}</span>
                          <span className="block text-[11px] text-muted-foreground">{p.months > 1 ? `Sekitar ${formatRupiah(Math.round(p.amount / p.months))} per bulan` : "Coba dulu sebulan"}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-base font-extrabold tabular-nums">{busy === p.months ? "Memproses..." : formatRupiah(p.amount)}</span>
                          {hemat > 0 && <Pill tone="amber">Hemat {hemat}%</Pill>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {choosing && req && <Button variant="outline" className="h-10 w-full rounded-2xl text-xs font-bold" onClick={() => setChoosing(false)}>Kembali ke pembayaran tadi</Button>}
              </FormCard>
            )}

            {/* Riwayat terakhir */}
            {req && req.status === "dikonfirmasi" && !choosing && (
              <Notice tone="emerald" emoji="✅">Pembayaran Pro {monthsLabel(req.months)} sudah dikonfirmasi. Terima kasih!</Notice>
            )}
            {req && req.status === "ditolak" && !choosing && (
              <Notice tone="rose" emoji="⚠️">Pembayaran terakhir belum bisa kami temukan, jadi Pro sementara dicabut. Kalau kamu sudah membayar, kirim bukti lewat Bantuan.</Notice>
            )}
            {req && req.status === "kedaluwarsa" && !choosing && (
              <Notice tone="amber" emoji="⏰">Permintaan sebelumnya sudah kedaluwarsa. Pilih paket di atas untuk membuat yang baru.</Notice>
            )}

            {/* Menunggu pembayaran dan bukti */}
            {req && req.status === "menunggu" && !choosing && cd && (
              <>
                <FormCard title="Bayar lewat QRIS" icon={<span aria-hidden>📲</span>} desc={`Pro ${monthsLabel(req.months)}`}>
                  <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4 text-center">
                    <p className="text-[11px] font-semibold text-muted-foreground">Bayar PERSIS nominal ini</p>
                    <p className="text-3xl font-extrabold tabular-nums" data-testid="nominal-unik">{formatRupiah(req.amount)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">3 angka terakhir ({String(req.uniqueCode).padStart(3, "0")}) adalah kode unik pembayaranmu. Jangan dibulatkan.</p>
                    <Button variant="outline" className="mt-3 h-9 rounded-full px-4 text-xs font-bold" onClick={salin}><span aria-hidden>📋</span>&nbsp;Salin nominal</Button>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 px-3 py-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Berlaku</span>
                    <span className={cd.expired ? "font-extrabold text-rose-600" : "font-extrabold tabular-nums"} data-testid="hitung-mundur">{cd.expired ? "Habis" : `${cd.mm}:${cd.ss}`}</span>
                  </div>
                  <div className="rounded-2xl border border-dashed border-border p-3 text-center">
                    {qrisOk ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={QRIS_IMAGE} alt="QRIS pembayaran Dompetku" className="mx-auto w-full max-w-[260px] rounded-xl bg-white p-2" onError={() => setQrisOk(false)} />
                    ) : (
                      <p className="py-8 text-xs text-muted-foreground" role="status">Gambar QRIS belum dipasang. Hubungi admin lewat Bantuan sebelum membayar.</p>
                    )}
                    {MERCHANT_NAME && <p className="mt-2 text-xs font-bold">Penerima: {MERCHANT_NAME}</p>}
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                    <li>Buka aplikasi e-wallet atau m-banking apa pun, pilih Bayar atau Scan QRIS.</li>
                    <li>Pindai QRIS di atas, lalu ketik nominal persis {formatRupiah(req.amount)}.</li>
                    <li>Setelah berhasil, tangkap layar rincian transaksi (harus terlihat nominal, jam, dan nomor referensi).</li>
                    <li>Unggah tangkapan layar itu di bawah.</li>
                  </ol>
                </FormCard>

                <FormCard title="Unggah bukti" icon={<span aria-hidden>🧾</span>} desc={`Sisa kesempatan unggah: ${req.attemptsLeft} dari ${PROOF_MAX_ATTEMPTS}`}>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar bukti pembayaran" onChange={(e) => kirim(e.target.files?.[0])} />
                  <Cta disabled={busy !== null || cd.expired || req.attemptsLeft <= 0} onClick={() => fileRef.current?.click()}>
                    <span aria-hidden>📤</span>&nbsp;{busy === "kirim" ? "Membaca bukti..." : "Pilih gambar bukti"}
                  </Cta>
                  <p className="text-[11px] text-muted-foreground">Setelah bukti lolos, Pro langsung aktif sementara {TEMP_PRO_HOURS} jam sambil kami cek pembayarannya.</p>
                  <Button variant="outline" className="h-10 w-full rounded-2xl text-xs font-bold" disabled={busy !== null} onClick={() => setChoosing(true)}>Ganti paket</Button>
                </FormCard>
              </>
            )}

            {/* Sudah kirim bukti */}
            {req && req.status === "pro_sementara" && !choosing && (
              <FormCard title="Pro aktif sementara" icon={<span aria-hidden>⏳</span>}>
                <Notice tone="emerald" emoji="👑">Bukti kamu diterima. Pro aktif sampai {fmtDateTime(req.tempProUntil)} sambil kami mengecek pembayaranmu. Setelah dikonfirmasi, Pro aktif penuh {monthsLabel(req.months)}.</Notice>
                <p className="text-xs text-muted-foreground">Nominal dibayar: <b className="tabular-nums">{formatRupiah(req.amount)}</b></p>
              </FormCard>
            )}
            {req && req.status === "menunggu_cek" && !choosing && (
              <FormCard title="Menunggu dicek admin" icon={<span aria-hidden>🔎</span>}>
                <Notice tone="sky" emoji="🔎">Bukti kamu diterima dan sedang dicek admin. Pro aktif setelah pembayaran dikonfirmasi. Untuk paket ini, Pro sementara hanya diberikan sekali.</Notice>
                <p className="text-xs text-muted-foreground">Nominal dibayar: <b className="tabular-nums">{formatRupiah(req.amount)}</b></p>
              </FormCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
