"use client";

import * as React from "react";
import { Bug, Lightbulb, Loader2, CheckCircle2, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compression";
import { TopHeader } from "@/components/layout/top-header";
import { Button } from "@/components/ui/button";
import { RubyBubble, ASSISTANT_GREETING } from "@/components/ai/ruby";

type Kind = "bug" | "usul";

export default function BantuanPage() {
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<{ blob: Blob; url: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar ya.");
      return;
    }
    try {
      const c = await compressImage(file, 1280, 0.75);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob: c.blob, url: URL.createObjectURL(c.blob) });
      setError(null);
    } catch {
      setError("Foto tidak bisa dibaca. Coba foto lain.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kind || sending) return;
    setSending(true);
    setError(null);
    try {
      let imagePath: string | undefined;
      if (photo) {
        const sb = createClient();
        const { data: u } = await sb.auth.getUser();
        if (!u.user) {
          setError("Sesi habis, silakan masuk lagi.");
          return;
        }
        const path = `${u.user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await sb.storage.from("help-attachments").upload(path, photo.blob, { contentType: "image/jpeg" });
        if (upErr) {
          setError("Foto gagal diunggah. Coba lagi atau kirim tanpa foto.");
          return;
        }
        imagePath = path;
      }
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body, imagePath, page: document.referrer ? new URL(document.referrer).pathname : undefined }),
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
    setPhoto(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      <TopHeader title="Hubungi Bantuan" subtitle="Lapor masalah atau usul fitur ke tim kami" />
      <div className="space-y-4 p-4">
        <div className="space-y-2 rounded-3xl bg-[#efeae2] p-3 dark:bg-[#0b141a]">
          <RubyBubble>
            <p>{ASSISTANT_GREETING}</p>
          </RubyBubble>
          <RubyBubble showName={false}>
            <p>
              {done
                ? "Terima kasih, laporanmu sudah kami terima dan akan dibaca tim."
                : !kind
                  ? "Ada yang mau kamu laporkan atau usulkan? Pilih salah satu di bawah ya."
                  : kind === "bug"
                    ? "Ceritakan apa yang error, dan lampirkan foto layarnya kalau ada."
                    : "Ceritakan idemu, supaya Dompetku makin enak dipakai."}
            </p>
          </RubyBubble>
        </div>
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} aria-label="Pilih foto" />
            {photo ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Foto lampiran" className="h-24 w-24 rounded-xl border border-border object-cover" />
                <button type="button" aria-label="Hapus foto" onClick={() => { URL.revokeObjectURL(photo.url); setPhoto(null); }} className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white shadow"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40">
                <ImagePlus className="h-4 w-4" /> Tambah foto / tangkapan layar (opsional)
              </button>
            )}
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
