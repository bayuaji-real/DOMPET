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

export const aiChatSchema = z.object({
  mode: z.enum(["savings", "advisor"]),
  // Riwayat dibatasi supaya biaya token terkendali
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().min(1).max(1000) }))
    .min(1)
    .max(14),
});

export const helpReportSchema = z.object({
  kind: z.enum(["bug", "usul"]),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(2000),
  page: z.string().max(200).optional(),
});
