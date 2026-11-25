"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import type { AIChatResponse, SavingsProposal } from "@/app/api/ai-chat/route";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { ASSISTANT_NAME, RUBY_MENU } from "@/components/ai/ruby";
import { cn } from "@/lib/utils";

export type { SavingsProposal };

export interface Msg {
  role: "user" | "model";
  text: string;
  /** Jam kirim (WIB), mis. "09:41". */
  time?: string;
}

export function nowLabel(): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  })
    .format(new Date())
    .replace(".", ":");
}

interface MetricItem {
  label: string;
  value: string;
}

type ParsedBlock =
  | { type: "verdict"; text: string; badge: "aman" | "waspada" | "strategis" }
  | { type: "header"; text: string }
  | { type: "bullet"; text: string }
  | { type: "metrics"; items: MetricItem[] }
  | { type: "paragraph"; text: string };

function parseRichBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Verdict line: starts with 📌 or status/keputusan tag
    if (line.startsWith("📌") || /^(?:status|keputusan|rekomendasi)\s*:/i.test(line)) {
      const isAman = /aman|sehat|bagus|positif/i.test(line);
      const isWaspada = /waspada|kurang|defisit|hati-hati|peringatan|bahaya/i.test(line);
      blocks.push({
        type: "verdict",
        text: line,
        badge: isAman ? "aman" : isWaspada ? "waspada" : "strategis",
      });
      i++;
      continue;
    }

    // 2. Section header (e.g. "SARAN LANGKAH TAKTIS:", "SARAN PRAKTIS:", "REKOMENDASI:")
    if (
      /^(?:saran(?:\s+langkah)?(?:\s+taktis|\s+praktis)?|rekomendasi|action\s*plan|langkah\s*taktis|tips|catatan)\s*:/i.test(
        line
      ) &&
      line.length < 50
    ) {
      blocks.push({ type: "header", text: line });
      i++;
      continue;
    }

    // 3. Bullet list item (starts with -, *, or •)
    if (/^[-*•]\s+/.test(line)) {
      blocks.push({ type: "bullet", text: line.replace(/^[-*•]\s+/, "") });
      i++;
      continue;
    }

    // 4. Metric item detection: "Label: Rp1.000.000" or "Label: 11 hari lagi"
    const metricMatch = line.match(/^([^:\n]{2,30}):\s*([Rp\d][^\n]{1,30})$/i);
    if (metricMatch) {
      const metrics: MetricItem[] = [
        { label: metricMatch[1].trim(), value: metricMatch[2].trim() },
      ];
      let j = i + 1;
      while (j < lines.length) {
        const nextMatch = lines[j].match(/^([^:\n]{2,30}):\s*([Rp\d][^\n]{1,30})$/i);
        if (nextMatch) {
          metrics.push({ label: nextMatch[1].trim(), value: nextMatch[2].trim() });
          j++;
        } else {
          break;
        }
      }
      if (metrics.length >= 2) {
        blocks.push({ type: "metrics", items: metrics });
        i = j;
        continue;
      }
    }

    // 5. Default paragraph
    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  return blocks;
}

/** Tampilkan teks AI: baris "- " jadi poin bercentang, **tebal** dirapikan, grid metrik rapi. */
function RichText({ text }: { text: string }) {
  const bold = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );

  const blocks = parseRichBlocks(text);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.type === "verdict") {
          return (
            <div key={i} className="flex items-center gap-2 pb-0.5">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs",
                  block.badge === "aman"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : block.badge === "waspada"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                )}
              >
                {bold(block.text)}
              </span>
            </div>
          );
        }

        if (block.type === "header") {
          return (
            <div key={i} className="pt-2 border-t border-border/60">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                {bold(block.text)}
              </span>
            </div>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
              <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1 leading-relaxed">{bold(block.text)}</span>
            </div>
          );
        }

        if (block.type === "metrics") {
          return (
            <div
              key={i}
              className={cn(
                "grid gap-2 py-1",
                block.items.length === 2 ? "grid-cols-2" : "grid-cols-3"
              )}
            >
              {block.items.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 sm:p-2.5 rounded-xl bg-card border border-border/70 text-center shadow-2xs"
                >
                  <span className="text-[10px] text-muted-foreground block truncate">{m.label}</span>
                  <span className="text-xs font-black text-foreground block mt-0.5 truncate">{m.value}</span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <p key={i} className="leading-relaxed text-foreground/90">
            {bold(block.text)}
          </p>
        );
      })}
    </div>
  );
}

