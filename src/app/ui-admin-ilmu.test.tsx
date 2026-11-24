// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));
vi.mock("@/lib/data/finance-snapshot", () => ({ getFinanceSnapshot: async () => ({ monthlyExpense: 4_000_000 }) }));
vi.mock("@/lib/data/goals", () => ({ getSavingsGoals: async () => [{ id: "g", name: "Dana Darurat", is_emergency_fund: true, status: "aktif", saved: 5_000_000 }] }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/data/invest", () => ({ getSnapshots: async () => [] }));

let role: "admin" | "superadmin" | null = "superadmin";
let usage: Record<string, unknown> = {};
const setApiBudget = vi.fn(async () => {});
vi.mock("@/lib/data/admin", async () => {
  const real = await vi.importActual<typeof import("@/lib/data/admin")>("@/lib/data/admin");
  return {
    ...real,
    getMyAdminRole: async () => role,
    getApiUsage: async () => usage,
    setApiBudget: (...a: unknown[]) => (setApiBudget as unknown as (...x: unknown[]) => Promise<void>)(...a),
    listUsers: async () => [{ user_id: "u1", email: "intan@example.test", created_at: "2026-11-01T00:00:00Z", last_sign_in_at: null, admin_role: null, plan: "pro", source: "paid", plan_expires_at: null, trial_ends_at: null, ai_used: 3 }],
  };
});
import AdminPage from "./(main)/admin/page";
import IlmuPage from "./(main)/ilmu-keuangan/page";

const baseUsage = { configured: true, budget_idr: 100000, since: "2026-11-01", warn_pct: 70, spent_idr: 95000, remaining_idr: 5000, used_pct: 95, level: "kritis", days_left: 2, avg_daily_idr: 2500, month_spent_idr: 95000, today_spent_idr: 100, calls_month: 40, by_feature: [{ feature: "konsultasi", calls: 30, cost_idr: 80000 }], daily: [{ day: "2026-11-23", calls: 5, cost_idr: 2500 }] };
afterEach(() => { cleanup(); vi.clearAllMocks(); role = "superadmin"; usage = baseUsage; });

describe("Admin UI", () => {
  it("bukan admin ditolak", async () => {
    role = null; usage = baseUsage;
    render(<AdminPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/hanya untuk admin/i);
    expect(screen.queryByRole("tablist")).toBeNull();
  });
  it("saldo hampir habis tampil sebagai peringatan dan superadmin bisa mencatat top-up", async () => {
    usage = baseUsage;
    const u = userEvent.setup();
    render(<AdminPage />);
    const al = await screen.findByRole("alert");
    expect(al.textContent).toMatch(/hampir habis/i);
    await u.type(screen.getByLabelText("Nilai top-up"), "500000");
    await u.click(screen.getByRole("button", { name: "Simpan" }));
    expect(setApiBudget).toHaveBeenCalled();
    expect((setApiBudget.mock.calls[0] as unknown[])[0]).toBe(500000);
  });
  it("admin biasa tidak melihat form top-up", async () => {
    role = "admin"; usage = baseUsage;
    render(<AdminPage />);
    await screen.findByRole("alert");
    expect(screen.queryByLabelText("Nilai top-up")).toBeNull();
    expect(screen.getByText(/Hanya Superadmin/)).toBeTruthy();
  });
  it("tab pengguna menampilkan email dan paket", async () => {
    usage = baseUsage;
    const u = userEvent.setup();
    render(<AdminPage />);
    await u.click(await screen.findByRole("tab", { name: "Pengguna" }));
    expect(await screen.findByText(/intan@example.test/)).toBeTruthy();
    expect(screen.getByLabelText("Peran intan@example.test")).toBeTruthy();
  });
});

describe("Ilmu Keuangan UI", () => {
  it("50/30/20 dari 10 juta", async () => {
    const u = userEvent.setup();
    render(<IlmuPage />);
    await u.type(screen.getByLabelText("Pemasukan bulanan"), "10000000");
    expect(screen.getByText(/5\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/3\.000\.000/)).toBeTruthy();
  });
  it("pensiun menampilkan setoran per bulan dan menolak usia pensiun salah", async () => {
    const u = userEvent.setup();
    render(<IlmuPage />);
    await u.click(screen.getByRole("tab", { name: "Pensiun" }));
    expect(screen.getByText("Perlu disisihkan per bulan")).toBeTruthy();
    const ret = screen.getByLabelText("Usia pensiun");
    await u.clear(ret); await u.type(ret, "20");
    expect((await screen.findByRole("alert")).textContent).toMatch(/lebih besar/);
  });
  it("dana darurat terisi otomatis dari data dompet dan target Tabungan", async () => {
    const u = userEvent.setup();
    render(<IlmuPage />);
    await u.click(screen.getByRole("tab", { name: "Darurat" }));
    await u.click(await screen.findByRole("button", { name: /Pakai data dompetku/ }));
    expect(screen.getByText(/12\.000\.000/)).toBeTruthy(); // minimum 3 bulan x 4 juta
    expect(screen.getByText(/7\.000\.000/)).toBeTruthy(); // kurang ke minimum
  });
});
