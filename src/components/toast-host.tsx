"use client";

import * as React from "react";

/** Menampilkan pesan dari notify(). */
export function ToastHost() {
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onToast = (e: Event) => {
      setMsg(String((e as CustomEvent).detail ?? ""));
      if (t) clearTimeout(t);
      t = setTimeout(() => setMsg(null), 4000);
    };
    window.addEventListener("dompet:toast", onToast);
    return () => {
      window.removeEventListener("dompet:toast", onToast);
      if (t) clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div role="status" className="fixed left-1/2 top-4 z-[70] w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 rounded-2xl bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-white shadow-xl">
      {msg}
    </div>
  );
}
