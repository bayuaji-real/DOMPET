"use client";
import * as React from "react";

/** Dialog konfirmasi di dalam aplikasi (pengganti confirm bawaan browser). Pakai: const [ask, dialog] = useConfirm(); render {dialog}; if (!(await ask("Hapus?"))) return; */
export function useConfirm(): [(text: string, yes?: string) => Promise<boolean>, React.ReactNode] {
  const [state, setState] = React.useState<{ text: string; yes: string; resolve: (v: boolean) => void } | null>(null);
  const ask = React.useCallback((text: string, yes = "Ya, hapus") => new Promise<boolean>((resolve) => setState({ text, yes, resolve })), []);
  const answer = (v: boolean) => { state?.resolve(v); setState(null); };
  const dialog = state ? (
    <div role="alertdialog" aria-modal="true" aria-label="Konfirmasi" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <p className="text-sm font-bold text-foreground">{state.text}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => answer(false)} className="h-10 flex-1 cursor-pointer rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted">Batal</button>
          <button type="button" onClick={() => answer(true)} className="h-10 flex-1 cursor-pointer rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700">{state.yes}</button>
        </div>
      </div>
    </div>
  ) : null;
  return [ask, dialog];
}
