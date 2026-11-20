import { describe, it, expect } from "vitest";
import { calculateSplit, roundToTotal } from "@/lib/split-bill";

const people = [
  { id: "a", name: "Aku" },
  { id: "b", name: "Budi" },
  { id: "c", name: "Citra" },
];

describe("split bill", () => {
  it("item dibagi ke orang yang memesan, pajak proporsional, ongkir rata", () => {
    const r = calculateSplit(
      people,
      [
        { id: "1", name: "Nasi goreng", price: 30000, qty: 1, sharedBy: ["a"] },
        { id: "2", name: "Ayam bakar", price: 60000, qty: 1, sharedBy: ["b"] },
        { id: "3", name: "Es teh", price: 5000, qty: 2, sharedBy: ["a", "b", "c"] },
      ],
      { taxPercent: 10, shipping: 15000 }
    );
    // subtotal: a 33.333, b 63.333, c 3.333 → total item 100.000, pajak 10.000, ongkir 15.000
    expect(r.itemsTotal).toBe(100000);
    expect(r.grandTotal).toBe(125000);
    const [a, b, c] = r.shares;
    expect(a.total + b.total + c.total).toBe(125000);
    expect(a.total).toBe(Math.round(33333.33 * 1.1 + 5000));
    expect(b.total).toBeGreaterThan(a.total);
    expect(c.shipping).toBe(5000);
  });

  it("diskon dipotong proporsional dan pajak dihitung setelah diskon", () => {
    const r = calculateSplit(
      people.slice(0, 2),
      [
        { id: "1", name: "A", price: 50000, qty: 1, sharedBy: ["a"] },
        { id: "2", name: "B", price: 150000, qty: 1, sharedBy: ["b"] },
      ],
      { discount: 20000, taxPercent: 10 }
    );
    expect(r.grandTotal).toBe(198000);
    expect(r.shares[0].total).toBe(49500);
    expect(r.shares[1].total).toBe(148500);
  });

  it("ongkir proporsional mengikuti porsi belanja", () => {
    const r = calculateSplit(
      people.slice(0, 2),
      [
        { id: "1", name: "A", price: 25000, qty: 1, sharedBy: ["a"] },
        { id: "2", name: "B", price: 75000, qty: 1, sharedBy: ["b"] },
      ],
      { shipping: 10000, shippingMode: "proportional" }
    );
    expect(r.shares.map((s) => s.total)).toEqual([27500, 82500]);
  });

  it("orang yang tidak ikut pesan tidak kena ongkir; item tanpa pemilik dilaporkan", () => {
    const r = calculateSplit(
      people,
      [
        { id: "1", name: "A", price: 10000, qty: 1, sharedBy: ["a"] },
        { id: "2", name: "Kerupuk", price: 2000, qty: 1, sharedBy: [] },
      ],
      { shipping: 9000 }
    );
    expect(r.shares[1].total).toBe(0);
    expect(r.shares[0].total).toBe(19000);
    expect(r.unassignedItems).toEqual(["Kerupuk"]);
  });

  it("pembulatan selalu pas dengan total", () => {
    expect(roundToTotal([3333.33, 3333.33, 3333.34], 10000).reduce((a, b) => a + b, 0)).toBe(10000);
    const r = calculateSplit(people, [{ id: "1", name: "Pizza", price: 100000, qty: 1, sharedBy: ["a", "b", "c"] }], {
      taxPercent: 11,
    });
    expect(r.shares.reduce((a, s) => a + s.total, 0)).toBe(111000);
  });
});
