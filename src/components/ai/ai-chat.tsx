"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronRight, Send } from "lucide-react";
import type { AIChatResponse, SavingsProposal } from "@/app/api/ai-chat/route";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { ASSISTANT_AVATAR, ASSISTANT_GREETING, ASSISTANT_NAME, RUBY_MENU } from "@/components/ai/ruby";

export type { SavingsProposal };


interface Msg {
  role: "user" | "model";
  text: string;
  /** Jam kirim (WIB), mis. "09:41". */
  time?: string;
}

function nowLabel(): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" })
    .format(new Date())
    .replace(".", ":");
}

/** Tampilkan teks AI: baris "- " jadi poin, **tebal** dirapikan. */
function RichText({ text }: { text: string }) {
  const bold = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    );
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) =>
        /^[-*•]\s+/.test(l) ? (
          <div key={i} className="flex gap-2">
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            <span className="min-w-0 flex-1">{bold(l.replace(/^[-*•]\s+/, ""))}</span>
          </div>
        ) : (
          <p key={i}>{bold(l)}</p>
        )
      )}
    </div>
  );
}

/** Foto bulat di samping bubble: logo untuk Ruby, foto profil (atau emoji/inisial) untuk pengguna. */
function Avatar({ who, profile }: { who: "user" | "model"; profile: UserProfile | null }) {
  const base = "h-8 w-8 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  if (who === "model") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ASSISTANT_AVATAR} alt={ASSISTANT_NAME} className={`${base} bg-white p-1`} draggable={false} />
    );
  }
  if (profile?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.avatarUrl} alt={profile.name || "Kamu"} className={base} draggable={false} />;
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-1 ring-black/5"
      style={{ backgroundColor: profile?.avatarBg || "#0d9488" }}
      aria-label={profile?.name || "Kamu"}
    >
      {profile?.avatarEmoji || profile?.name?.charAt(0).toUpperCase() || "K"}
    </div>
  );
}

