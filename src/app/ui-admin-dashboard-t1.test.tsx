// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({
  TopHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/data/invest", () => ({ getSnapshots: async () => [] }));

let currentRole: "admin" | "superadmin" | null = "superadmin";
const mockSummary = {
  total_users: 150,
  new_users_today: 12,
  active_users_today: 45,
  active_users_30d: 95,
  cash_in_period: 450000,
  cash_in_month: 450000,
  ai_cost_period: 35000,
  ai_cost_month: 35000,
  pending_payments: 2,
  oldest_pending_minutes: 25,
  budget_idr: 100000,
  warn_pct: 70,
  budget_used_pct: 35,
  period_from: "2026-11-01T00:00:00Z",
  period_to: "2026-11-25T00:00:00Z",
};

const mockPrices = [
  { months: 1, amount: 15000 },
  { months: 6, amount: 50000 },
  { months: 12, amount: 99000 },
];

const mockAiControls = {
  controls: {
    master_kill_switch: false,
    basic_ai_disabled_at_100pct: true,
    pro_hard_limit_enabled: false,
    feature_toggles: {
      struk: true,
      suara: true,
      konsultasi: true,
      insight: true,
      rencana: true,
      impor: true,
      tabungan: true,
    },
  },
  usd_idr_rate: 16000,
};

const mockPayments = [
  {
    id: "pay-1",
    user_id: "user-1",
    email: "budi@example.test",
    months: 1,
    amount: 15123,
    status: "pro_sementara",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(), // 25 menit lalu
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    proof_path: "proof1.jpg",
    proof_ref: "REF123456",
    proof_paid_at: new Date(Date.now() - 20 * 60000).toISOString(),
    temp_pro_until: new Date(Date.now() + 86400000).toISOString(),
    attempts: 1,
    last_note: null,
    confirmed_at: null,
  },
  {
    id: "pay-2",
    user_id: "user-2",
    email: "ani@example.test",
    months: 6,
    amount: 50456,
    status: "menunggu_cek",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 menit lalu
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    proof_path: "proof2.jpg",
    proof_ref: "REF654321",
    proof_paid_at: new Date(Date.now() - 4 * 60000).toISOString(),
    temp_pro_until: null,
    attempts: 1,
    last_note: null,
    confirmed_at: null,
  },
];

const setPriceMock = vi.fn(async () => {});
const setAiControlsMock = vi.fn(async () => {});
const setPlanMock = vi.fn(async () => {});
const confirmPaymentMock = vi.fn(async () => {});
const rejectPaymentMock = vi.fn(async () => {});

vi.mock("@/lib/data/admin", async () => {
  const real = await vi.importActual<typeof import("@/lib/data/admin")>("@/lib/data/admin");
  return {
    ...real,
    getMyAdminRole: async () => currentRole,
    getMfaStatus: async () => ({ role: currentRole, require_mfa: false, aal: "aal1" }),
    getDashboardSummary: async () => mockSummary,
    listPrices: async () => mockPrices,
    setPrice: (...a: unknown[]) => (setPriceMock as any)(...a),
    getAiControls: async () => mockAiControls,
    setAiControls: (...a: unknown[]) => (setAiControlsMock as any)(...a),
    listUsers: async () => [
      {
        user_id: "u1",
        email: "user1@example.test",
        created_at: "2026-11-01T00:00:00Z",
        last_sign_in_at: null,
        admin_role: null,
        plan: "free",
        source: "free",
        plan_expires_at: null,
        trial_ends_at: null,
        ai_used: 5,
      },
    ],
    setPlan: (...a: unknown[]) => (setPlanMock as any)(...a),
    getApiUsage: async () => ({
      configured: true,
      budget_idr: 100000,
      since: "2026-11-01",
      warn_pct: 70,
      spent_idr: 35000,
      remaining_idr: 65000,
      used_pct: 35,
      level: "aman",
      days_left: 20,
      avg_daily_idr: 1500,
      month_spent_idr: 35000,
      today_spent_idr: 500,
      calls_month: 25,
      by_feature: [],
      daily: [],
    }),
  };
});

vi.mock("@/lib/data/payment", () => ({
  listPayments: async () => mockPayments,
  confirmPayment: (...a: unknown[]) => (confirmPaymentMock as any)(...a),
  rejectPayment: (...a: unknown[]) => (rejectPaymentMock as any)(...a),
  proofUrl: async () => "https://example.com/fake-proof.jpg",
}));

import AdminPage from "./(main)/admin/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  currentRole = "superadmin";
});

