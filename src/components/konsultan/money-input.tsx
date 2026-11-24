"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";

const fmt = (n: number, decimals: boolean) => (n > 0 ? (decimals ? String(n).replace(".", ",") : n.toLocaleString("id-ID")) : "");

/** Input angka. Tanpa desimal: pemisah ribuan gaya Indonesia. Dengan desimal: ketik koma atau titik. value dalam angka murni. */
export function MoneyInput({ value, onChange, id, placeholder, suffix, decimals = false, "aria-label": ariaLabel }: { value: number; onChange: (n: number) => void; id?: string; placeholder?: string; suffix?: string; decimals?: boolean; "aria-label"?: string }) {
  const [text, setText] = React.useState(fmt(value, decimals));
  const [last, setLast] = React.useState(value);
  // Nilai berubah dari luar (misal formulir dikosongkan): ikuti. Nilai dari ketikan sendiri tidak mengubah teks.
  if (value !== last) { setLast(value); setText(fmt(value, decimals)); }
  return (
    <div className="relative">
      <Input
        id={id}
        aria-label={ariaLabel}
        inputMode={decimals ? "decimal" : "numeric"}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          let n: number;
          if (decimals) { const t = e.target.value.replace(/[^\d.,]/g, ""); setText(t); n = Number(t.replace(",", ".")) || 0; }
          else { n = Number(e.target.value.replace(/\D/g, "")) || 0; setText(n > 0 ? n.toLocaleString("id-ID") : ""); }
          setLast(n); onChange(n);
        }}
        className={suffix ? "pr-14" : ""}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}