/** Satu bubble ala WhatsApp: foto dan nama pengirim hanya di bubble paling atas dalam satu rangkaian, jam di pojok kanan bawah. */
function Bubble({
  msg,
  first,
  profile,
}: {
  msg: Msg;
  first: boolean;
  profile: UserProfile | null;
}) {
  const mine = msg.role === "user";
  const shape = mine ? (first ? "rounded-2xl rounded-tr-sm" : "rounded-2xl") : first ? "rounded-2xl rounded-tl-sm" : "rounded-2xl";
  const color = mine
    ? "bg-[#d9fdd3] text-zinc-900 dark:bg-[#005c4b] dark:text-zinc-50"
    : "bg-white text-zinc-900 dark:bg-[#202c33] dark:text-zinc-50";
  return (
    <div className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""} ${first ? "mt-2" : "mt-0.5"}`}>
      {first ? <Avatar who={msg.role} profile={profile} /> : <span className="w-8 shrink-0" aria-hidden="true" />}
      <div className={`max-w-[80%] px-3 pb-1.5 pt-2 text-xs leading-relaxed shadow-sm ${shape} ${color}`}>
        {!mine && first && <p className="mb-0.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">{ASSISTANT_NAME}</p>}
        {mine ? <p className="whitespace-pre-wrap break-words">{msg.text}</p> : <RichText text={msg.text} />}
        {msg.time && (
          <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
            {msg.time}
            {mine && <CheckCheck className="h-3 w-3 text-sky-500" aria-label="Terkirim" />}
          </span>
        )}
      </div>
    </div>
  );
}

/** Bubble Ruby berisi pilihan cepat (daftar ke bawah): ketuk untuk bertanya, atau buka fitur lain. */
function QuickReplies({
  suggestions,
  showMenu,
  onPick,
}: {
  suggestions?: string[];
  showMenu?: boolean;
  onPick: (text: string) => void;
}) {
  const router = useRouter();
  const row =
    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-teal-600/25 bg-teal-50 px-3 py-2 text-left text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-400/25 dark:bg-[#2a3942] dark:text-teal-200 dark:hover:bg-[#32454f]";
  return (
    <div className="mt-0.5 flex items-start gap-2">
      <span className="w-8 shrink-0" aria-hidden="true" />
      <div className="w-full max-w-[85%] rounded-2xl bg-white px-3 pb-2.5 pt-2 text-xs leading-relaxed text-zinc-900 shadow-sm dark:bg-[#202c33] dark:text-zinc-50">
        {suggestions && suggestions.length > 0 && (
          <>
            <p className="mb-1.5">Ketuk salah satu, atau ketik sendiri di bawah ya:</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((t) => (
                <button key={t} type="button" onClick={() => onPick(t)} className={row}>
                  <span>{t}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        )}
        {showMenu && (
          <>
            <p className={`mb-1.5 ${suggestions && suggestions.length > 0 ? "mt-3" : ""}`}>Mau buka fitur lain? Pilih saja, nanti aku antar:</p>
            <div className="flex flex-col gap-1.5">
              {RUBY_MENU.map((m) => (
                <button key={m.href} type="button" onClick={() => router.push(m.href)} className={row}>
                  <span>{m.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="mt-2 flex items-start gap-2" role="status" aria-label={`${ASSISTANT_NAME} sedang mengetik`}>
      <Avatar who="model" profile={null} />
      <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm dark:bg-[#202c33]">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

interface AiChatProps {
  mode: "savings" | "advisor" | "plan";
  /** Pesan pembuka kedua dari Ruby (panduan apa yang harus ditulis). Sapaan "Halo aku Ruby..." sudah otomatis. */
  intro: string;
  placeholder?: string;
  suggestions?: string[];
  /** Tambahkan daftar fitur lain di bubble pilihan cepat Ruby (dipakai di Tanya AI). */
  showMenu?: boolean;
  /** Kartu hasil (mis. kelayakan tabungan) yang tampil di bawah percakapan. */
  renderProposal?: (proposal: SavingsProposal, reset: () => void) => React.ReactNode;
}

/** Layar chat AI yang dipakai bersama (pembuat tabungan, konsultasi keuangan, rencana keuangan). Tampilan ala WhatsApp. */
export function AiChat({ mode, intro, placeholder, suggestions, showMenu, renderProposal }: AiChatProps) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposal, setProposal] = React.useState<SavingsProposal | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt, setOpenedAt] = React.useState<string>("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setOpenedAt(nowLabel());
    let alive = true;
    getUserProfile()
      .then((p) => alive && setProfile(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, proposal]);

  const reset = () => {
    setMessages([]);
    setProposal(null);
    setError(null);
    setInput("");
  };

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 1000);
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", text, time: nowLabel() }];
    setMessages(next);
    setInput("");
    setError(null);
    setProposal(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: next.slice(-14).map(({ role, text: t }) => ({ role, text: t })) }),
      });
      const json = (await res.json()) as AIChatResponse | { success: false; error: string };
      if (!res.ok || !json.success) {
        setError("error" in json ? json.error : "Terjadi kendala. Coba lagi.");
        return;
      }
      setMessages([...next, { role: "model", text: json.reply, time: nowLabel() }]);
      setProposal(json.proposal);
    } catch {
      setError("Tidak bisa terhubung. Cek internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Pesan pembuka dari Ruby (tidak dikirim ke server, hanya tampilan) + percakapan.
  const opening: Msg[] = [
    { role: "model", text: ASSISTANT_GREETING, time: openedAt || undefined },
    { role: "model", text: intro, time: openedAt || undefined },
  ];
  const all = [...opening, ...messages];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-3 dark:bg-[#0b141a]">
        {all.map((m, i) => (
          <React.Fragment key={i}>
            <Bubble msg={m} first={i === 0 || all[i - 1].role !== m.role} profile={profile} />
            {i === opening.length - 1 && messages.length === 0 && ((suggestions && suggestions.length > 0) || showMenu) && (
              <QuickReplies suggestions={suggestions} showMenu={showMenu} onPick={(t) => void send(t)} />
            )}
          </React.Fragment>
        ))}
        {loading && <TypingBubble />}
        {proposal && <div className="mt-3">{renderProposal?.(proposal, reset)}</div>}
        {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background px-3 py-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder={placeholder ?? "Ketik pesan..."}
          className="h-10 flex-1 rounded-full border border-border bg-muted/40 px-4 text-xs outline-none focus:ring-2 focus:ring-teal-500/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Kirim"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-teal-600 text-white shadow-sm disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
