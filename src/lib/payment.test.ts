import { describe, it, expect } from "vitest";
import {
  countdown, merchantMatches, normalizeProofReading, parsePaymentRequest, paymentErrorMessage, proofReasonMessage,
  proofRequestSchema, savingPct, sniffImage,
} from "./payment";

const UID = "11111111-2222-3333-4444-555555555555";
const RID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("pembayaran Tahap 1", () => {
  it("parsePaymentRequest: data rusak jadi null, data benar terbaca", () => {
    expect(parsePaymentRequest(null)).toBeNull();
    expect(parsePaymentRequest({ id: RID, months: 1 })).toBeNull();
    const r = parsePaymentRequest({ id: RID, months: 1, base_amount: 15000, unique_code: 137, amount: 15137, status: "menunggu", created_at: "2026-11-24T10:00:00Z", expires_at: "2026-11-24T11:00:00Z", temp_pro_until: null, attempts_left: 5, last_note: null });
    expect(r?.amount).toBe(15137);
    expect(r?.attemptsLeft).toBe(5);
    expect(parsePaymentRequest({ id: RID, months: 1, base_amount: 1, unique_code: 1, amount: 2, status: "aneh", created_at: "x", expires_at: "y" })).toBeNull();
  });

  it("countdown: hitung mundur dan habis", () => {
    const exp = "2026-11-24T11:00:00Z";
    expect(countdown(exp, new Date("2026-11-24T10:58:30Z"))).toEqual({ expired: false, mm: "01", ss: "30" });
    expect(countdown(exp, new Date("2026-11-24T11:00:00Z")).expired).toBe(true);
    expect(countdown("bukan tanggal").expired).toBe(true);
  });

  it("savingPct: hemat dibanding bulanan", () => {
    expect(savingPct(6, 50000, 15000)).toBe(44);
    expect(savingPct(12, 100000, 15000)).toBe(44);
    expect(savingPct(1, 15000, 15000)).toBe(0);
    expect(savingPct(6, 50000, 0)).toBe(0);
  });

  it("normalizeProofReading: tidak menebak nilai aneh", () => {
    const ok = normalizeProofReading({ is_payment_proof: true, is_success: true, amount: 15137, paid_at: "2026-11-24T19:05:00+07:00", reference: " DN123456789 ", merchant_name: "Toko X" });
    expect(ok).toMatchObject({ is_payment_proof: true, amount: 15137, reference: "DN123456789", paid_at: "2026-11-24T12:05:00.000Z" });
    const bad = normalizeProofReading({ is_payment_proof: "ya", amount: -5, paid_at: "kemarin sore", reference: "", is_success: "mungkin" });
    expect(bad).toEqual({ is_payment_proof: false, is_success: null, amount: null, paid_at: null, reference: null, merchant_name: null });
    expect(normalizeProofReading({ amount: 9_999_999_999 }).amount).toBeNull();
    expect(normalizeProofReading(null).is_payment_proof).toBe(false);
  });

  it("merchantMatches: hanya memblokir yang jelas berbeda", () => {
    expect(merchantMatches("DANA - Dompetku Official", "Dompetku")).toBe(true);
    expect(merchantMatches("Warung Budi", "Dompetku")).toBe(false);
    expect(merchantMatches(null, "Dompetku")).toBe(true);
    expect(merchantMatches("Apa saja", "")).toBe(true);
  });

  it("sniffImage: jenis dari isi file, bukan nama", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImage(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))).toBe("image/webp");
    expect(sniffImage(new Uint8Array(Buffer.from("<html><script>alert(1)</script>")))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });

  it("proofRequestSchema: jalur berkas harus bentuk yang benar", () => {
    const good = `${UID}/${RID}-abcdef123456.jpg`;
    expect(proofRequestSchema.safeParse({ requestId: RID, imagePath: good }).success).toBe(true);
    expect(proofRequestSchema.safeParse({ requestId: "bukan-uuid", imagePath: good }).success).toBe(false);
    expect(proofRequestSchema.safeParse({ requestId: RID, imagePath: `${UID}/../${UID}/x.jpg` }).success).toBe(false);
    expect(proofRequestSchema.safeParse({ requestId: RID, imagePath: `${UID}/${RID}-abcdef123456.html` }).success).toBe(false);
  });

  it("pesan galat ramah dan tidak membocorkan detail", () => {
    expect(proofReasonMessage("NOMINAL_BEDA")).toContain("Nominal");
    expect(proofReasonMessage("tidak dikenal")).toContain("belum bisa diterima");
    expect(paymentErrorMessage("MASIH_ADA_PERMINTAAN")).toContain("sedang dicek");
    expect(paymentErrorMessage("relation payment_requests does not exist")).toBe("Belum berhasil. Coba lagi sebentar.");
  });
});
