import { describe, it, expect } from "vitest";
import { parseAmount, parsePurchase } from "./purchase-parse";

describe("parseAmount", () => {
  it("membaca satuan umum", () => {
    expect(parseAmount("12jt")).toBe(12_000_000);
    expect(parseAmount("2,5 juta")).toBe(2_500_000);
    expect(parseAmount("500rb")).toBe(500_000);
    expect(parseAmount("750k")).toBe(750_000);
    expect(parseAmount("12.000.000")).toBe(12_000_000);
    expect(parseAmount("abc")).toBe(0);
  });
});

describe("parsePurchase", () => {
  it("tunai sederhana", () => {
    const p = parsePurchase("mau beli laptop 12jt");
    expect(p.name).toBe("Laptop");
    expect(p.price).toBe(12_000_000);
    expect(p.mode).toBeUndefined();
  });
  it("cicilan lengkap", () => {
    const p = parsePurchase("motor 25jt cicilan 24 bulan dp 5jt bunga 12%");
    expect(p).toMatchObject({ name: "Motor", price: 25_000_000, mode: "cicilan", months: 24, downPayment: 5_000_000, ratePct: 12 });
  });
  it("tenor tahun dan target waktu", () => {
    const p = parsePurchase("beli hp 3 juta tunai 6 bulan lagi, terkumpul 500rb");
    expect(p).toMatchObject({ name: "Hp", price: 3_000_000, mode: "tunai", targetMonths: 6, saved: 500_000 });
    expect(parsePurchase("kulkas 4jt kredit 1 tahun").months).toBe(12);
  });
  it("tanpa harga tidak mengarang angka", () => {
    const p = parsePurchase("mau beli sepeda");
    expect(p.price).toBeUndefined();
    expect(p.name).toBe("Sepeda");
  });
});
