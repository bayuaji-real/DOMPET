// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LandingClient } from "./landing/landing-client";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

afterEach(cleanup);

describe("Landing Page Components & User Flow", () => {
  it("renders the landing page with main branding, hero, and antislop copy", () => {
    render(<LandingClient isLoggedIn={false} />);

    // Brand and Hero Headline
    expect(screen.getAllByText("Dompetku").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Keuanganmu Rapi Seketika/i)
    ).toBeDefined();

    // CTA button
    const ctas = screen.getAllByText(/Mulai Coba Gratis 7 Hari/i);
    expect(ctas.length).toBeGreaterThan(0);

    // Differentiator / Reality Check section
    expect(
      screen.getByText(/Bukan Aplikasi Finansial Biasa yang Bikin Kamu Malas Nyatet/i)
    ).toBeDefined();
    expect(screen.getByText(/100% Bebas Akses Kredensial Perbankan/i)).toBeDefined();
  });

  it("allows toggling balance privacy (hide/show) in phone preview", () => {
    render(<LandingClient isLoggedIn={false} />);

    // Initial balance should be visible in IDR format
    const balanceRegex = /Rp14\.850\.000/i;
    expect(screen.getByText(balanceRegex)).toBeDefined();

    // Find Eye button
    const toggleBtn = screen.getByLabelText(/Sembunyikan Saldo/i);
    fireEvent.click(toggleBtn);

    // Balance should now be masked with dots
    expect(screen.getByText("••••••••")).toBeDefined();

    // Click again to unmask
    const showBtn = screen.getByLabelText(/Tampilkan Saldo/i);
    fireEvent.click(showBtn);
    expect(screen.getByText(balanceRegex)).toBeDefined();
  });

  it("switches interactive demo tabs between Scan Struk, Voice Note, and Mode Gajian", () => {
    render(<LandingClient isLoggedIn={false} />);

    // Initially on Scan Struk
    expect(screen.getByText(/1\. Scan Struk AI/i)).toBeDefined();
    expect(screen.getByText(/Indomaret Point Tebet Raya/i)).toBeDefined();

    // Switch to Voice Note
    const voiceTab = screen.getByText(/2\. Voice Note AI/i);
    fireEvent.click(voiceTab);
    expect(screen.getByText(/Rekaman Pesan Suara/i)).toBeDefined();
    expect(screen.getAllByText(/Mie Ayam/i).length).toBeGreaterThan(0);

    // Switch to Mode Gajian
    const gajianTab = screen.getByText(/3\. Mode Gajian/i);
    fireEvent.click(gajianTab);
    expect(screen.getByText(/Geser untuk Menguji Nominal Gajianmu/i)).toBeDefined();
    expect(screen.getByText(/Kebutuhan Pokok/i)).toBeDefined();
    expect(screen.getAllByText(/Saldo Bebas Jajan/i).length).toBeGreaterThan(0);
  });

  it("renders Ruby AI chat scenarios and allows switching questions", () => {
    render(<LandingClient isLoggedIn={false} />);

    // Default question is gadget
    expect(screen.getByText(/Aman gak kalau aku beli smartphone baru/i)).toBeDefined();
    expect(screen.getByText(/Kurang disarankan minggu ini \(Waspada\)/i)).toBeDefined();

    // Click another scenario: "Bulan ini boncos di mana?"
    const boncosBtn = screen.getByText(/Bulan ini boncos di mana\?/i);
    fireEvent.click(boncosBtn);

    expect(screen.getByText(/pengeluaran terbesarku bocor di mana\?/i)).toBeDefined();
  });

  it("displays accurate pricing cards with honest Indonesian rates", () => {
    render(<LandingClient isLoggedIn={false} />);

    // Basic (Rp0)
    expect(screen.getByText("Rp0")).toBeDefined();

    // Pro 12 Bulan (Rp99.000)
    expect(screen.getByText("Rp99.000")).toBeDefined();
    expect(screen.getByText(/Cuma Rp271 per hari/i)).toBeDefined();
    expect(screen.getByText(/PALING HEMAT & POPULER/i)).toBeDefined();

    // Pro 1 Bulan / 6 Bulan toggle
    expect(screen.getByText("Rp50.000")).toBeDefined();
    const toggle1Mo = screen.getByText(/1 Bulan \(Rp15rb\)/i);
    fireEvent.click(toggle1Mo);
    expect(screen.getByText("Rp15.000")).toBeDefined();
  });

  it("expands and collapses FAQ accordion items", () => {
    render(<LandingClient isLoggedIn={false} />);

    // First question is open by default
    const q1 = screen.getByText(/Apakah Dompetku meminta akses, PIN, atau password mobile banking saya\?/i);
    expect(screen.getByText(/Sama sekali TIDAK\. Dompetku menganut prinsip privasi ketat/i)).toBeDefined();

    // Toggle close
    fireEvent.click(q1);

    // Toggle open question 2 (install PWA)
    const q2 = screen.getByText(/Bagaimana cara memasang \(install\) Dompetku di HP iPhone atau Android\?/i);
    fireEvent.click(q2);
    expect(screen.getByText(/Dompetku adalah Progressive Web App \(PWA\) modern/i)).toBeDefined();
  });

  it("adapts CTA labels when user is already logged in", () => {
    render(<LandingClient isLoggedIn={true} />);

    // Should indicate dashboard opening
    expect(screen.getAllByText(/Buka Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Buka Dompetku Sekarang/i)).toBeDefined();
  });
});
