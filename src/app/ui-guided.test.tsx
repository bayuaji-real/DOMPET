// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/layout/top-header", () => ({ TopHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/data/finance-snapshot", () => ({ getFinanceSnapshot: async () => ({ monthlyExpense: 4_000_000 }) }));
vi.mock("@/lib/data/goals", () => ({ getSavingsGoals: async () => [{ id: "g", name: "Dana Darurat", is_emergency_fund: true, status: "aktif", saved: 5_000_000 }] }));
import MoneyPlanner from "./(main)/money-planner/page";
import DanaDarurat from "./(main)/dana-daruratku/page";
import DanaPensiun from "./(main)/dana-pensiunku/page";
import DanaLain from "./(main)/dana-lain/page";
import Freedom from "./(main)/financial-freedom/page";
afterEach(cleanup);

const say = async (u: ReturnType<typeof userEvent.setup>, label: string, text: string) => { await u.type(screen.getByLabelText(label), text + "{Enter}"); };

describe("Fitur chat tanpa AI", () => {
  it("Money planner: 50/30/20 dari 10jt", async () => {
    const u = userEvent.setup();
    render(<MoneyPlanner />);
    await say(u, "Pesan Money planner", "10jt");
    await u.click(screen.getByRole("button", { name: "50/30/20" }));
    expect(screen.getByText(/5\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/3\.000\.000/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hitung lagi/ })).toBeTruthy();
  });
  it("jawaban tidak terbaca ditanya ulang dengan contoh", async () => {
    const u = userEvent.setup();
    render(<MoneyPlanner />);
    await say(u, "Pesan Money planner", "banyak");
    expect(screen.getByText(/Tulis angkanya saja/)).toBeTruthy();
  });
  it("Dana daruratku memakai data dompet", async () => {
    const u = userEvent.setup();
    render(<DanaDarurat />);
    await u.click(await screen.findByRole("button", { name: "Pakai data dompetku" }));
    await u.click(screen.getByRole("button", { name: "Lajang, penghasilan tetap" }));
    expect(screen.getByText(/12\.000\.000/)).toBeTruthy(); // minimum 3 bulan x 4 juta
    expect(screen.getByText(/7\.000\.000/)).toBeTruthy(); // kurang ke minimum
  });
  it("Dana pensiunku menghitung setoran per bulan dan menolak usia pensiun salah", async () => {
    const u = userEvent.setup();
    render(<DanaPensiun />);
    await say(u, "Pesan Dana pensiunku", "30"); await say(u, "Pesan Dana pensiunku", "lewati");
    await say(u, "Pesan Dana pensiunku", "5jt"); await say(u, "Pesan Dana pensiunku", "0");
    expect(screen.getByText(/Perlu disisihkan per bulan/)).toBeTruthy();
    cleanup();
    render(<DanaPensiun />);
    await say(u, "Pesan Dana pensiunku", "60"); await say(u, "Pesan Dana pensiunku", "50");
    await say(u, "Pesan Dana pensiunku", "5jt"); await say(u, "Pesan Dana pensiunku", "0");
    expect(screen.getByText(/lebih besar/)).toBeTruthy();
  });
  it("Dana lain: dana kesehatan memberi setoran dan saran", async () => {
    const u = userEvent.setup();
    render(<DanaLain />);
    await u.click(screen.getByRole("button", { name: "Dana kesehatan" }));
    await say(u, "Pesan Dana lain", "50jt"); await say(u, "Pesan Dana lain", "lewati"); await say(u, "Pesan Dana lain", "0");
    expect(screen.getByText(/Sisihkan per bulan/)).toBeTruthy();
    expect(screen.getByText(/BPJS Kesehatan/)).toBeTruthy();
  });
  it("Financial Freedom: 8jt per bulan butuh 2,4 miliar", async () => {
    const u = userEvent.setup();
    render(<Freedom />);
    await say(u, "Pesan Financial Freedom", "8jt"); await say(u, "Pesan Financial Freedom", "lewati");
    expect(screen.getByText(/2\.400\.000\.000/)).toBeTruthy();
  });
});
