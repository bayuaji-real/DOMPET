"use client";

import * as React from "react";

/**
 * True saat keyboard HP sedang terbuka. Dibaca dari mengecilnya tinggi layar yang terlihat
 * (visualViewport) dibanding tinggi terbesar yang pernah terlihat, ditambah cadangan: kolom isian sedang fokus.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const vv = window.visualViewport;
    let maxH = vv ? vv.height : window.innerHeight;
    const isField = (el: Element | null) =>
      !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      if (h > maxH) maxH = h;
      setOpen(maxH - h > 120 || (isField(document.activeElement) && maxH - h > 60));
    };
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", () => setTimeout(update, 50));
    update();
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
    };
  }, []);
  return open;
}
