"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Cta, IconBox, Notice } from "@/components/ui/form-kit";

/** Ganti kata sandi login akun. Minimal 8 karakter, harus sama dengan konfirmasinya. */
export function PasswordCard() {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, text: "Kata sandi minimal 8 karakter." });
    if (pw !== pw2) return setMsg({ ok: false, text: "Konfirmasi belum sama. Ketik ulang kata sandinya." });
    setBusy(true);
    try {
      const { error } = await createClient().auth.updateUser({ password: pw });
      if (error) setMsg({ ok: false, text: error.message });
      else { setPw(""); setPw2(""); setMsg({ ok: true, text: "Kata sandi akun berhasil diperbarui." }); }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Belum berhasil. Coba lagi sebentar." });
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="Ganti kata sandi" className="space-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      <h2 className="flex items-center gap-2.5 border-b border-border/50 pb-2.5 text-sm font-extrabold"><IconBox tone="neon"><KeyRound className="size-[18px]" aria-hidden /></IconBox> Kata sandi</h2>
      <p className="text-xs text-muted-foreground">Kata sandi untuk masuk ke akun Dompetku.</p>
      {msg && <Notice role="status" tone={msg.ok ? "emerald" : "rose"} emoji={msg.ok ? "✅" : "⚠️"}>{msg.text}</Notice>}
      <form onSubmit={submit} className="space-y-2">
        <div className="relative">
          <Input className="h-10 rounded-xl pr-10" aria-label="Kata sandi baru" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Kata sandi baru, minimal 8 karakter" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Input className="h-10 rounded-xl" aria-label="Ulangi kata sandi baru" type={show ? "text" : "password"} autoComplete="new-password" placeholder="Ulangi kata sandi baru" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <Cta type="submit" disabled={busy || !pw || !pw2}>{busy ? "Menyimpan..." : "Simpan kata sandi"}</Cta>
      </form>
    </section>
  );
}
