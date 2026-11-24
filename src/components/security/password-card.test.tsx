// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const updateUser = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { updateUser } }) }));

import { PasswordCard } from "./password-card";

describe("PasswordCard", () => {
  it("menolak kurang dari 8 karakter dan konfirmasi berbeda, menerima yang benar", async () => {
    render(<PasswordCard />);
    const a = screen.getByLabelText("Kata sandi baru"), b = screen.getByLabelText("Ulangi kata sandi baru");
    fireEvent.change(a, { target: { value: "pendek" } }); fireEvent.change(b, { target: { value: "pendek" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan kata sandi" }));
    expect(await screen.findByText(/minimal 8/)).toBeTruthy();
    fireEvent.change(a, { target: { value: "panjangbanget1" } }); fireEvent.change(b, { target: { value: "beda-lagi-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan kata sandi" }));
    expect(await screen.findByText(/belum sama/)).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
    fireEvent.change(b, { target: { value: "panjangbanget1" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan kata sandi" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "panjangbanget1" }));
    expect(await screen.findByText(/berhasil diperbarui/)).toBeTruthy();
  });
});
