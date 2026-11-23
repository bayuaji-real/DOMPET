"use client";

import * as React from "react";
import { Bug, Lightbulb, Loader2, CheckCircle2 } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";

type Kind = "bug" | "usul";

export default function BantuanPage() {
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body, page: document.referrer ? new URL(document.referrer).pathname : undefined }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Gagal mengirim. Coba lagi.");
        return;
      }
      setDone(true);
    } catch {
      setError("Tidak bisa terhubung. Cek internet lalu coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setKind(null);
    setTitle("");
    setBody("");
    setDone(false);
    setError(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <TopHeader title="Pusat Bantuan" subtitle="Lapor masalah atau usul fitur" />
      <div className="space-y-4 p-4">
        {done ? (
          <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-5 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-teal-600" />
            <p className="text-sm font-bold text-foreground">Terima kasih, laporanmu sudah terkirim.</p>
            <Button onClick={reset} variant="outline" className="cursor-pointer rounded-xl text-xs">Kirim lagi</Button>
          </div>
        ) : !kind ? (
          <div className="grid gap-3">
            <button type="button" onClick={() => setKind("bug")} className="flex cursor-pointer items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 text-left hover:bg-muted/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600"><Bug className="h-5 w-5" /></span>
              <span><span className="block text-sm font-bold text-foreground">Lapor Bug</span><span className="block text-[11px] text-muted-foreground">Ada yang error atau tidak jalan</span></span>
            </button>
            <button type="button" onClick={() => setKind("usul")} className="flex cursor-pointer items-center gap-3 rounded-3xl border border-border/70 bg-card p-4 text-left hover:bg-muted/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600"><Lightbulb className="h-5 w-5" /></span>
              <span><span className="block text-sm font-bold text-foreground">Usul Fitur</span><span className="block text-[11px] text-muted-foreground">Ide supaya Dompetku makin enak dipakai</span></span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-extrabold text-foreground">{kind === "bug" ? "Lapor Bug" : "Usul Fitur"}</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder={kind === "bug" ? "Singkatnya, apa yang error?" : "Fitur apa yang kamu mau?"}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-teal-500/40"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              required
              rows={6}
              placeholder={kind === "bug" ? "Ceritakan: kamu sedang apa, lalu apa yang terjadi?" : "Ceritakan idenya dan kenapa berguna."}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500/40"
            />
            <p className="text-[10px] text-muted-foreground">Jangan tulis kata sandi atau nomor rekening di sini.</p>
            {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={reset} className="h-9 cursor-pointer rounded-xl text-xs">Kembali</Button>
              <Button type="submit" disabled={sending || title.trim().length < 3 || body.trim().length < 5} className="h-9 flex-1 cursor-pointer rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-500">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
