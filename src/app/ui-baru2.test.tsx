// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }), useParams: () => ({ id: "g1" }) }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));

let plan = "pro";
vi.mock("@/hooks/use-entitlement", async () => {
  const { canUse, parseEntitlement } = await import("@/lib/plans");
  return { useEntitlement: () => { const ent = parseEntitlement({ plan }); return { ent, loading: false, reload: async () => {}, can: (f: never) => canUse(ent.plan, f) }; } };
});
const rpc = vi.fn(async (_n: string) => ({ error: null }));
const signOut = vi.fn(async () => ({}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: (n: string) => rpc(n), auth: { signOut: () => signOut(), getUser: async () => ({ data: { user: { id: "u1" } } }) } }), isSupabaseConfigured: () => true }));

const created: unknown[] = []; const processed: unknown[][] = [];
let recurring: unknown[] = [];
vi.mock("@/lib/data/recurring", () => ({
  getRecurringTransactions: async () => recurring,
  createRecurringTransaction: async (x: unknown) => { created.push(x); return x; },
  deleteRecurringTransaction: vi.fn(async () => true),
  processRecurringTransaction: async (...a: unknown[]) => { processed.push(a); return {}; },
}));
vi.mock("@/lib/data/wallets", () => ({ getSpendableWallets: async () => [{ id: "w1", name: "BCA", is_archived: false }] }));
vi.mock("@/lib/data/categories", () => ({ getCategories: async () => [{ id: "c1", name: "Tagihan", type: "expense" }] }));
vi.mock("@/lib/data/payday", () => ({ getPaydaySchedules: async () => [] }));
vi.mock("@/lib/data/sample-mode", () => ({ todayJakarta: () => "2026-11-24" }));

const groupData = { group: { id: "g1", name: "Liburan", owner_id: "u1", invite_code: "ABCD2345" }, members: [{ group_id: "g1", user_id: "u1", display_name: "Aku" }, { group_id: "g1", user_id: "u2", display_name: "Budi" }], expenses: [{ id: "e1", group_id: "g1", paid_by: "u1", amount: 90000, note: "Makan", split_among: ["u1", "u2"], date: "2026-11-20", created_by: "u1" }], payments: [] };
const addExpense = vi.fn(async (_x: unknown) => {}); const addPayment = vi.fn(async (_x: unknown) => {});
vi.mock("@/lib/data/bersama", () => ({
  listGroups: async () => [], createGroup: vi.fn(async () => "g1"), joinGroup: vi.fn(async () => { throw new Error("Kode undangan tidak ditemukan. Cek lagi hurufnya."); }),
  loadGroup: async () => groupData, myUserId: async () => "u1",
  addExpense: (x: unknown) => addExpense(x), addPayment: (x: unknown) => addPayment(x), deleteExpense: vi.fn(), leaveGroup: vi.fn(), deleteGroup: vi.fn(),
}));

import KeamananPage from "./(main)/keamanan/page";
import BerulangPage from "./(main)/berulang/page";
import BersamaPage from "./(main)/bersama/page";
import GrupPage from "./(main)/bersama/[id]/page";
import PengingatPage from "./(main)/pengingat/page";

beforeEach(() => { plan = "pro"; rpc.mockClear(); signOut.mockClear(); created.length = 0; processed.length = 0; recurring = []; addExpense.mockClear(); addPayment.mockClear(); push.mockClear(); localStorage.clear(); });
afterEach(() => cleanup());

