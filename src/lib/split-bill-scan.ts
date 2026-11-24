import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";
import type { SplitExtras, SplitItem } from "@/lib/split-bill";

/** Ubah hasil baca struk jadi item dan biaya tambahan Split Bill. Semua item awalnya dibagi ke orang yang ada. */
export function receiptToSplit(r: ScanReceiptResult, personIds: string[], newId: () => string): { title: string; items: SplitItem[]; extras: SplitExtras } {
  const items: SplitItem[] = (r.items ?? [])
    .filter((i) => i && String(i.name ?? "").trim() && Number(i.price) > 0)
    .map((i) => {
      const qty = Math.min(99, Math.max(1, Math.round(Number(i.qty) || 1)));
      const line = Math.round(Number(i.price));
      const even = qty > 1 && line % qty === 0;
      return {
        id: newId(),
        name: even || qty === 1 ? String(i.name).trim().slice(0, 60) : `${String(i.name).trim().slice(0, 52)} (${qty}x)`,
        price: even ? line / qty : line,
        qty: even ? qty : 1,
        sharedBy: [...personIds],
      };
    });
  const tb = r.tax_breakdown ?? {};
  const base = Number(tb.subtotal) > 0 ? Number(tb.subtotal) : items.reduce((s, i) => s + i.price * i.qty, 0);
  const pct = (nominal?: number | null) => (base > 0 && Number(nominal) > 0 ? Math.min(100, Math.round((Number(nominal) / base) * 10000) / 100) : 0);
  const extras: SplitExtras = {
    taxPercent: pct(tb.tax),
    servicePercent: pct(tb.service_charge),
    discount: Math.max(0, Math.round(Number(tb.discount) || 0)),
    shipping: 0,
    otherFee: 0,
    shippingMode: "equal",
  };
  return { title: String(r.merchant ?? "").trim().slice(0, 60), items, extras };
}
