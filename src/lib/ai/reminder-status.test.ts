import { describe, expect, it } from "vitest";
import { reminderStatusText } from "./reminder-offer";

describe("reminderStatusText", () => {
  it("aktif: boleh menyebut notifikasi pagi gajian", () => {
    expect(reminderStatusText("aktif")).toContain("SUDAH AKTIF");
  });
  it("ditawarkan: Ruby menutup dengan satu kalimat tawaran dan tidak berjanji dulu", () => {
    const t = reminderStatusText("ditawarkan");
    expect(t).toContain("kalimat tawaran");
    expect(t).toContain("Jangan berjanji");
  });
  it("belum: dilarang berjanji mengingatkan", () => {
    expect(reminderStatusText("belum")).toContain("Jangan berjanji");
  });
});