describe("Dashboard Admin Tahap 1 - Full Acceptance Test", () => {
  it("Ringkasan Tab: Menampilkan metrik agregat lengkap dan kartu antrean perhatian", async () => {
    render(<AdminPage />);
    expect(await screen.findByText("Total pengguna terdaftar")).toBeTruthy();
    expect(screen.getByText("150")).toBeTruthy(); // total users
    expect(screen.getByText("+12")).toBeTruthy(); // new users today
    expect(screen.getByText("45")).toBeTruthy(); // active today
    expect(screen.getByText("95")).toBeTruthy(); // active 30d
    expect(screen.getByText(/35%/)).toBeTruthy(); // budget used pct

    // Notifikasi antrean perhatian
    expect(screen.getByText(/2 pembayaran perlu verifikasi Owner/)).toBeTruthy();
    expect(screen.getByText(/25 menit/)).toBeTruthy();
  });

  it("Bayar Tab: Antrean diurutkan dari yang tertua (25 menit dulu baru 5 menit) dan dialog konfirmasi", async () => {
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Bayar/i }));

    expect(await screen.findByText("budi@example.test")).toBeTruthy();
    expect(screen.getByText("ani@example.test")).toBeTruthy();
    expect(screen.getByText(/perlu segera dicek/i)).toBeTruthy();

    const confirmButtons = screen.getAllByRole("button", { name: "Konfirmasi..." });
    await u.click(confirmButtons[0]);

    const alertDialog = await screen.findByRole("alertdialog");
    expect(alertDialog).toBeTruthy();
    const modalConfirmBtn = within(alertDialog).getByRole("button", { name: "Konfirmasi Lunas" });
    await u.click(modalConfirmBtn);

    expect(confirmPaymentMock).toHaveBeenCalledWith("pay-1");
  });

  it("Bayar Tab: Tolak pembayaran membuka modal yang mewajibkan alasan", async () => {
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Bayar/i }));

    const rejectButtons = await screen.findAllByRole("button", { name: "Tolak..." });
    await u.click(rejectButtons[0]);

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("heading", { name: "Tolak Pembayaran" })).toBeTruthy();

    const submitRejectBtn = within(modal).getByRole("button", { name: "Ya, Tolak Pembayaran" });
    await u.click(submitRejectBtn);

    expect(rejectPaymentMock).toHaveBeenCalledWith("pay-1", "Tidak ditemukan di mutasi merchant");
  });

  it("Pengaturan Tab: Superadmin bisa ubah harga paket dengan dialog konfirmasi", async () => {
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Pengaturan/i }));

    expect(await screen.findByText("Harga Paket Pro")).toBeTruthy();
    expect(screen.getByText("Paket 1 Bulan")).toBeTruthy();
    expect(screen.getByText("Paket 6 Bulan")).toBeTruthy();
    expect(screen.getByText("Paket 12 Bulan")).toBeTruthy();

    const editButtons = screen.getAllByRole("button", { name: "Ubah Harga" });
    await u.click(editButtons[0]);

    const input = screen.getByLabelText("Nominal harga baru");
    fireEvent.change(input, { target: { value: "18000" } });

    await u.click(screen.getByRole("button", { name: "Simpan Harga" }));

    const alertDialog = await screen.findByRole("alertdialog");
    expect(alertDialog).toBeTruthy();
    const confirmBtn = within(alertDialog).getByRole("button", { name: "Ya, Ubah Harga" });
    await u.click(confirmBtn);

    expect(setPriceMock).toHaveBeenCalledWith(1, 18000);
  });

  it("Pengaturan Tab: Master kill switch meminta ketik 'NONAKTIFKAN'", async () => {
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Pengaturan/i }));

    const killBtn = await screen.findByRole("button", { name: "Matikan AI..." });
    await u.click(killBtn);

    expect(await screen.findByText(/Peringatan: Matikan Seluruh Layanan AI/i)).toBeTruthy();
    const confirmBtn = screen.getByRole("button", { name: "Matikan AI Sekarang" }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const input = screen.getByPlaceholderText("Ketik NONAKTIFKAN");
    await u.type(input, "salah");
    expect(confirmBtn.disabled).toBe(true);

    await u.clear(input);
    await u.type(input, "NONAKTIFKAN");
    expect(confirmBtn.disabled).toBe(false);

    await u.click(confirmBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Peringatan: Matikan Seluruh Layanan AI/i)).toBeNull();
    });
  });

  it("Pengguna Tab: Ubah paket manual mewajibkan alasan minimal 5 karakter", async () => {
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Pengguna/i }));

    expect(await screen.findByText("user1@example.test")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Detail user1@example.test" }));

    expect(await screen.findByText("Ubah Paket Pengguna")).toBeTruthy();
    const saveBtn = screen.getByRole("button", { name: "Simpan Paket" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    const reasonInput = screen.getByLabelText("Alasan perubahan paket");
    await u.type(reasonInput, "abc");
    expect(saveBtn.disabled).toBe(true);

    await u.type(reasonInput, " Kompensasi gangguan");
    expect(saveBtn.disabled).toBe(false);

    await u.click(saveBtn);
    const alertDialog = await screen.findByRole("alertdialog");
    expect(alertDialog).toBeTruthy();
    const confirmBtn = within(alertDialog).getByRole("button", { name: "Ya, Simpan Paket" });
    await u.click(confirmBtn);

    expect(setPlanMock).toHaveBeenCalledWith("u1", "pro", 30, "abc Kompensasi gangguan");
  });

  it("Admin biasa (bukan superadmin) tidak bisa mengubah harga atau saklar AI", async () => {
    currentRole = "admin";
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: /Pengaturan/i }));

    expect(await screen.findByText("Harga Paket Pro")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ubah Harga" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Matikan AI..." })).toBeNull();
  });
});
