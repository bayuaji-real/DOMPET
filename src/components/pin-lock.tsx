"use client";
import * as React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIN_KEY, PIN_TRIES_KEY, checkPin, isLocked, registerFailure, type StoredPin, type Tries } from "@/lib/konsultan/pin";

const UNLOCK_KEY = "dompet_unlocked_at";
const RELOCK_MS = 2 * 60_000;

function readPin(): StoredPin | null { try { const r = localStorage.getItem(PIN_KEY); return r ? (JSON.parse(r) as StoredPin) : null; } catch { return null; } }
function readTries(): Tries { try { return JSON.parse(localStorage.getItem(PIN_TRIES_KEY) ?? "") as Tries; } catch { return { count: 0, lockedUntil: 0 }; } }

/** Menutup layar dengan PIN bila PIN diaktifkan di perangkat ini. Terkunci lagi setelah aplikasi disembunyikan lebih dari 2 menit. */
export function PinLock() {
  const [locked, setLocked] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [msg, setMsg] = React.useState("");
  React.useEffect(() => {
    const stored = readPin();
    const at = Number(sessionStorage.getItem(UNLOCK_KEY) ?? 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && Date.now() - at > RELOCK_MS) setLocked(true);
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS && readPin()) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  if (!locked) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readPin(); if (!stored) { setLocked(false); return; }
    let t = readTries();
    if (isLocked(t, Date.now())) { setMsg(`Terlalu banyak percobaan. Coba lagi ${Math.ceil((t.lockedUntil - Date.now()) / 1000)} detik lagi.`); return; }
    if (await checkPin(pin, stored)) { localStorage.setItem(PIN_TRIES_KEY, JSON.stringify({ count: 0, lockedUntil: 0 })); sessionStorage.setItem(UNLOCK_KEY, String(Date.now())); setPin(""); setMsg(""); setLocked(false); return; }
    t = registerFailure(t, Date.now()); localStorage.setItem(PIN_TRIES_KEY, JSON.stringify(t));
    setPin(""); setMsg(isLocked(t, Date.now()) ? "Terlalu banyak percobaan. Tunggu 1 menit." : "PIN salah. Coba lagi.");
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Aplikasi terkunci" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-background p-6">
      <Lock className="size-8 text-teal-600" aria-hidden />
      <p className="text-lg font-bold">Masukkan PIN</p>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <Input aria-label="PIN" type="password" inputMode="numeric" autoFocus maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="text-center text-xl tracking-[0.5em]" />
        {msg && <p role="alert" className="text-center text-sm text-red-600">{msg}</p>}
        <Button type="submit" className="w-full" disabled={pin.length < 4}>Buka</Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">Lupa PIN? Keluar dari akun lalu masuk lagi, PIN di perangkat ini akan dihapus.</p>
      <button type="button" className="text-sm text-teal-600 underline" onClick={async () => { try { const { createClient } = await import("@/lib/supabase/client"); await createClient().auth.signOut(); } catch {} localStorage.removeItem(PIN_KEY); localStorage.removeItem(PIN_TRIES_KEY); localStorage.removeItem("dompetku_user_profile"); window.location.href = "/login"; }}>Keluar dari akun</button>
    </div>
  );
}
