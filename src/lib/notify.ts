/** Pesan singkat di dalam aplikasi (pengganti alert bawaan browser). */
export function notify(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("dompet:toast", { detail: message }));
}
