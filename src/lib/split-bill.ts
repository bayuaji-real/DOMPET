/**
 * Hitung split bill yang adil.
 *
 * - Tiap item dibagi rata ke orang yang ikut memesan item itu.
 * - Pajak, service charge, dan diskon dibagi PROPORSIONAL ke subtotal tiap orang
 *   (yang pesan lebih banyak menanggung pajak lebih banyak).
 * - Ongkir & biaya lain bisa dibagi RATA ke semua orang yang ikut, atau PROPORSIONAL.
 * - Hasil dibulatkan ke rupiah penuh, sisa pembulatan dibagikan supaya total per orang
 *   selalu sama persis dengan total tagihan.
 */

export interface SplitPerson {
  id: string;
  name: string;
}

export interface SplitItem {
  id: string;
  name: string;
  /** harga satuan */
  price: number;
  qty: number;
  /** id orang yang ikut menanggung item ini (dibagi rata di antara mereka) */
  sharedBy: string[];
}

export interface SplitExtras {
  /** pajak, dalam persen dari subtotal setelah diskon (mis. 10 untuk PB1 10%) */
  taxPercent?: number;
  /** service charge, persen dari subtotal setelah diskon */
  servicePercent?: number;
  /** diskon/voucher dalam rupiah, dipotong proporsional */
  discount?: number;
  /** ongkir dalam rupiah */
  shipping?: number;
  /** biaya lain (biaya aplikasi, packing, dll.) dalam rupiah */
  otherFee?: number;
  /** cara bagi ongkir + biaya lain */
  shippingMode?: "equal" | "proportional";
}

export interface SplitShare {
  personId: string;
  name: string;
  subtotal: number;
  discount: number;
  tax: number;
  service: number;
  shipping: number;
  total: number;
}

export interface SplitResult {
  shares: SplitShare[];
  itemsTotal: number;
  discount: number;
  tax: number;
  service: number;
  shipping: number;
  grandTotal: number;
  /** item yang belum dipilih siapa pun (tidak ikut dihitung) */
  unassignedItems: string[];
}

/** Bulatkan sekumpulan angka ke bilangan bulat sehingga jumlahnya tepat `target` (metode sisa terbesar). */
export function roundToTotal(values: number[], target: number): number[] {
  const floors = values.map((v) => Math.floor(v));
  let remainder = Math.round(target) - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let k = 0;
  while (remainder > 0 && order.length > 0) {
    out[order[k % order.length].i] += 1;
    remainder -= 1;
    k += 1;
  }
  while (remainder < 0 && order.length > 0) {
    const idx = order[order.length - 1 - (k % order.length)].i;
    out[idx] -= 1;
    remainder += 1;
    k += 1;
  }
  return out;
}

export function calculateSplit(people: SplitPerson[], items: SplitItem[], extras: SplitExtras = {}): SplitResult {
  const ids = people.map((p) => p.id);
  const subtotal: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const unassignedItems: string[] = [];

  for (const item of items) {
    const lineTotal = Math.max(0, item.price) * Math.max(0, item.qty);
    const who = item.sharedBy.filter((id) => id in subtotal);
    if (lineTotal <= 0) continue;
    if (who.length === 0) {
      unassignedItems.push(item.name || "Item tanpa nama");
      continue;
    }
    for (const id of who) subtotal[id] += lineTotal / who.length;
  }

  const itemsTotal = ids.reduce((a, id) => a + subtotal[id], 0);
  const discount = Math.min(Math.max(0, extras.discount ?? 0), itemsTotal);
  const afterDiscount = itemsTotal - discount;
  const tax = (afterDiscount * Math.max(0, extras.taxPercent ?? 0)) / 100;
  const service = (afterDiscount * Math.max(0, extras.servicePercent ?? 0)) / 100;
  const shipping = Math.max(0, extras.shipping ?? 0) + Math.max(0, extras.otherFee ?? 0);
  const grandTotal = Math.round(afterDiscount + tax + service + shipping);

  // orang yang ikut menanggung minimal 1 item
  const participants = ids.filter((id) => subtotal[id] > 0);
  const rawTotals: Record<string, Omit<SplitShare, "personId" | "name" | "total"> & { total: number }> = {};
  for (const id of ids) {
    const ratio = itemsTotal > 0 ? subtotal[id] / itemsTotal : 0;
    const d = discount * ratio;
    const t = tax * ratio;
    const s = service * ratio;
    const sh =
      participants.length === 0
        ? 0
        : extras.shippingMode === "proportional"
          ? shipping * ratio
          : participants.includes(id)
            ? shipping / participants.length
            : 0;
    rawTotals[id] = { subtotal: subtotal[id], discount: d, tax: t, service: s, shipping: sh, total: subtotal[id] - d + t + s + sh };
  }

  const rounded = roundToTotal(
    ids.map((id) => rawTotals[id].total),
    participants.length > 0 ? grandTotal : 0
  );

  const shares: SplitShare[] = people.map((p, i) => ({
    personId: p.id,
    name: p.name,
    subtotal: Math.round(rawTotals[p.id].subtotal),
    discount: Math.round(rawTotals[p.id].discount),
    tax: Math.round(rawTotals[p.id].tax),
    service: Math.round(rawTotals[p.id].service),
    shipping: Math.round(rawTotals[p.id].shipping),
    total: rounded[i],
  }));

  return {
    shares,
    itemsTotal: Math.round(itemsTotal),
    discount: Math.round(discount),
    tax: Math.round(tax),
    service: Math.round(service),
    shipping: Math.round(shipping),
    grandTotal: participants.length > 0 ? grandTotal : 0,
    unassignedItems,
  };
}

/** Teks ringkasan untuk dibagikan ke WhatsApp / chat. */
export function splitSummaryText(title: string, result: SplitResult, payerName?: string): string {
  const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
  const lines = [`🧾 ${title || "Split bill"}`, ""];
  for (const s of result.shares) {
    if (s.total <= 0) continue;
    lines.push(`• ${s.name}: ${rp(s.total)}`);
  }
  lines.push("", `Total: ${rp(result.grandTotal)}`);
  const extras: string[] = [];
  if (result.discount) extras.push(`diskon -${rp(result.discount)}`);
  if (result.tax) extras.push(`pajak ${rp(result.tax)}`);
  if (result.service) extras.push(`service ${rp(result.service)}`);
  if (result.shipping) extras.push(`ongkir/biaya ${rp(result.shipping)}`);
  if (extras.length) lines.push(`(sudah termasuk ${extras.join(", ")})`);
  if (payerName) lines.push("", `Transfer ke ${payerName} ya 🙏`);
  lines.push("", "Dihitung dengan Dompetku");
  return lines.join("\n");
}
