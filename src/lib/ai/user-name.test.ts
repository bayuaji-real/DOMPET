import { describe, expect, it } from "vitest";
import { firstNameFrom, nameToText } from "./user-name";

describe("nama depan untuk sapaan Ruby", () => {
  it("memakai nama depan dari nama lengkap", () => {
    expect(firstNameFrom({ full_name: "Bayu Aji Santoso" }, "bayuuuajisantoso@gmail.com")).toBe("Bayu");
  });
  it("nama bawaan dari email dianggap belum dibuat", () => {
    expect(firstNameFrom({ full_name: "intanmartapuspitasari" }, "intanmartapuspitasari@gmail.com")).toBeNull();
  });
  it("tanpa nama: null dan tidak ada teks prompt", () => {
    expect(firstNameFrom({}, "a@b.com")).toBeNull();
    expect(firstNameFrom(null, null)).toBeNull();
    expect(nameToText(null)).toBe("");
  });
  it("membersihkan emoji, huruf kecil semua, dan nama terlalu pendek", () => {
    expect(firstNameFrom({ name: "👑 intan puspita" }, "x@y.com")).toBe("Intan");
    expect(firstNameFrom({ name: "A" }, "x@y.com")).toBeNull();
    expect(firstNameFrom({ name: "   " }, "x@y.com")).toBeNull();
  });
  it("teks prompt menyebut nama dan batasannya", () => {
    expect(nameToText("Bayu")).toContain("Bayu");
    expect(nameToText("Bayu")).toContain("sekali per jawaban");
  });
});
