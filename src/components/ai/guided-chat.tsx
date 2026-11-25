"use client";

import * as React from "react";
import { Send, RotateCcw } from "lucide-react";
import { TopHeader } from "@/components/layout/top-header";
import { Bubble, ReplyBubble, ReplyRow, nowLabel, type Msg } from "@/components/ai/ai-chat";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";
import { parseAnswer, type Answers, type Flow } from "@/lib/konsultan/guided";

export type Prefill = { label: string; values: Answers };

/** Layar chat bergaya Chat AI dengan pertanyaan tetap. Tanpa AI, jadi gratis dan hasilnya selalu sama untuk angka yang sama. */
export function GuidedChat({ flow, prefill }: { flow: Flow; prefill?: () => Promise<Prefill | null> }) {
  const { steps } = flow;
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [answers, setAnswers] = React.useState<Answers>({});
  const [idx, setIdx] = React.useState(0);
  const [input, setInput] = React.useState("");
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [pre, setPre] = React.useState<Prefill | null>(null);
  const [openedAt, setOpenedAt] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenedAt(nowLabel());
    getUserProfile().then(setProfile).catch(() => {});
    prefill?.().then((p) => setPre(p)).catch(() => {});
  }, [prefill]);
  React.useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [msgs]);

  const done = idx >= steps.length;
  const step = done ? null : steps[idx];
  const say = (text: string) => ({ role: "model" as const, text, time: nowLabel() });
  const mine = (text: string) => ({ role: "user" as const, text, time: nowLabel() });
  const nextIdx = (a: Answers, from: number) => { let i = from; while (i < steps.length && a[steps[i].key] !== undefined) i++; return i; };

  const advance = (a: Answers, from: number, lead: Msg[]) => {
    const n = nextIdx(a, from);
    setAnswers(a); setIdx(n);
    setMsgs((m) => [...m, ...lead, say(n >= steps.length ? flow.compute(a) : steps[n].ask)]);
  };

  const send = (raw: string) => {
    const text = raw.trim().slice(0, 100);
    if (!text) return;
    setInput("");
    if (!step) { setMsgs((m) => [...m, mine(text), say("Ketuk \"Hitung lagi\" kalau mau mengulang.")]); return; }
    const v = parseAnswer(step, text);
    if (v === null) { setMsgs((m) => [...m, mine(text), say(step.hint ?? "Aku belum paham. Coba tulis ulang.")]); return; }
    advance({ ...answers, [step.key]: v }, idx + 1, [mine(text)]);
  };

  const usePre = () => {
    if (!pre) return;
    const a = { ...answers, ...pre.values };
    setPre(null);
    advance(a, 0, [mine("Pakai data dompetku"), say(`Oke, kupakai: ${pre.label}`)]);
  };
  const restart = () => { setMsgs([]); setAnswers({}); setIdx(0); setInput(""); prefill?.().then(setPre).catch(() => {}); };

  const chips: { label: string; run: () => void }[] = done
    ? [{ label: "Hitung lagi", run: restart }]
    : [...(pre && idx === 0 ? [{ label: "Pakai data dompetku", run: usePre }] : []),
       ...(step!.kind === "choice" ? step!.options!.map((o) => ({ label: o.label, run: () => send(o.label) })) : (step!.chips ?? []).map((c) => ({ label: c, run: () => send(c) })))];

  return (
    <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
      <TopHeader title={flow.title} subtitle={flow.subtitle} />
      <div className="flex-1 overflow-y-auto bg-background/50 px-3.5 py-4 space-y-3">
        <Bubble msg={{ role: "model", text: flow.greeting, time: openedAt || undefined }} first profile={profile} />
        {msgs.map((m, i) => (<Bubble key={i} msg={m} first={i === 0 ? true : msgs[i - 1].role !== m.role} profile={profile} />))}
        {(chips.length > 0 || (done && !!flow.links?.length)) && (
          <ReplyBubble>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{done ? (flow.links?.length ? "Mau hitung lagi atau buka fitur lain?" : "Mau hitung lagi?") : "Ketuk salah satu, atau ketik sendiri di bawah ya:"}</p>
            <div className="flex flex-col gap-2">
              {chips.map((c) => (<ReplyRow key={c.label} label={c.label} onClick={c.run} icon={c.label === "Hitung lagi" ? <RotateCcw className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" /> : undefined} />))}
              {done && flow.links?.map((l) => (<ReplyRow key={l.href + l.text} label={l.text} href={l.href} />))}
            </div>
          </ReplyBubble>
        )}
        <div ref={endRef} />
      </div>
      <p className="bg-background px-3 pt-1.5 text-center text-[10px] leading-tight text-muted-foreground">{flow.footer}</p>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 bg-card/90 border-t border-border/80 flex items-center gap-2 shrink-0 backdrop-blur-md">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={100} aria-label={`Pesan ${flow.title}`} placeholder={done ? "Ketuk Hitung lagi" : (step?.placeholder ?? "Ketik jawabanmu di sini")} disabled={done} className="flex-1 bg-muted/40 border border-border/70 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50 transition-all" />
        <button type="submit" disabled={done || !input.trim()} aria-label="Kirim" className="size-10 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer"><Send className="size-4" /></button>
      </form>
    </div>
  );
}
