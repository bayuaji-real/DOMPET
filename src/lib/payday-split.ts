/**
 * Pembagian gaji di kartu "Gajian Hari Ini" (pasti, tanpa AI).
 *
 * Memakai mesin yang sama dengan Rencana (cara Money Planner):
 * gaji - biaya hidup = uang yang bisa dibagi, lalu diisi BERURUTAN ke tujuan
 * (tenggat terdekat dulu; tanpa tenggat paling akhir). Tujuan berikutnya hanya
 * kebagian bila tujuan di depannya sudah penuh. Total bagian tidak pernah melebihi gaji.
 */

import { buildPlan } from "@/lib/financial-plan";

export interface SplitGoal {
  id: string;
  name: string;
  /** sisa yang masih harus dikumpulkan */
  remaining: number;
  target: number;
  deadline: string | null;
  priority: number;
}

export interface PaydaySplit {
  /** setoran per tujuan (id -> rupiah) */
  amounts: Record<string, number>;
  /** sisa bebas setelah biaya hidup dan semua setoran */
  free: number;
  /** biaya hidup lebih besar dari gaji (kekurangannya) */
  deficit: number;
}

/** Urutan antrean: tenggat terdekat dulu, prioritas memecah seri, tanpa tenggat paling akhir. */
export function orderGoals<T extends { deadline: string | null; priority: number }>(goals: T[]): T[] {
  return [...goals].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline) || a.priority - b.priority;
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.priority - b.priority;
  });
}

export function splitPayday(input: {
  today: string;
  salary: number;
  livingCost: number;
  goals: SplitGoal[];
  roundTo?: number;
}): PaydaySplit {
  const amounts: Record<string, number> = Object.fromEntries(input.goals.map((g) => [g.id, 0]));
  const salary = Math.max(0, input.salary);
  const living = Math.max(0, input.livingCost);
  const deficit = Math.max(0, living - salary);
  if (salary <= 0 || deficit > 0) return { amounts, free: 0, deficit };

  const plan = buildPlan({
    today: input.today,
    paydays: [{ date: input.today, amount: salary }],
    livingPerPayday: living,
    bills: [],
    needs: input.goals.map((g) => ({
      id: g.id,
      name: g.name,
      remaining: Math.max(0, g.remaining),
      target: g.target,
      deadline: g.deadline,
      priority: g.priority,
    })),
    roundTo: input.roundTo,
  });
  for (const d of plan.allocations[0]?.deposits ?? []) amounts[d.needId] = (amounts[d.needId] ?? 0) + d.amount;
  const used = Object.values(amounts).reduce((a, b) => a + b, 0);
  return { amounts, free: Math.max(0, salary - living - used), deficit: 0 };
}

/** Batasi isian manual supaya total (biaya hidup + semua setoran) tidak melebihi gaji. */
export function clampAllocation(desired: number, salary: number, livingCost: number, otherAllocations: number): number {
  const room = Math.max(0, salary - livingCost - otherAllocations);
  return Math.max(0, Math.min(Math.floor(desired), room));
}