describe("Keamanan", () => {
  it("PIN: format salah dan tidak sama ditolak, benar disimpan sebagai hash", async () => {
    const u = userEvent.setup(); render(<KeamananPage />);
    await u.type(screen.getByLabelText("PIN baru"), "1234"); await u.type(screen.getByLabelText("Ulangi PIN"), "1235");
    await u.click(screen.getByRole("button", { name: "Aktifkan PIN" }));
    expect((await screen.findByRole("status")).textContent).toMatch(/belum sama/);
    expect(localStorage.getItem("dompet_pin_v1")).toBeNull();
    await u.clear(screen.getByLabelText("Ulangi PIN")); await u.type(screen.getByLabelText("Ulangi PIN"), "1234");
    await u.click(screen.getByRole("button", { name: "Aktifkan PIN" }));
    await waitFor(() => expect(localStorage.getItem("dompet_pin_v1")).toBeTruthy());
    expect(localStorage.getItem("dompet_pin_v1")).not.toContain("1234");
    expect(await screen.findByRole("button", { name: "Matikan PIN" })).toBeTruthy();
  });
  it("hapus akun: tombol nonaktif sampai mengetik HAPUS, lalu memanggil fungsi hapus", async () => {
    const u = userEvent.setup(); render(<KeamananPage />);
    const btn = screen.getByRole("button", { name: "Hapus akun saya" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await u.type(screen.getByLabelText("Ketik HAPUS"), "hapus"); expect(btn.disabled).toBe(true);
    await u.clear(screen.getByLabelText("Ketik HAPUS")); await u.type(screen.getByLabelText("Ketik HAPUS"), "HAPUS");
    expect(btn.disabled).toBe(false); await u.click(btn);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("delete_my_account"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
  it("hapus akun gagal: pesan ramah, tidak keluar", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "x" } } as never);
    const u = userEvent.setup(); render(<KeamananPage />);
    await u.type(screen.getByLabelText("Ketik HAPUS"), "HAPUS"); await u.click(screen.getByRole("button", { name: "Hapus akun saya" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/belum bisa dihapus/); expect(push).not.toHaveBeenCalled();
  });
});

describe("Transaksi Berulang", () => {
  it("kosong: pesan; tambah lengkap mengirim data benar", async () => {
    const u = userEvent.setup(); render(<BerulangPage />);
    expect(await screen.findByText(/Belum ada transaksi berulang/)).toBeTruthy();
    const add = screen.getByRole("button", { name: "Tambahkan" }) as HTMLButtonElement; expect(add.disabled).toBe(true);
    await u.type(screen.getByLabelText("Nama"), "Listrik"); await u.type(screen.getByLabelText("Nominal"), "350000");
    const day = screen.getByLabelText("Tanggal tiap bulan"); await u.clear(day); await u.type(day, "28");
    expect(add.disabled).toBe(false); await u.click(add);
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({ type: "expense", amount: 350000, wallet_id: "w1", note: "Listrik", day_of_month: 28, next_date: "2026-11-28" });
  });
  it("tanggal 0 atau 40 tidak valid", async () => {
    const u = userEvent.setup(); render(<BerulangPage />); await screen.findByText(/Belum ada/);
    await u.type(screen.getByLabelText("Nama"), "X"); await u.type(screen.getByLabelText("Nominal"), "1000");
    const day = screen.getByLabelText("Tanggal tiap bulan"); await u.clear(day); await u.type(day, "40");
    expect((screen.getByRole("button", { name: "Tambahkan" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("jatuh tempo: Catat sekarang dan Lewati memanggil proses", async () => {
    recurring = [{ id: "r1", type: "expense", amount: 100000, wallet_id: "w1", category_id: null, note: "Internet", day_of_month: 20, next_date: "2026-11-20", is_active: true }];
    const u = userEvent.setup(); render(<BerulangPage />);
    await u.click(await screen.findByRole("button", { name: "Catat sekarang" }));
    await waitFor(() => expect(processed[0]).toEqual(["r1", "record", "2026-11-24"]));
    await u.click(screen.getByRole("button", { name: "Lewati bulan ini" }));
    await waitFor(() => expect(processed[1]).toEqual(["r1", "skip", "2026-11-24"]));
  });
});

describe("Dompet Bersama", () => {
  it("daftar kosong, kode salah menampilkan pesan awam", async () => {
    const u = userEvent.setup(); render(<BersamaPage />);
    expect(await screen.findByText(/Belum ada grup/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Gabung" }) as HTMLButtonElement).disabled).toBe(true);
    await u.type(screen.getByLabelText("Kode undangan"), "salah123"); await u.type(screen.getByLabelText("Namamu di grup (gabung)"), "Aku");
    await u.click(screen.getByRole("button", { name: "Gabung" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Kode undangan tidak ditemukan/);
  });
  it("Gratis melihat gembok", () => { plan = "free"; render(<BersamaPage />); expect(screen.getByText(/Tersedia di paket Premium/)).toBeTruthy(); });
  it("detail grup: saran transfer, kode undangan, catat pengeluaran", async () => {
    const u = userEvent.setup(); render(<GrupPage />);
    expect(await screen.findByText("Liburan")).toBeTruthy();
    expect(screen.getByText(/ABCD2345/)).toBeTruthy();
    expect(screen.getAllByText(/Rp45\.000/).length).toBeGreaterThan(0);
    await u.type(screen.getByLabelText("Untuk apa"), "Bensin"); await u.type(screen.getByLabelText("Jumlah pengeluaran"), "60000");
    await u.click(screen.getByRole("button", { name: "Simpan pengeluaran" }));
    await waitFor(() => expect(addExpense).toHaveBeenCalledWith(expect.objectContaining({ group_id: "g1", paid_by: "u1", amount: 60000, note: "Bensin", split_among: ["u1", "u2"] })));
  });
  it("tombol Simpan pengeluaran nonaktif bila kosong", async () => { render(<GrupPage />); expect((await screen.findByRole("button", { name: "Simpan pengeluaran" }) as HTMLButtonElement).disabled).toBe(true); });
});

describe("Pengingat", () => {
  it("kosong: ada arahan ke Transaksi Berulang", async () => {
    render(<PengingatPage />); expect(await screen.findByText(/Tidak ada tagihan atau gajian/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Transaksi Berulang" }).getAttribute("href")).toBe("/berulang");
  });
});
