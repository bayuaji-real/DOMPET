// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [async () => true, null] }));
vi.mock("@/lib/data/finance-snapshot", () => ({ getFinanceSnapshot: async () => ({ monthlyIncome: 6_000_000, monthlyExpense: 3_500_000, monthlyExpenseX: 0, today: "2026-11-24", hasData: true }) }));
vi.mock("@/lib/data/goals", () => ({ getSavingsGoals: async () => [] }));

const purchases = [{ id: "p1", user_id: "u", name: "Laptop kerja", price: 12_000_000, down_payment: 0, saved: 0, mode: "tunai", months: null, rate_pct: null, target_date: "2027-05-24", note: null, status: "aktif" }];
const addPurchase = vi.fn(async () => {});
vi.mock("@/lib/data/purchase", () => ({
  getPurchases: async () => purchases, addPurchase: (...a: unknown[]) => (addPurchase as unknown as (...x: unknown[]) => Promise<void>)(...a),
  updatePurchase: async () => {}, deletePurchase: async () => {},
}));
vi.mock("@/lib/data/admin", async () => {
  const real = await vi.importActual<typeof import("@/lib/data/admin")>("@/lib/data/admin");
  return { ...real, getBenchmarks: async () => [
    { code: "bi_rate", name: "Suku bunga acuan BI (BI-Rate)", value: 6, unit: "persen", as_of: "2026-11-18", source_name: "Bank Indonesia", source_url: "https://www.bi.go.id/x", note: null },
    { code: "ihsg_lama", name: "IHSG", value: 5439, unit: "poin", as_of: "2026-08-01", source_name: "BEI", source_url: "https://www.idx.co.id/", note: null },
  ] };
});
const listFactors = vi.fn(async () => ({ data: { totp: [] as unknown[], all: [] as unknown[] }, error: null }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { mfa: { listFactors: () => listFactors(), enroll: async () => ({ data: { id: "f1", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "ABCDEF" } }, error: null }), unenroll: async () => ({ error: null }) } } }) }));

import TargetBeliPage from "./(main)/target-beli/page";
import { AcuanSection } from "@/components/market/acuan-section";
import { MfaCard } from "@/components/security/mfa";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Target Beli (obrolan)", () => {
  it("menyapa singkat dan menampilkan daftar target dengan penilaian", async () => {
    const u = userEvent.setup();
    render(<TargetBeliPage />);
    expect(screen.getByText(/Mau beli apa/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Target saya" }));
    expect(await screen.findByText("Laptop kerja")).toBeTruthy();
    expect(screen.getAllByText(/Aman|Pas-pasan|Berat/).length).toBeGreaterThan(0);
  });
  it("kalimat tunai disimpan dengan harga dan dijawab singkat", async () => {
    const u = userEvent.setup();
    render(<TargetBeliPage />);
    await u.type(screen.getByLabelText("Pesan Target Beli"), "Kulkas 4jt tunai");
    await u.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(addPurchase).toHaveBeenCalled());
    const arg = (addPurchase.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(arg.name).toBe("Kulkas"); expect(arg.price).toBe(4000000); expect(arg.mode).toBe("tunai");
    expect(await screen.findByText(/Rp\s?4\.000\.000, tunai/)).toBeTruthy();
  });
  it("kalimat cicilan membaca DP dan lama cicilan", async () => {
    const u = userEvent.setup();
    render(<TargetBeliPage />);
    await u.type(screen.getByLabelText("Pesan Target Beli"), "Motor 25jt cicilan 24 bulan dp 5jt");
    await u.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(addPurchase).toHaveBeenCalled());
    const arg = (addPurchase.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(arg).toMatchObject({ name: "Motor", price: 25000000, mode: "cicilan", months: 24, down_payment: 5000000 });
  });
  it("tanpa harga bertanya dulu dan tidak menyimpan", async () => {
    const u = userEvent.setup();
    render(<TargetBeliPage />);
    await u.type(screen.getByLabelText("Pesan Target Beli"), "mau beli sepeda");
    await u.click(screen.getByRole("button", { name: "Kirim" }));
    expect(await screen.findByText(/harganya berapa/)).toBeTruthy();
    expect(addPurchase).not.toHaveBeenCalled();
  });
});

describe("Acuan pasar", () => {
  it("menampilkan angka, tanggal, sumber, dan menandai angka lama", async () => {
    render(<AcuanSection />);
    expect(await screen.findByText("6%")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Sumber:/ }).length).toBe(2);
    expect(screen.getAllByText(/sudah lama/i).length).toBe(1);
  });
});

describe("MFA", () => {
  it("belum aktif: tombol daftar, lalu menampilkan QR dan kolom kode", async () => {
    const u = userEvent.setup();
    render(<MfaCard />);
    await u.click(await screen.findByRole("button", { name: "Daftarkan MFA" }));
    expect(await screen.findByAltText(/Kode QR/)).toBeTruthy();
    expect(screen.getByLabelText("Kode 6 angka dari aplikasi")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Aktifkan" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("sudah aktif: menampilkan status dan tombol matikan", async () => {
    listFactors.mockResolvedValueOnce({ data: { totp: [{ id: "f9", friendly_name: "Dompetku abc", status: "verified" }], all: [] }, error: null });
    render(<MfaCard />);
    expect(await screen.findByText(/MFA aktif/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Matikan" })).toBeTruthy();
  });
});