/** Foto bulat di samping bubble: badge Sparkles untuk Ruby, foto profil (atau emoji/inisial) untuk pengguna. */
function Avatar({ who, profile }: { who: "user" | "model"; profile: UserProfile | null }) {
  if (who === "model") {
    return (
      <div className="size-7 sm:size-8 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
        <Sparkles className="size-4" />
      </div>
    );
  }
  if (profile?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt={profile.name || "Kamu"}
        className="size-7 sm:size-8 shrink-0 rounded-full object-cover shadow-xs ring-1 ring-border"
        draggable={false}
      />
    );
  }
  return (
    <div
      className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
      style={{ backgroundColor: profile?.avatarBg || "#0d9488" }}
      aria-label={profile?.name || "Kamu"}
    >
      {profile?.avatarEmoji || profile?.name?.charAt(0).toUpperCase() || "K"}
    </div>
  );
}

/** Satu bubble ala preview: badge Sparkles di kiri untuk Ruby, bubble teal di kanan untuk user, kartu elegan untuk Ruby. */
export function Bubble({
  msg,
  first,
  profile,
}: {
  msg: Msg;
  first: boolean;
  profile: UserProfile | null;
}) {
  const mine = msg.role === "user";
  const shape = mine
    ? (first ? "rounded-2xl rounded-tr-xs" : "rounded-2xl")
    : (first ? "rounded-2xl rounded-tl-xs" : "rounded-2xl");

  if (mine) {
    return (
      <div className={cn("flex items-start justify-end gap-2.5", first ? "mt-3" : "mt-1")}>
        <div
          className={cn(
            "max-w-[85%] sm:max-w-[78%] bg-teal-600 text-white p-3 sm:p-3.5 text-xs sm:text-sm font-medium shadow-xs space-y-1",
            shape
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
          {msg.time && (
            <span className="flex items-center justify-end gap-1 text-[10px] tabular-nums text-white/80">
              {msg.time}
              <CheckCheck className="h-3 w-3 text-teal-200" aria-label="Terkirim" />
            </span>
          )}
        </div>
        {first ? <Avatar who="user" profile={profile} /> : <span className="size-7 sm:size-8 shrink-0" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-2.5 animate-in fade-in duration-200", first ? "mt-3" : "mt-1")}>
      {first ? <Avatar who="model" profile={profile} /> : <span className="size-7 sm:size-8 shrink-0" aria-hidden="true" />}
      <div
        className={cn(
          "max-w-[90%] sm:max-w-[85%] rounded-2xl bg-card border border-border/80 p-3.5 sm:p-4 space-y-2.5 text-foreground text-xs sm:text-sm shadow-xs",
          shape
        )}
      >
        {first && (
          <div className="flex items-center gap-1.5 pb-0.5">
            <span className="font-extrabold text-xs text-foreground">Ruby</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
              AI Asisten
            </span>
          </div>
        )}
        <RichText text={msg.text} />
        {msg.time && (
          <span className="flex items-center justify-end text-[10px] tabular-nums text-muted-foreground/75">
            {msg.time}
          </span>
        )}
      </div>
    </div>
  );
}

/** Gaya baris pilihan cepat (dipakai semua chat Ruby): kartu rapi dengan panah di kanan. */
export const quickRow =
  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/80 bg-card p-2.5 sm:p-3 text-left text-xs font-semibold text-foreground transition-all hover:bg-muted/60 hover:border-teal-500/40 active:scale-[0.99] shadow-2xs";

/** Bubble Ruby berisi daftar pilihan. Isinya: ReplyTitle dan ReplyRow. */
export function ReplyBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-start gap-2.5 animate-in fade-in duration-200">
      <span className="size-7 sm:size-8 shrink-0" aria-hidden="true" />
      <div className="w-full max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-xs bg-card border border-border/80 p-3.5 sm:p-4 text-xs leading-relaxed text-foreground shadow-xs">
        {children}
      </div>
    </div>
  );
}

export function ReplyRow({
  label,
  onClick,
  href,
  icon,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-2 min-w-0">
        {icon || <MessageSquare className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-70" aria-hidden="true" />
    </>
  );
  return href ? (
    <Link href={href} className={quickRow}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={quickRow}>
      {inner}
    </button>
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
  return (
    <div className="flex items-start gap-2.5 mt-2 animate-in fade-in duration-200">
      <span className="size-7 sm:size-8 shrink-0" aria-hidden="true" />
      <div className="w-full max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-xs bg-card border border-border/80 p-3.5 sm:p-4 space-y-3 text-foreground text-xs shadow-xs">
        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Ketuk salah satu, atau ketik sendiri di bawah ya:
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPick(t)}
                  className="flex w-full items-center justify-between p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted/60 hover:border-teal-500/40 text-left text-xs font-semibold transition-all active:scale-[0.99] shadow-2xs group cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{t}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
        {showMenu && (
          <div className={cn("space-y-2", suggestions && suggestions.length > 0 && "pt-3 border-t border-border/60")}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Mau buka fitur lain? Pilih saja, nanti aku antar:
            </p>
            <div className="flex flex-col gap-2">
              {RUBY_MENU.map((m) => (
                <button
                  key={m.href}
                  type="button"
                  onClick={() => router.push(m.href)}
                  className="flex w-full items-center justify-between p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted/60 hover:border-teal-500/40 text-left text-xs font-semibold transition-all active:scale-[0.99] shadow-2xs group cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Sparkles className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      className="mt-3 flex items-start gap-2.5 animate-in fade-in duration-200"
      role="status"
      aria-label={`${ASSISTANT_NAME} sedang mengetik`}
    >
      <div className="size-7 sm:size-8 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
        <Sparkles className="size-4" />
      </div>
      <div className="rounded-2xl rounded-tl-xs bg-card border border-border/80 px-4 py-3 text-xs text-muted-foreground flex items-center gap-1.5 shadow-xs">
        <span className="size-2 rounded-full bg-teal-500 animate-bounce" />
        <span className="size-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
        <span className="size-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
        <span className="ml-2 font-medium">Ruby sedang menganalisis data...</span>
      </div>
    </div>
  );
}

interface AiChatProps {
  mode: "savings" | "advisor" | "plan";
  /** Pesan pembuka dari Ruby (panduan apa yang harus ditulis). */
  intro: string;
  placeholder?: string;
  suggestions?: string[];
  /** Tambahkan daftar fitur lain di bubble pilihan cepat Ruby (dipakai di Tanya AI). */
  showMenu?: boolean;
  /** Tampilkan header Ruby ala preview (otomatis aktif di mode advisor). */
  showHeader?: boolean;
  /** Kartu hasil (mis. kelayakan tabungan) yang tampil di bawah percakapan. */
  renderProposal?: (proposal: SavingsProposal, reset: () => void) => React.ReactNode;
}

/** Layar chat AI yang dipakai bersama (pembuat tabungan, konsultasi keuangan, rencana keuangan). Tampilan modern ala preview Ruby. */
export function AiChat({
  mode,
  intro,
  placeholder,
  suggestions,
  showMenu,
  showHeader,
  renderProposal,
}: AiChatProps) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposal, setProposal] = React.useState<SavingsProposal | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt, setOpenedAt] = React.useState<string>("");
  const endRef = React.useRef<HTMLDivElement>(null);

  const shouldShowHeader = showHeader ?? (mode === "advisor");

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
    { role: "model", text: intro, time: openedAt || undefined },
  ];
  const all = [...opening, ...messages];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {shouldShowHeader && (
        <div className="px-4 py-3 bg-card/80 border-b border-border/80 flex items-center justify-between shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative size-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Sparkles className="size-5" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-foreground">Ruby</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
                  AI Asisten Dompetku
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Aktif · Mengetahui data dompetmu</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-background/50 px-3.5 py-4 space-y-3">
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
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="p-3 bg-card/90 border-t border-border/80 flex items-center gap-2 shrink-0 backdrop-blur-md"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder={placeholder ?? "Ketik pertanyaanmu untuk Ruby..."}
          className="flex-1 bg-muted/40 border border-border/70 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Kirim"
          className="size-10 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
