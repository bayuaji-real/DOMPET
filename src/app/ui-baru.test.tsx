// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseEntitlement } from "@/lib/plans";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

let entRaw: Record<string, unknown> = { plan: "pro", source: "paid", ai_limit: 1000, ai_used: 0 };
vi.mock("@/hooks/use-entitlement", async () => {
  const { canUse, parseEntitlement: pe } = await import("@/lib/plans");
  return { useEntitlement: () => { const ent = pe(entRaw); return { ent, loading: false, reload: async () => {}, can: (f: never) => canUse(ent.plan, f) }; } };
});
const startTrial = vi.fn<(plan: string) => Promise<unknown>>();
vi.mock("@/lib/data/entitlement", () => ({ requestSubscription: async () => true, startTrial: (p: string) => startTrial(p), getEntitlement: async () => parseEntitlement(entRaw) }));

const snap = { monthlyIncome: 10_000_000, monthlyExpense: 6_000_000, liquidSavings: 30_000_000, fixedBills: 0, budgets: [{ name: "Makan", limit: 1_000_000, spent: 1_200_000 }], txs: [], categoryNames: {}, today: "2026-11-24", hasData: true };
vi.mock("@/lib/data/finance-snapshot", () => ({ getFinanceSnapshot: async () => snap }));
vi.mock("@/lib/data/debts", () => ({ getDebts: async () => [], addDebt: vi.fn(), deleteDebt: vi.fn() }));
const holdings: unknown[] = [];
const addHolding = vi.fn(async (_h: unknown) => {});
vi.mock("@/lib/data/invest", () => ({ getHoldings: async () => holdings, addHolding: (h: unknown) => addHolding(h), updateHoldingPrice: vi.fn(), deleteHolding: vi.fn(), getSnapshots: async () => [
  { id: "1", name: "Dana A", category: "pasar_uang", risk: "rendah", ret_1m: 0.4, ret_ytd: null, ret_1y: 4.4, aum: 1, as_of: "2026-11-13", source_url: "https://x.test" },
  { id: "2", name: "Dana B", category: "pasar_uang", risk: "rendah", ret_1m: 0.5, ret_ytd: null, ret_1y: 5.1, aum: 1, as_of: "2026-11-13", source_url: "https://x.test" },
] }));
const createTransactions = vi.fn(async (_rows: unknown) => []);
vi.mock("@/lib/data/transactions", () => ({ createTransactions: (r: unknown) => createTransactions(r), getTransactions: async () => [] }));
vi.mock("@/lib/data/wallets", () => ({ getSpendableWallets: async () => [{ id: "w1", name: "BCA", is_archived: false }] }));
vi.mock("@/lib/data/categories", () => ({ getCategories: async () => [] }));

import InvestasiPage from "./(main)/investasi/page";
import PaketPage from "./(main)/paket/page";
import KesehatanPage from "./(main)/kesehatan-finansial/page";
import PrediksiPage from "./(main)/prediksi-cashflow/page";
import CicilanUtangPage from "./(main)/cicilan-utang/page";
import ImporPage from "./(main)/impor/page";
import ThrZakatPage from "./(main)/thr-zakat/page";

beforeEach(() => { entRaw = { plan: "pro", source: "paid", ai_limit: 1000, ai_used: 0 }; startTrial.mockReset(); createTransactions.mockClear(); addHolding.mockClear(); });
afterEach(() => cleanup());

