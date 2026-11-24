import { describe, expect, it } from "vitest";
import { receiptToSplit } from "./split-bill-scan";
import type { ScanReceiptResult } from "@/app/api/scan-receipt/route";

const base = (p: Partial<ScanReceiptResult>): ScanReceiptResult => ({
  is_receipt: true, merchant: "Warung", date: null, total: 0, items: [], suggested_category: null, suggested_wallet: null, payment_hint: null, confidence: 1, ...p,
});
let n = 0;
const id = () => `x${++n}`;

describe("receiptToSplit", () => {
  it("memecah harga baris menjadi harga satuan bila habis dibagi jumlah", () => {
    const r = receiptToSplit(base({ items: [{ name: "Es teh", qty: 2, price: 10000 }] }), ["me", "a"], id);
    expect(r.items[0]).toMatchObject({ name: "Es teh", qty: 2, price: 5000, sharedBy: ["me", "a"] });
  });
  it("tidak membulatkan: harga baris yang tidak habis dibagi dijadikan satu baris", () => {
    const r = receiptToSplit(base({ items: [{ name: "Nasi", qty: 3, price: 10000 }] }), ["me"], id);
    expect(r.items[0]).toMatchObject({ name: "Nasi (3x)", qty: 1, price: 10000 });
  });
  it("menghitung persen pajak dan service dari subtotal, diskon tetap nominal", () => {
    const r = receiptToSplit(base({ items: [{ name: "A", qty: 1, price: 100000 }], tax_breakdown: { subtotal: 100000, tax: 10000, service_charge: 5000, discount: 3000 } }), ["me"], id);
    expect(r.extras).toMatchObject({ taxPercent: 10, servicePercent: 5, discount: 3000 });
  });
  it("membuang baris tanpa nama atau tanpa harga", () => {
    const r = receiptToSplit(base({ items: [{ name: "", qty: 1, price: 5000 }, { name: "B", qty: 1, price: 0 }] }), ["me"], id);
    expect(r.items).toHaveLength(0);
  });
});
