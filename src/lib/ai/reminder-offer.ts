/** Kapan Ruby menawarkan pengingat gajian: belum aktif, gaji dan target ada, dan belum ditawarkan dalam 3 hari terakhir. */
export const OFFER_COOLDOWN_MS = 3 * 86_400_000;

export function shouldOfferPaydayReminder(i: {
  enabled: boolean;
  offeredAt: string | null;
  nowMs: number;
  hasPayday: boolean;
  hasGoals: boolean;
}): boolean {
  if (i.enabled || !i.hasPayday || !i.hasGoals) return false;
  if (!i.offeredAt) return true;
  const t = Date.parse(i.offeredAt);
  return Number.isNaN(t) || i.nowMs - t >= OFFER_COOLDOWN_MS;
}