describe("Investasi: kalkulator", () => {
  it("menampilkan tabel per tahun lalu per bulan", async () => {
    const u = userEvent.setup(); render(<InvestasiPage />);
    expect(screen.getByText("Perkiraan nilai akhir")).toBeTruthy();
    const rowsYear = screen.getAllByRole("row").length;
    expect(rowsYear).toBe(1 + 5);
    await u.click(screen.getByRole("button", { name: "Per bulan" }));
    expect(screen.getAllByRole("row").length).toBe(1 + 60);
  });
  it("lama 0 tahun: pesan ramah, bukan tabel kosong", async () => {
    const u = userEvent.setup(); render(<InvestasiPage />);
    const yrs = screen.getByLabelText("Lama tahun"); await u.clear(yrs); await u.type(yrs, "0");
    expect(screen.getByText(/minimal 1 tahun/)).toBeTruthy();
  });
  it("disclaimer investasi selalu terlihat", () => { render(<InvestasiPage />); expect(screen.getByRole("note").textContent).toMatch(/tidak menjamin/); });
  it("Info Pasar: peringkat return terbesar di atas + sumber", async () => {
    const u = userEvent.setup(); render(<InvestasiPage />);
    await u.click(screen.getByRole("tab", { name: "Info Pasar" }));
    const items = await screen.findAllByRole("listitem");
    expect(items[0].textContent).toContain("Dana B");
    expect(screen.getByText(/Sumber resmi sesuai tautan/)).toBeTruthy();
  });
  it("paket Gratis melihat gembok di Portofolio dan Info Pasar, kalkulator tetap terbuka", async () => {
    entRaw = { plan: "free" }; const u = userEvent.setup(); render(<InvestasiPage />);
    expect(screen.getByText("Perkiraan nilai akhir")).toBeTruthy();
    await u.click(screen.getByRole("tab", { name: "Portofolio" }));
    expect(screen.getByText(/Tersedia di paket Pro/)).toBeTruthy();
    await u.click(screen.getByRole("tab", { name: "Info Pasar" }));
    expect(screen.getByText(/Tersedia di paket Pro/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Lihat paket/ }).getAttribute("href")).toBe("/paket");
  });
  it("Portofolio: tombol simpan nonaktif sampai formulir lengkap", async () => {
    const u = userEvent.setup(); render(<InvestasiPage />);
    await u.click(screen.getByRole("tab", { name: "Portofolio" }));
    const save = await screen.findByRole("button", { name: "Simpan aset" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await u.type(screen.getByLabelText("Nama aset"), "BBCA");
    await u.type(screen.getByLabelText("Jumlah unit"), "10");
    await u.type(screen.getByLabelText("Harga beli rata-rata"), "9000");
    expect((save as HTMLButtonElement).disabled).toBe(false);
    await u.click(save);
    await waitFor(() => expect(addHolding).toHaveBeenCalledWith(expect.objectContaining({ name: "BBCA", units: 10, avg_price: 9000, last_price: null })));
  });
});

describe("Paket", () => {
  it("Gratis dengan uji coba tersedia: tombol coba gratis memanggil startTrial", async () => {
    entRaw = { plan: "free", source: "free", trial_available: { premium: false, pro: true } }; startTrial.mockResolvedValue({ ok: true });
    const u = userEvent.setup(); render(<PaketPage />);
    const btns = screen.getAllByRole("button", { name: /Coba gratis 7 hari/ }); expect(btns.length).toBe(1);
    await u.click(btns[0]);
    await waitFor(() => expect(startTrial).toHaveBeenCalledWith("pro"));
    expect(await screen.findByRole("status")).toBeTruthy();
  });
  it("galat dari server ditampilkan dengan bahasa awam", async () => {
    entRaw = { plan: "free", source: "free", trial_available: { premium: false, pro: true } }; startTrial.mockResolvedValue({ ok: false, message: "Uji coba paket ini sudah pernah kamu pakai." });
    const u = userEvent.setup(); render(<PaketPage />);
    await u.click(screen.getAllByRole("button", { name: /Coba gratis/ })[0]);
    expect((await screen.findByRole("status")).textContent).toMatch(/sudah pernah/);
  });
  it("uji coba sudah dipakai: tidak ada tombol, ada penjelasan", () => {
    entRaw = { plan: "free", source: "free", trial_available: { premium: false, pro: false } }; render(<PaketPage />);
    expect(screen.queryAllByRole("button", { name: /Coba gratis/ }).length).toBe(0);
    expect(screen.getAllByText(/sudah kamu pakai/).length).toBe(1);
  });
  it("sedang uji coba: menampilkan sisa hari dan kuota", () => {
    entRaw = { plan: "pro", source: "trial", trial_ends_at: new Date(Date.now() + 3 * 86_400_000).toISOString(), ai_limit: 100, ai_used: 40, trial_available: { premium: false, pro: false } };
    render(<PaketPage />);
    expect(screen.getByTestId("paket-aktif").textContent).toMatch(/Pro \(uji coba, sisa 3 hari\)/);
    expect(screen.getByText(/60 dari 100/)).toBeTruthy();
  });
});

describe("Kesehatan Finansial dan Prediksi", () => {
  it("skor kesehatan tampil di rentang 0-100 dengan 4 bagian", async () => {
    render(<KesehatanPage />);
    const n = Number((await screen.findByTestId("skor-total")).textContent); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(100);
    expect(screen.getAllByRole("progressbar").length).toBe(4);
  });
  it("proyeksi 3 bulan", async () => {
    render(<PrediksiPage />);
    expect(await screen.findByText(/tetap positif/)).toBeTruthy();
    expect(screen.getAllByText(/Bulan ke-/).length).toBe(3);
  });
});

describe("Cicilan & Utang", () => {
  it("simulator cicilan menghitung dan membandingkan", async () => {
    render(<CicilanUtangPage />);
    expect(await screen.findByText("Cicilan bunga flat")).toBeTruthy();
    expect(screen.getByText("Paylater")).toBeTruthy();
    expect(screen.getAllByText(/Setara bunga sekitar/).length).toBe(2);
  });
  it("Basic: Simulator cicilan terkunci (Pro), tab Utang terbuka", async () => {
    entRaw = { plan: "free", source: "free", ai_limit: 0, ai_used: 0 }; const u = userEvent.setup(); render(<CicilanUtangPage />);
    expect(await screen.findByText(/paket Pro/)).toBeTruthy();
    await u.click(screen.getByRole("tab", { name: "Utang" })); expect(screen.queryByText(/Tersedia di paket Pro/)).toBeNull();
  });
  it("Utang kosong: ada pesan dan form", async () => {
    const u = userEvent.setup(); render(<CicilanUtangPage />);
    await u.click(screen.getByRole("tab", { name: "Utang" }));
    expect(await screen.findByText(/Belum ada utang tercatat/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Tambah utang" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Impor mutasi", () => {
  it("tempel CSV, tinjau, lalu catat hanya yang dicentang", async () => {
    const u = userEvent.setup(); render(<ImporPage />);
    const ta = await screen.findByLabelText("Isi CSV");
    await u.click(ta); await u.paste("Tanggal,Keterangan,Jumlah\n24/11/2026,Kopi,-25.000\n25/11/2026,Gaji,5.000.000\nrusak,x,y");
    await u.click(screen.getByRole("button", { name: "Baca mutasi" }));
    expect(await screen.findByText(/2 baris terbaca, 1 baris dilewati/)).toBeTruthy();
    await u.click(screen.getByRole("checkbox", { name: /Catat Kopi/ }));
    await u.click(screen.getByRole("button", { name: "Catat 1 transaksi" }));
    await waitFor(() => expect(createTransactions).toHaveBeenCalledTimes(1));
    const arg = createTransactions.mock.calls[0][0] as { amount: number; type: string; date: string }[];
    expect(arg).toHaveLength(1); expect(arg[0]).toMatchObject({ amount: 5_000_000, type: "income", date: "2026-11-25" });
    expect(await screen.findByText(/1 transaksi berhasil dicatat/)).toBeTruthy();
  });
  it("CSV tidak dikenal: pesan jelas, tidak ada yang disimpan", async () => {
    const u = userEvent.setup(); render(<ImporPage />);
    await u.click(await screen.findByLabelText("Isi CSV")); await u.paste("a,b\n1,2");
    await u.click(screen.getByRole("button", { name: "Baca mutasi" }));
    expect(await screen.findByText(/Tidak ada baris yang bisa dibaca/)).toBeTruthy(); expect(createTransactions).not.toHaveBeenCalled();
  });
  it("tombol Baca nonaktif saat kosong", async () => { render(<ImporPage />); expect((await screen.findByRole("button", { name: "Baca mutasi" }) as HTMLButtonElement).disabled).toBe(true); });
});

describe("THR & Zakat", () => {
  it("tanpa harga emas: diminta mengisi, tidak menebak", () => { render(<ThrZakatPage />); expect(screen.getByText(/Isi harga emas dulu/)).toBeTruthy(); });
  it("dengan harga emas dan penghasilan: zakat 2,5%", async () => {
    const u = userEvent.setup(); render(<ThrZakatPage />);
    await u.type(screen.getByLabelText("Harga emas per gram"), "1200000");
    await u.type(screen.getByLabelText("Penghasilan per bulan"), "10000000");
    expect(screen.getByText(/Rp250\.000 per bulan/)).toBeTruthy();
  });
  it("THR dibagi dan totalnya sama", async () => {
    const u = userEvent.setup(); render(<ThrZakatPage />);
    await u.type(screen.getByLabelText("Jumlah THR"), "1000000");
    const sec = screen.getByRole("region", { name: "Mode THR" });
    expect(within(sec).getByText("Rp25.000")).toBeTruthy();
  });
  it("THR terkunci di Gratis, zakat tetap terbuka", () => { entRaw = { plan: "free" }; render(<ThrZakatPage />); expect(screen.getByText("Kalkulator zakat")).toBeTruthy(); expect(screen.getByText(/Tersedia di paket Pro/)).toBeTruthy(); });
});
