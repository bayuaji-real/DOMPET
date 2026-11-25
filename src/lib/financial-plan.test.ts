import { describe, it, expect } from "vitest";
import { buildPlan, billDueDates, generatePaydays, storageFor } from "@/lib/financial-plan";

describe("rencana keuangan per gajian", () => {
  const paydays = generatePaydays("2026-11-27", 2500000, "biweekly", 10);

  it("jadwal gajian 2 mingguan & bulanan", () => {
    expect(paydays.slice(0, 3).map((p) => p.date)).toEqual(["2026-11-27", "2026-12-11", "2026-12-25"]);
    expect(generatePaydays("2027-01-31", 1, "monthly", 2).map((p) => p.date)).toEqual(["2027-01-31", "2027-02-28"]);
  });

  it("tagihan bulanan jatuh di periode gajian yang benar", () => {
    expect(billDueDates({ name: "Claude", amount: 416000, dayOfMonth: 26 }, "2026-11-27", "2026-12-11")).toEqual([]);
    expect(billDueDates({ name: "Claude", amount: 416000, dayOfMonth: 26 }, "2026-12-11", "2026-12-25")).toEqual([]);
    expect(billDueDates({ name: "Claude", amount: 416000, dayOfMonth: 26 }, "2026-12-25", "2027-01-08")).toEqual(["2026-12-26"]);
  });

  it("sisa gaji diisi berurutan sesuai tenggat, kelipatan 50 ribu", () => {
    const r = buildPlan({
      today: "2026-11-20",
      paydays,
      livingPerPayday: 400000,
      bills: [],
      needs: [
        { id: "nikah", name: "Nikah", remaining: 10000000, target: 10000000, deadline: "2027-10-29" },
        { id: "lamaran", name: "Lamaran", remaining: 3900000, target: 6000000, deadline: "2026-12-25" },
      ],
    });
    // gajian 1: bebas 2.100.000 → semua ke Lamaran (tenggat paling dekat)
    expect(r.allocations[0].deposits).toEqual([{ needId: "lamaran", name: "Lamaran", amount: 2100000 }]);
    // gajian 2: Lamaran sisa 1.800.000, sisanya 300.000 ke Nikah
    expect(r.allocations[1].deposits).toEqual([
      { needId: "lamaran", name: "Lamaran", amount: 1800000 },
      { needId: "nikah", name: "Nikah", amount: 300000 },
    ]);
    const lamaran = r.needs.find((n) => n.id === "lamaran")!;
    expect(lamaran.fullOn).toBe("2026-12-11");
    expect(lamaran.onTime).toBe(true);
    expect(lamaran.storage).toBe("bank");
    expect(r.needs.find((n) => n.id === "nikah")!.storage).toBe("rdpu");
  });

  it("melaporkan kekurangan kalau tenggat tidak terkejar", () => {
    const r = buildPlan({
      today: "2026-11-20",
      paydays: paydays.slice(0, 2),
      livingPerPayday: 400000,
      bills: [],
      needs: [{ id: "x", name: "Mendadak", remaining: 5000000, target: 5000000, deadline: "2026-12-11" }],
    });
    const x = r.needs[0];
    expect(x.onTime).toBe(false);
    expect(x.shortfallAtDeadline).toBe(5000000 - 4200000);
    expect(x.neededPerPayday).toBe(2500000);
    expect(r.allDoneOn).toBeNull();
  });

  it("defisit bila gaji tidak menutup biaya hidup + tagihan", () => {
    const r = buildPlan({
      today: "2026-11-20",
      paydays: [{ date: "2026-12-25", amount: 500000 }],
      livingPerPayday: 400000,
      bills: [{ name: "Claude", amount: 416000, dayOfMonth: 26 }],
      needs: [],
    });
    expect(r.allocations[0].deficit).toBe(316000);
  });

  it("aturan tempat simpan sesuai jangka waktu", () => {
    expect(storageFor(1)).toBe("bank");
    expect(storageFor(12)).toBe("rdpu");
    expect(storageFor(60)).toBe("rdpu");
    expect(storageFor(61)).toBe("investasi_jangka_panjang");
  });
});
