"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Trash2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MfaCard } from "@/components/security/mfa";
import { PasswordCard } from "@/components/security/password-card";
import { PushCard } from "@/components/settings/push-card";
import { createClient } from "@/lib/supabase/client";
import { PIN_KEY, PIN_TRIES_KEY, makeStoredPin, validPinFormat } from "@/lib/konsultan/pin";
import { PageHero, Cta, IconBox, Notice } from "@/components/ui/form-kit";

export default function KeamananPage() {
  const router = useRouter();
  const [hasPin, setHasPin] = React.useState(false);
  const [pin, setPin] = React.useState(""); const [pin2, setPin2] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [confirmText, setConfirmText] = React.useState(""); const [busy, setBusy] = React.useState(false); const [delErr, setDelErr] = React.useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { setHasPin(!!localStorage.getItem(PIN_KEY)); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPinFormat(pin)) return setMsg({ ok: false, text: "PIN harus 4 sampai 6 angka." });
    if (pin !== pin2) return setMsg({ ok: false, text: "Kedua PIN belum sama." });
    localStorage.setItem(PIN_KEY, JSON.stringify(await makeStoredPin(pin)));
    localStorage.removeItem(PIN_TRIES_KEY); sessionStorage.setItem("dompet_unlocked_at", String(Date.now()));
    setHasPin(true); setPin(""); setPin2(""); setMsg({ ok: true, text: "PIN aktif di perangkat ini." });
  };
  const removePin = () => { localStorage.removeItem(PIN_KEY); localStorage.removeItem(PIN_TRIES_KEY); setHasPin(false); setMsg({ ok: true, text: "PIN dinonaktifkan." }); };
  const deleteAccount = async () => {
    setBusy(true); setDelErr("");
    try {
      const sb = createClient();
      const { error } = await sb.rpc("delete_my_account");
      if (error) throw error;
      localStorage.removeItem(PIN_KEY); localStorage.removeItem(PIN_TRIES_KEY);
      await sb.auth.signOut().catch(() => {});
      router.push("/login"); router.refresh();
    } catch { setDelErr("Akun belum bisa dihapus. Coba lagi sebentar."); setBusy(false); }
  };

  return (
    <div className="pb-24">
      <TopHeader title="Keamanan" />
      <div className="space-y-4 px-4 pt-2">
        <PageHero title="Keamanan" desc="Kata sandi, PIN, verifikasi, dan notifikasi." />
        <section aria-label="PIN aplikasi" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
          <h2 className="flex items-center gap-2.5 border-b border-border/50 pb-2.5 text-sm font-extrabold"><IconBox tone="neon"><ShieldCheck className="size-[18px]" aria-hidden /></IconBox> PIN aplikasi</h2>
          <p className="text-xs text-muted-foreground">Kunci layar di perangkat ini. Tidak menggantikan login.</p>
          {msg && <Notice role="status" tone={msg.ok ? "emerald" : "rose"} emoji={msg.ok ? "✅" : "⚠️"}>{msg.text}</Notice>}
          <form onSubmit={save} className="space-y-2">
            <Input className="h-10 rounded-xl" aria-label="PIN baru" type="password" inputMode="numeric" maxLength={6} placeholder={hasPin ? "PIN baru (ganti)" : "PIN 4 sampai 6 angka"} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            <Input className="h-10 rounded-xl" aria-label="Ulangi PIN" type="password" inputMode="numeric" maxLength={6} placeholder="Ulangi PIN" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            <Cta type="submit" disabled={pin.length < 4}>{hasPin ? "Ganti PIN" : "Aktifkan PIN"}</Cta>
          </form>
          {hasPin && <Button variant="outline" className="h-10 w-full rounded-2xl text-xs" onClick={removePin}>Matikan PIN</Button>}
        </section>

        <PasswordCard />

        <MfaCard />

        <PushCard />

        <section aria-label="Hapus akun" className="space-y-3 rounded-3xl border border-red-500/30 bg-red-500/5 p-4">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-red-600"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-500/15"><Trash2 className="size-[18px]" aria-hidden /></span> Hapus akun</h2>
          <p className="text-xs text-muted-foreground">Semua datamu dihapus permanen dan tidak bisa dikembalikan. Unduh datamu dulu lewat More, menu Cadangan & Ekspor Data, kalau perlu.</p>
          <label className="block text-sm">Ketik <b>HAPUS</b> untuk melanjutkan<Input aria-label="Ketik HAPUS" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></label>
          {delErr && <p role="alert" className="text-sm text-red-600">{delErr}</p>}
          <Button className="w-full bg-red-600 text-white hover:bg-red-700" disabled={confirmText.trim() !== "HAPUS" || busy} onClick={deleteAccount}>{busy ? "Menghapus..." : "Hapus akun saya"}</Button>
        </section>
      </div>
    </div>
  );
}
