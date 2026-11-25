import { describe, it, expect } from "vitest";

/** Aturan tawaran saldo dompet sebagai modal awal: tidak ada cadangan dana darurat otomatis. */
function usableWallet(wallet: number, cashNeeded: number, saved: number) {
  const room = Math.max(0, cashNeeded - saved);
  return Math.floor(Math.min(wallet, room) / 100_000) * 100_000;
}

describe("modal awal dari saldo dompet", () => {
  it("seluruh saldo boleh dipakai bila masih di bawah kebutuhan", () => { expect(usableWallet(8_000_000, 12_000_000, 0)).toBe(8_000_000); });
  it("tidak lebih dari kebutuhan barang", () => { expect(usableWallet(50_000_000, 12_000_000, 0)).toBe(12_000_000); });
  it("saldo terlalu kecil: tidak ditawarkan", () => { expect(usableWallet(50_000, 12_000_000, 0)).toBe(0); });
});
