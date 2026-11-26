/**
 * Skema validasi input (zod) untuk endpoint API.
 * Tujuan: menolak input yang jelas salah / terlalu besar sebelum diproses,
 * agar hemat biaya Gemini dan aman. Dibuat longgar: field tak dikenal diabaikan,
 * dan kita tetap memakai `body` asli di route, jadi tak ada field yang hilang.
 */
import { z } from "zod";

const namesList = z.array(z.string().max(200)).max(500).optional();

// Batas ukuran base64 (sekitar 22 juta huruf ≈ 16 MB file)
const BASE64_MAX = 22_000_000;

export const scanReceiptSchema = z.object({
  imageBase64: z.string().min(1).max(BASE64_MAX),
  mimeType: z.string().max(100).optional(),
  userCategories: namesList,
  userWallets: namesList,
});

export const voiceTransactionSchema = z.object({
  audioBase64: z.string().max(BASE64_MAX).optional(),
  mimeType: z.string().max(100).optional(),
  textPrompt: z.string().max(5000).optional(),
  userWallets: namesList,
  userCategories: namesList,
  currentDate: z.string().max(40).optional(),
});

export const aiInsightsSchema = z.object({
  periodKey: z.string().max(100).optional(),
  periodLabel: z.string().max(200).optional(),
  startDate: z.string().min(1).max(40),
  endDate: z.string().min(1).max(40),
  summary: z.unknown().optional(),
  topCategories: z.array(z.unknown()).max(200).optional(),
  topMerchants: z.array(z.unknown()).max(200).optional(),
  financialHealth: z.unknown().optional(),
  forceRefresh: z.boolean().optional(),
});

export const aiPlanSchema = z.object({
  needs: z.unknown().optional(),
  today: z.string().max(40).optional(),
  frequencyLabel: z.string().max(100).optional(),
  incomePerPayday: z.union([z.number(), z.string().max(30)]).optional(),
  paydayCount: z.union([z.number(), z.string().max(30)]).optional(),
  livingPerPayday: z.union([z.number(), z.string().max(30)]).optional(),
  bills: z.array(z.unknown()).max(500).optional(),
  totals: z.unknown().optional(),
  wallets: z.array(z.unknown()).max(500).optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.string().max(20).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
});

export const savingsPendingSchema = z.object({
  ask: z.enum(["gaji", "tanggal_gajian", "biaya_hidup", "komitmen_rutin"]),
  name: z.string().max(60),
  target_amount: z.number().int().positive().max(1e13),
  initial_amount: z.number().int().min(0).max(1e13),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  hints: z
    .object({
      monthly_income: z.number().min(0).max(1e13).optional(),
      payday_day: z.number().int().min(0).max(31).optional(),
      monthly_living_cost: z.number().min(0).max(1e13).optional(),
      living_use_average: z.boolean().optional(),
      other_fixed_monthly: z.number().min(0).max(1e11).optional(),
    })
    .default({}),
});
export type SavingsPending = z.infer<typeof savingsPendingSchema>;

export const aiChatSchema = z.object({
  mode: z.enum(["savings", "advisor", "plan"]),
  // Riwayat dibatasi supaya biaya token terkendali
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), text: z.string().min(1).max(1000) }),
        // Jawaban Ruby (rencana gajian demi gajian + strategi) bisa panjang, dan ikut dikirim balik sebagai riwayat.
        z.object({ role: z.literal("model"), text: z.string().min(1).max(4000) }),
      ])
    )
    .min(1)
    .max(14),
  /** Keadaan "menunggu jawaban gaji/biaya hidup" dari balasan sebelumnya (mode tabungan). */
  pending: savingsPendingSchema.nullable().optional(),
  /** Percakapan yang sedang berjalan (dari balasan sebelumnya). Kosong = Tanya Ruby memakai percakapan terakhir, mode lain mulai sesi baru. */
  threadId: z.string().uuid().optional(),
});

export const helpReportSchema = z.object({
  kind: z.enum(["bug", "usul"]),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(2000),
  page: z.string().max(200).optional(),
  imagePath: z.string().max(200).regex(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.jpg$/).optional(),
});
