"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, isPushOn, pushSupported, type PushResult } from "@/lib/push/client";

const TEXT: Record<PushResult, string> = {
  ok: "Notifikasi aktif di perangkat ini.",
  ditolak: "Izin notifikasi ditolak. Buka pengaturan browser atau HP, izinkan notifikasi untuk Dompetku, lalu coba lagi.",
  tidak_didukung: "Perangkat ini belum mendukung notifikasi. Di iPhone, pasang Dompetku ke layar utama dulu lewat tombol Bagikan lalu Tambah ke Layar Utama.",
  kunci_kosong: "Notifikasi belum disiapkan di server. Hubungi admin.",
  gagal: "Belum berhasil mengaktifkan notifikasi. Coba lagi sebentar.",
};

export function PushCard() {
  const [on, setOn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const supported = pushSupported();
  React.useEffect(() => { isPushOn().then(setOn).catch(() => setOn(false)); }, []);
  const toggle = async () => {
    setBusy(true); setMsg(null);
    try {
      if (on) { await disablePush(); setOn(false); setMsg("Notifikasi dimatikan di perangkat ini."); }
      else { const r = await enablePush(); setOn(r === "ok"); setMsg(TEXT[r]); }
    } finally { setBusy(false); }
  };
  return (
    <section aria-label="Notifikasi" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Bell className="size-[18px]" aria-hidden /></span> Notifikasi peringatan</h2>
      <p className="text-xs text-muted-foreground">Peringatan batas pengeluaran, walau aplikasi ditutup. Maksimal sekali sehari.</p>
      {msg && <p role="status" className="rounded-2xl bg-muted px-3 py-2 text-xs">{msg}</p>}
      {!supported && <p className="text-sm text-amber-700 dark:text-amber-300">{TEXT.tidak_didukung}</p>}
      <Button className="w-full" variant={on ? "outline" : "default"} disabled={busy || !supported} onClick={toggle}>{on ? "Matikan notifikasi" : "Aktifkan notifikasi"}</Button>
    </section>
  );
}
