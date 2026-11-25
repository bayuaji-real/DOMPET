"use client";

import * as React from "react";
import { Bubble, ReplyBubble, ReplyRow, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

/** Penjelasan dan saran dari Ruby atas kondisi keuangan, bergaya chat Ruby. Skor tetap dihitung kode; AI hanya dipanggil saat tombol ditekan. */
export function RubyAdvice({ question }: { question: string }) {
  const [log, setLog] = React.useState<Msg[]>([]);
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt] = React.useState(() => nowLabel());
  React.useEffect(() => { getUserProfile().then(setProfile).catch(() => {}); }, []);

  const ask = async () => {
    setLog([{ role: "user", text: "Minta saran Ruby", time: nowLabel() }]);
    setState("loading");
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "advisor", messages: [{ role: "user", text: question }] }),
      });
      const json = (await res.json()) as { success: boolean; reply?: string };
      if (!res.ok || !json.success || !json.reply) throw new Error("gagal");
      setLog((l) => [...l, { role: "model", text: json.reply!, time: nowLabel() }]);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="space-y-3 py-2">
      <Bubble msg={{ role: "model", text: "Skor di atas dihitung dari angkamu. Mau aku jelaskan artinya dan beri saran singkat?", time: openedAt }} first profile={profile} />
      {state === "idle" || state === "error" ? (
        <ReplyBubble>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ketuk untuk minta saran:</p>
          <div className="flex flex-col gap-2">
            <ReplyRow label="Minta saran Ruby" onClick={ask} />
          </div>
          {state === "error" && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">Ruby belum bisa menjawab sekarang. Coba lagi sebentar.</p>}
        </ReplyBubble>
      ) : null}
      {log.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 || log[i - 1].role !== m.role} profile={profile} />))}
      {state === "loading" && <Bubble msg={{ role: "model", text: "Ruby sedang membaca angkamu…", time: nowLabel() }} first profile={profile} />}
      {state === "done" && <p className="px-1 text-[10px] leading-tight text-muted-foreground">Saran dari AI, bukan nasihat keuangan profesional. Skor tetap dari hitungan di atas.</p>}
    </div>
  );
}
