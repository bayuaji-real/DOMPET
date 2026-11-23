"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import type { AIChatResponse, SavingsProposal } from "@/app/api/ai-chat/route";

export type { SavingsProposal };

interface Msg {
  role: "user" | "model";
  text: string;
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

interface AiChatProps {
  mode: "savings" | "advisor" | "plan";
  intro: string;
  placeholder?: string;
  suggestions?: string[];
  /** Kartu hasil (mis. kelayakan tabungan) yang tampil di bawah percakapan. */
  renderProposal?: (proposal: SavingsProposal, reset: () => void) => React.ReactNode;
}

/** Layar chat AI yang dipakai bersama (pembuat tabungan dan konsultasi keuangan). */
export function AiChat({ mode, intro, placeholder, suggestions, renderProposal }: AiChatProps) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposal, setProposal] = React.useState<SavingsProposal | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

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
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setError(null);
    setProposal(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: next.slice(-14) }),
      });
      const json = (await res.json()) as AIChatResponse | { success: false; error: string };
      if (!res.ok || !json.success) {
        setError("error" in json ? json.error : "Terjadi kendala. Coba lagi.");
        return;
      }
      setMessages([...next, { role: "model", text: json.reply }]);
      setProposal(json.proposal);
    } catch {
      setError("Tidak bisa terhubung. Cek internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-xs text-foreground"><RichText text={intro} /></div>
        {messages.length === 0 && suggestions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-foreground hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-teal-600 px-3 py-2 text-xs text-white"
                : "max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-xs text-foreground"
            }
          >
            {m.role === "user" ? m.text : <RichText text={m.text} />}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Mengetik...
          </div>
        )}
        {proposal && renderProposal?.(proposal, reset)}
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder={placeholder ?? "Ketik pesan..."}
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-teal-500/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Kirim"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-teal-600 text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
