// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProBadge } from "./pro-badge";
import { AnalisisTerkunci } from "@/components/home/analisis-terkunci";
import { parseEntitlement, cicipHabisMessage, canUse } from "@/lib/plans";

describe("Basic/Pro: tampilan dan aturan", () => {
  it("lencana Pro hanya mahkota, tanpa gembok", () => {
    const { container } = render(<ProBadge />);
    expect(screen.getByLabelText("Fitur Pro")).toBeTruthy();
    expect(container.textContent).toContain("👑");
    expect(container.textContent).not.toContain("🔒");
  });
  it("kartu Analisis Basic: tautan ke Paket, tanpa angka asli", () => {
    render(<AnalisisTerkunci />);
    const link = screen.getByRole("link", { name: /terkunci/ });
    expect(link.getAttribute("href")).toBe("/paket");
  });
  it("cicip dibaca dari database dan angka aneh jadi 0", () => {
    const e = parseEntitlement({ plan: "free", cicip: { struk: { limit: 2, used: 1, remaining: 1, per: "hari" }, suara: { limit: "x", remaining: -5 } } });
    expect(e.cicip.struk).toEqual({ limit: 2, used: 1, remaining: 1, per: "hari" });
    expect(e.cicip.suara.remaining).toBe(0);
  });
  it("pesan jatah habis ramah, harian dan seumur akun", () => {
    expect(cicipHabisMessage("struk", "hari")).toMatch(/besok/);
    expect(cicipHabisMessage("tabungan", "akun")).toMatch(/Pro/);
    expect(cicipHabisMessage("struk", "hari")).toContain("Gratis penggunaan AI Ruby");
    expect(cicipHabisMessage("struk", "hari")).not.toMatch(/cicip/i);
  });
  it("Analisis keuangan khusus Pro", () => {
    expect(canUse("free", "analisis")).toBe(false);
    expect(canUse("pro", "analisis")).toBe(true);
  });
  it("Impor CSV masuk Basic; Simulator cicilan, lunasi utang, dan seluruh perencana khusus Pro", () => {
    expect(canUse("free", "impor_csv")).toBe(true);
    for (const f of ["simulator_cicilan", "lunasi_utang", "ai_rencana", "target_beli", "money_planner", "dana_darurat", "dana_pensiun", "dana_lain", "financial_freedom"] as const) {
      expect(canUse("free", f)).toBe(false);
      expect(canUse("pro", f)).toBe(true);
    }
  });
});
