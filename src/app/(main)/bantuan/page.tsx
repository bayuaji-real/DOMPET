"use client";

import * as React from "react";
import { Send, Loader2, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compression";
import { TopHeader } from "@/components/layout/top-header";
import { Bubble, ReplyBubble, ReplyRow, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

type Kind = "bug" | "usul";
type Step = "kind" | "title" | "body" | "photo" | "sending" | "done";

const ASK: Record<Kind, { title: string; body: string }> = {
  bug: { title: "Siap, aku catat bugnya. Singkatnya, apa yang error?", body: "Ceritakan: kamu sedang apa, lalu apa yang terjadi?" },
  usul: { title: "Asik, aku tampung usulmu. Fitur apa yang kamu mau?", body: "Ceritakan idenya dan kenapa berguna." },
};

/** Pusat Bantuan berbentuk chat Ruby: pilih jenis laporan, lalu Ruby menanyakan judul, isi, dan foto (opsional). */
export default function BantuanPage() {
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [step, setStep] = React.useState<Step>("kind");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [photo, setPhoto] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [input, setInput] = React.useState("");
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt, setOpenedAt] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenedAt(nowLabel());
    getUserProfile().then(setProfile).catch(() => {});
  }, []);
  React.useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [msgs, step, photo]);

  const say = (text: string): Msg => ({ role: "model", text, time: nowLabel() });
  const mine = (text: string): Msg => ({ role: "user", text, time: nowLabel() });

  const choose = (k: Kind) => {
    setKind(k);
    setStep("title");
    setMsgs((m) => [...m, mine(k === "bug" ? "Lapor bug" : "Usul fitur"), say(ASK[k].title), say("Jangan tulis kata sandi atau nomor rekening di sini ya.")]);
  };

  const sendText = (raw: string) => {
    const text = raw.trim();
    if (!kind) return;
    if (step === "title") {
      if (text.length < 3) { setMsgs((m) => [...m, mine(text), say("Judulnya minimal 3 huruf ya. Coba tulis ulang.")]); setInput(""); return; }
      setTitle(text.slice(0, 120)); setInput(""); setStep("body");
      setMsgs((m) => [...m, mine(text.slice(0, 120)), say(ASK[kind].body)]);
    } else if (step === "body") {
      if (text.length < 5) { setMsgs((m) => [...m, mine(text), say("Ceritanya minimal 5 huruf ya. Boleh lebih lengkap.")]); setInput(""); return; }
      setBody(text.slice(0, 2000)); setInput(""); setStep("photo");
      setMsgs((m) => [...m, mine(text.slice(0, 2000)), say("Mau lampirkan foto layarnya? Ini opsional, bisa langsung dikirim.")]);
    }
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMsgs((m) => [...m, say("Pilih file gambar ya.")]); return; }
    try {
      const c = await compressImage(file, 1280, 0.75);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob: c.blob, url: URL.createObjectURL(c.blob) });
    } catch {
      setMsgs((m) => [...m, say("Foto tidak bisa dibaca. Coba foto lain.")]);
    }
  };

  const submit = async () => {
    if (!kind || step === "sending") return;
    setStep("sending");
    setMsgs((m) => [...m, mine(photo ? "Kirim dengan foto" : "Kirim sekarang")]);
    const fail = (t: string) => { setMsgs((m) => [...m, say(t)]); setStep("photo"); };
    try {
      let imagePath: string | undefined;
      if (photo) {
        const sb = createClient();
        const { data: u } = await sb.auth.getUser();
        if (!u.user) return fail("Sesi habis, silakan masuk lagi.");
        const path = `${u.user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await sb.storage.from("help-attachments").upload(path, photo.blob, { contentType: "image/jpeg" });
        if (upErr) return fail("Foto gagal diunggah. Coba lagi atau kirim tanpa foto.");
        imagePath = path;
      }
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body, imagePath, page: document.referrer ? new URL(document.referrer).pathname : undefined }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) return fail(json.error ?? "Gagal mengirim. Coba lagi.");
      setMsgs((m) => [...m, say("Terima kasih, laporanmu sudah terkirim dan akan dibaca tim.")]);
      setStep("done");
    } catch {
      fail("Tidak bisa terhubung. Cek internet lalu coba lagi.");
    }
  };

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setMsgs([]); setKind(null); setStep("kind"); setTitle(""); setBody(""); setPhoto(null); setInput("");
  };

  const typing = step === "title" || step === "body";
  const placeholder = step === "title" ? (kind === "bug" ? "Singkatnya, apa yang error?" : "Fitur apa yang kamu mau?") : step === "body" ? ASK[kind ?? "bug"].body : "Pilih salah satu di atas";

  return (
    <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
      <TopHeader title="Hubungi Bantuan" subtitle="Lapor masalah atau usul fitur ke tim kami" />
      <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-3 dark:bg-[#0b141a]">
        <Bubble msg={{ role: "model", text: "Ada yang mau kamu laporkan atau usulkan? Pilih salah satu di bawah ya.", time: openedAt || undefined }} first profile={profile} />
        {step === "kind" && (
          <ReplyBubble>
            <p className="mb-1.5">Mau apa hari ini?</p>
            <div className="flex flex-col gap-1.5">
              <ReplyRow label="🐞 Lapor bug (ada yang error)" onClick={() => choose("bug")} />
              <ReplyRow label="💡 Usul fitur (ide supaya makin enak dipakai)" onClick={() => choose("usul")} />
            </div>
          </ReplyBubble>
        )}
        {msgs.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 ? true : msgs[i - 1].role !== m.role} profile={profile} />))}
        {(step === "photo" || step === "sending") && (
          <ReplyBubble>
            {photo && (
              <div className="relative mb-2 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Foto lampiran" className="h-24 w-24 rounded-xl border border-border object-cover" />
                <button type="button" aria-label="Hapus foto" onClick={() => { URL.revokeObjectURL(photo.url); setPhoto(null); }} className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-rose-600 text-white shadow"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} aria-label="Pilih foto" />
            <div className="flex flex-col gap-1.5">
              <ReplyRow label={photo ? "Ganti foto" : "Tambah foto / tangkapan layar"} icon={<ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => fileRef.current?.click()} />
              <ReplyRow label={step === "sending" ? "Mengirim..." : photo ? "Kirim dengan foto" : "Kirim sekarang"} icon={step === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : undefined} onClick={() => void submit()} />
            </div>
          </ReplyBubble>
        )}
        {step === "done" && (
          <ReplyBubble>
            <p className="mb-1.5">Ada lagi yang mau disampaikan?</p>
            <div className="flex flex-col gap-1.5"><ReplyRow label="Kirim laporan lain" onClick={reset} /></div>
          </ReplyBubble>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); sendText(input); }} className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background px-3 py-2.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={step === "body" ? 2000 : 120} aria-label="Pesan Bantuan" placeholder={placeholder} disabled={!typing} className="h-10 flex-1 rounded-full border border-border bg-muted/40 px-4 text-xs outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50" />
        <button type="submit" disabled={!typing || !input.trim()} aria-label="Kirim" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
