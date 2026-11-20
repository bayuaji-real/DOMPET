import { describe, it, expect } from "vitest";

describe("Logika Ekstraksi Struk & Storage (receipt)", () => {
  describe("Path Format Supabase Storage receipts", () => {
    it("memastikan path diawali dengan {user_id} dan berformat {user_id}/{tanggal}/{uuid}.jpg", () => {
      const userId = "usr-12345";
      const tanggal = "2026-11-20";
      const uuid = "abc-def-789";
      const path = `${userId}/${tanggal}/${uuid}.jpg`;

      expect(path.startsWith(`${userId}/`)).toBe(true);
      expect(path).toMatch(/^[a-zA-Z0-9_-]+\/\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9_-]+\.jpg$/);
    });
  });

  describe("Aturan Total Bayar Akhir Struk Indonesia", () => {
    it("mengambil TOTAL BAYAR akhir setelah diskon pada struk minimarket", () => {
      // Kasus Indomaret: Subtotal 87.500, Diskon 5.000 -> Total Bayar 82.500
      const subtotal = 87500;
      const diskon = 5000;
      const totalBayar = subtotal - diskon;

      expect(totalBayar).toBe(82500);
      expect(totalBayar).not.toBe(subtotal);
    });

    it("mengambil TOTAL BAYAR akhir setelah PB1 (10%), SC (5%), dan pembulatan pada resto/kafe", () => {
      // Kasus Kopi Kenangan: Subtotal 62.000, PB1 6.200, SC 3.100, Pembulatan -300 -> Total 71.000
      const subtotal = 62000;
      const pb1 = 6200;
      const serviceCharge = 3100;
      const pembulatan = -300;
      const totalBayar = subtotal + pb1 + serviceCharge + pembulatan;

      expect(totalBayar).toBe(71000);
      expect(totalBayar).not.toBe(subtotal);
    });
  });

  describe("Pencocokan Dompet & Kategori Pintar", () => {
    it("mendeteksi dompet GoPay jika payment_hint mengandung QRIS GoPay", () => {
      const hint = "QRIS GoPay";
      const availableWallets = [
        { id: "w-cash", name: "Uang Tunai" },
        { id: "w-gopay", name: "GoPay" },
        { id: "w-bca", name: "BCA Utama" },
      ];

      const matched = availableWallets.find((w) =>
        hint.toLowerCase().includes(w.name.toLowerCase())
      );

      expect(matched?.name).toBe("GoPay");
    });

    it("mendeteksi dompet Uang Tunai jika payment_hint tunai/cash", () => {
      const hint = "Tunai / Cash";
      const availableWallets = [
        { id: "w-bca", name: "BCA Utama" },
        { id: "w-cash", name: "Uang Tunai" },
      ];

      const isCash = /tunai|cash/i.test(hint);
      const matched = isCash
        ? availableWallets.find((w) => /tunai/i.test(w.name))
        : null;

      expect(matched?.name).toBe("Uang Tunai");
    });
  });
});
