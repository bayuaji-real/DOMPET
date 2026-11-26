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

export type ReminderStatus = "aktif" | "ditawarkan" | "belum";

/** Status pengingat gajian untuk Ruby, supaya dia tidak berjanji hal yang belum aktif dan menawarkan bantuan di kata-katanya. */
export function reminderStatusText(status: ReminderStatus): string {
  if (status === "aktif") return "STATUS PENGINGAT GAJIAN: SUDAH AKTIF. Kamu boleh bilang akan mengirim notifikasi pembagian uang di pagi gajian.";
  if (status === "ditawarkan")
    return 'STATUS PENGINGAT GAJIAN: BELUM AKTIF, kartu tawaran (tombol "Ya, ingatkan aku") muncul di bawah jawabanmu. Kalau jawabanmu analisis lengkap, tutup dengan SATU kalimat tawaran yang hangat, misalnya: "Mau aku ingatkan pas gajian dan kasih tahu uangnya dibagi ke mana? Tinggal tekan tombol di bawah." Untuk balasan singkat, cukup jawab singkat; kartunya tetap tampil. Jangan berjanji akan mengingatkan sebelum pengguna menekan Ya.';
  return "STATUS PENGINGAT GAJIAN: BELUM AKTIF. Jangan berjanji akan mengingatkan atau menotifikasi pengguna.";
}
