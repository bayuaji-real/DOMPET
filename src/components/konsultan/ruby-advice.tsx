"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/** Penjelasan dan saran dari Ruby atas kondisi keuangan. Skor tetap dihitung kode; AI hanya menjelaskan, dan hanya dipanggil saat tombol ditekan. */
export function RubyAdvice({ question }: { question: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = React.useState("");
  const ask = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "advisor", messages: [{ role: "user", text: question }] }),
      });
      const json = (await res.json()) as { success: boolean; reply?: string };
      if (!res.ok || !json.success || !json.reply) throw new Error("gagal");
      setText(json.reply);
      setState("done");
    } catch {
      setState("error");
    }
  };
  return (
    <div className="space-y-2 rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
      {state !== "done" && (
        <>
          <p className="text-xs text-muted-foreground">Skor di atas dihitung dari angkamu. Mau Ruby menjelaskan artinya dan memberi saran singkat?</p>
          <Button type="button" size="sm" onClick={ask} disabled={state === "loading"}>{state === "loading" ? "Ruby sedang membaca…" : "Minta saran Ruby"}</Button>
          {state === "error" && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">Ruby belum bisa menjawab sekarang. Coba lagi sebentar.</p>}
        </>
      )}
      {state === "done" && (
        <>
          <p className="whitespace-pre-line text-sm">{text}</p>
          <p className="text-[11px] text-muted-foreground">Saran dari AI, bukan nasihat keuangan profesional. Skor tetap dari hitungan di atas.</p>
        </>
      )}
    </div>
  );
}
