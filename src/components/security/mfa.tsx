"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string | null; status: string };
const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 6);
const wrongCode = "Kode belum cocok. Pastikan jam HP-mu benar, lalu coba kode terbaru.";

/** Minta kode 6 angka untuk menaikkan sesi ke level MFA (aal2). */
export function MfaChallenge({ onDone, title = "Masukkan kode dari aplikasi authenticator" }: { onDone: () => void; title?: string }) {
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [noFactor, setNoFactor] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const sb = createClient();
      const { data: fs, error: fe } = await sb.auth.mfa.listFactors();
      if (fe) throw fe;
      const f = fs.totp[0];
      if (!f) { setNoFactor(true); return; }
      const { data: ch, error: ce } = await sb.auth.mfa.challenge({ factorId: f.id });
      if (ce) throw ce;
      const { error: ve } = await sb.auth.mfa.verify({ factorId: f.id, challengeId: ch.id, code });
      if (ve) { setErr(wrongCode); return; }
      setCode(""); onDone();
    } catch { setErr("Belum berhasil. Coba lagi sebentar."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl p-4 ring-1 ring-foreground/10" aria-label="Kode MFA">
      <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-teal-600" aria-hidden /> {title}</p>
      {noFactor && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Akunmu belum punya MFA. Daftarkan dulu di menu Keamanan.</p>}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <Input aria-label="Kode 6 angka" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 angka" value={code} onChange={(e) => setCode(onlyDigits(e.target.value))} />
      <Button type="submit" className="w-full" disabled={code.length !== 6 || busy}>{busy ? "Memeriksa..." : "Lanjut"}</Button>
    </form>
  );
}

/** Daftar, lihat, dan hapus MFA (TOTP) untuk akun sendiri. */
export function MfaCard() {
  const [factors, setFactors] = React.useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = React.useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const { data, error } = await createClient().auth.mfa.listFactors();
      setFactors(error ? [] : (data.totp as Factor[]));
    } catch { setFactors([]); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { void load(); }, [load]);

  const start = async () => {
    setBusy(true); setMsg(null);
    try {
      const sb = createClient();
      const { data: all } = await sb.auth.mfa.listFactors();
      for (const f of ((all as unknown as { all?: Factor[] })?.all ?? [])) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Dompetku ${Math.random().toString(36).slice(2, 7)}` });
      if (error) throw error;
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch { setMsg({ ok: false, text: "Belum bisa memulai pendaftaran MFA. Coba lagi sebentar." }); } finally { setBusy(false); }
  };
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault(); if (!enrolling) return; setBusy(true); setMsg(null);
    try {
      const sb = createClient();
      const { data: ch, error: ce } = await sb.auth.mfa.challenge({ factorId: enrolling.id });
      if (ce) throw ce;
      const { error: ve } = await sb.auth.mfa.verify({ factorId: enrolling.id, challengeId: ch.id, code });
      if (ve) { setMsg({ ok: false, text: wrongCode }); return; }
      setEnrolling(null); setCode(""); setMsg({ ok: true, text: "MFA aktif. Mulai sekarang akunmu meminta kode saat login admin." }); await load();
    } catch { setMsg({ ok: false, text: "Belum berhasil. Coba lagi sebentar." }); } finally { setBusy(false); }
  };
  const cancel = async () => { if (enrolling) await createClient().auth.mfa.unenroll({ factorId: enrolling.id }).catch(() => {}); setEnrolling(null); setCode(""); };
  const remove = async (id: string) => {
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setMsg(error ? { ok: false, text: "MFA belum bisa dimatikan. Masukkan kode dulu lalu coba lagi." } : { ok: true, text: "MFA dimatikan." });
    await load(); setBusy(false);
  };

  const active = (factors ?? []).filter((f) => f.status === "verified");
  return (
    <section aria-label="Verifikasi dua langkah (MFA)" className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-teal-600" aria-hidden /> Verifikasi dua langkah (MFA)</h2>
      <p className="text-sm text-muted-foreground">Selain kata sandi, akunmu meminta kode 6 angka dari aplikasi authenticator (Google Authenticator, Authy, atau 1Password) di HP-mu. Sangat disarankan untuk akun admin.</p>
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>{msg.text}</p>}
      {factors === null && <div className="h-16 animate-pulse rounded-xl bg-muted" aria-busy="true" />}
      {enrolling && (
        <form onSubmit={confirm} className="space-y-2 rounded-xl p-4 ring-1 ring-foreground/10">
          <p className="text-sm">1. Buka aplikasi authenticator, pilih tambah akun, lalu pindai gambar ini.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qr} alt="Kode QR untuk aplikasi authenticator" className="mx-auto size-44 rounded-lg bg-white p-2" />
          <p className="text-xs text-muted-foreground">Kalau tidak bisa memindai, ketik kunci ini di aplikasinya: <span className="select-all break-all font-mono">{enrolling.secret}</span></p>
          <p className="text-sm">2. Ketik kode 6 angka yang muncul di aplikasi.</p>
          <Input aria-label="Kode 6 angka dari aplikasi" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(onlyDigits(e.target.value))} />
          <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={code.length !== 6 || busy}>Aktifkan</Button><Button type="button" variant="outline" onClick={cancel}>Batal</Button></div>
        </form>
      )}
      {factors && !enrolling && active.length === 0 && <Button className="w-full" disabled={busy} onClick={start}>Daftarkan MFA</Button>}
      {active.map((f) => (
        <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl p-3 ring-1 ring-foreground/10">
          <span className="text-sm">MFA aktif <span className="text-xs text-muted-foreground">({f.friendly_name ?? "authenticator"})</span></span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(f.id)}>Matikan</Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Simpan kunci cadangan di tempat aman. Kalau HP hilang dan tidak ada cadangan, minta superadmin atau pemilik aplikasi mereset MFA-mu.</p>
    </section>
  );
}
