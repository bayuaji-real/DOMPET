// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/data/goals", () => ({ getSavingsGoals: async () => [{ id: "g1", name: "Dana Nikah", target_amount: 20_000_000, saved: 4_000_000, percent: 20 }] }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));
vi.mock("@/lib/data/sample-mode", () => ({ todayJakarta: () => "2026-11-24" }));

const ev = { id: "e1", user_id: "u", title: "Nikah Uji", event_type: "nikah", event_date: "2027-02-20", total_budget: 50_000_000, partner_a: null, partner_b: null, goal_id: null };
let events: unknown[] = [];
let items: unknown[] = []; let payments: unknown[] = [];
const createEvent = vi.fn(async () => { events = [ev]; return ev; });
const addItem = vi.fn(async (x: Record<string, unknown>) => { items = [{ id: "i1", ...x }]; });
const addPayment = vi.fn(async (x: unknown) => { payments = [{ id: "p1", paid_at: "2026-11-24", note: null, item_id: "i1", ...(x as object) }]; });
const updateItem = vi.fn(async () => {});
vi.mock("@/lib/data/planner", () => ({
  getEvents: async () => events, createEvent: () => createEvent(),
  getPlannerData: async () => ({ items, payments, guests: [], todos: [] }),
  addItem: (x: Record<string, unknown>) => addItem(x), addPayment: (x: unknown) => addPayment(x), updateItem: () => updateItem(),
  addItems: vi.fn(), createInvite: vi.fn(async () => "ABCD2345"), resetInvite: vi.fn(), joinPlanner: vi.fn(), shareErrorText: () => "x", updateEvent: vi.fn(), deleteEvent: vi.fn(), deleteItem: vi.fn(), deletePayment: vi.fn(),
  addGuest: vi.fn(), updateGuest: vi.fn(), deleteGuest: vi.fn(), addTodo: vi.fn(), addTodos: vi.fn(), updateTodo: vi.fn(), deleteTodo: vi.fn(),
}));
import PlannerPage from "./(main)/planner/page";

afterEach(() => { cleanup(); events = []; items = []; payments = []; vi.clearAllMocks(); });

describe("Planner UI", () => {
  it("tombol buat planner mati sampai nama diisi, lalu membuat acara", async () => {
    const u = userEvent.setup();
    render(<PlannerPage />);
    const btn = await screen.findByRole("button", { name: /Buat planner/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    await u.type(screen.getByLabelText("Nama acara"), "Nikah Uji");
    await u.click(btn);
    await waitFor(() => expect(createEvent).toHaveBeenCalled());
    expect(await screen.findByText("Nikah Uji")).toBeTruthy();
    expect(screen.getByText(/hari lagi/)).toBeTruthy();
  });
  it("tambah vendor lalu catat pembayaran penuh menandai lunas", async () => {
    events = [ev];
    const u = userEvent.setup();
    render(<PlannerPage />);
    await u.click(await screen.findByRole("tab", { name: "Vendor" }));
    await u.click(screen.getByRole("button", { name: /Tambah/ }));
    await u.type(screen.getByLabelText("Nama vendor"), "Katering");
    await u.type(screen.getByLabelText("Harga"), "10000000");
    await u.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(addItem).toHaveBeenCalled());
    expect(addItem.mock.calls[0][0]).toMatchObject({ name: "Katering", planned_cost: 10_000_000, status: "tinjau", kind: "vendor" });
    expect(await screen.findByText("Katering")).toBeTruthy();
    await u.click(screen.getByRole("tab", { name: "Bayar" }));
    await u.click(screen.getByLabelText("Untuk item"));
    await u.click(await screen.findByRole("option", { name: /Katering/ }));
    await u.type(screen.getByLabelText("Jumlah dibayar"), "10000000");
    await u.click(screen.getByRole("button", { name: "Simpan pembayaran" }));
    await waitFor(() => expect(addPayment).toHaveBeenCalled());
    expect(updateItem).toHaveBeenCalled();
  });
  it("ringkasan menandai melebihi budget", async () => {
    events = [{ ...ev, total_budget: 5_000_000 }];
    items = [{ id: "i1", kind: "vendor", name: "Gedung", planned_cost: 9_000_000, status: "tinjau", needed_date: null, side: "umum", contact: null, note: null }];
    render(<PlannerPage />);
    expect((await screen.findAllByText(/melebihi budget/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("kode undangan dibuat dan ditampilkan", async () => {
    events = [ev];
    const u = userEvent.setup();
    render(<PlannerPage />);
    await u.click(await screen.findByRole("button", { name: /Buat kode undangan/ }));
    expect((await screen.findByLabelText("Kode undangan planner")).textContent).toBe("ABCD2345");
  });
  it("target Tabungan bisa ditautkan dan menampilkan progres", async () => {
    events = [{ ...ev, goal_id: "g1" }];
    items = [{ id: "i1", kind: "vendor", name: "Gedung", planned_cost: 10_000_000, status: "tinjau", needed_date: null, side: "umum", contact: null, note: null }];
    render(<PlannerPage />);
    expect(await screen.findByText(/Kurang .*6\.000\.000/)).toBeTruthy();
  });
});
