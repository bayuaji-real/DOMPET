import { NextResponse, type NextRequest } from "next/server";
import { generateJson } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { verifyServerAuth } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

interface AIInsightResponse {
  insights: string[];
  actionable_tip: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyServerAuth(request);
    if (!auth.authenticated && auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const {
      periodKey,
      periodLabel,
      startDate,
      endDate,
      summary,
      topCategories = [],
      topMerchants = [],
      financialHealth,
      forceRefresh = false,
    } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Parameter tanggal tidak lengkap" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Cek Cache di Tabel `ai_insights` Database Supabase
    if (!forceRefresh) {
      try {
        const { data: cached, error: cacheErr } = await supabase
          .from("ai_insights")
          .select("*")
          .eq("period_start", startDate)
          .eq("period_end", endDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cacheErr && cached && cached.content) {
          const content = cached.content as any;
          return NextResponse.json({
            success: true,
            data: {
              periodKey: `${startDate}:${endDate}`,
              insights: content.insights || [],
              actionableTip: content.actionable_tip || "",
              generatedAt: cached.created_at || new Date().toISOString(),
              cached: true,
            },
          });
        }
      } catch (err) {
        console.warn("Lewati cache database:", err);
      }
    }

    // 2. Susun Ringkasan Angka untuk Prompt Gemini
    const catText = topCategories
      .slice(0, 4)
      .map(
        (c: any) =>
          `${c.name} (${c.percentage}%, Rp ${Number(c.nominal).toLocaleString("id-ID")})`
      )
      .join("; ");

    const merchantText = topMerchants
      .slice(0, 3)
      .map(
        (m: any) =>
          `${m.merchant} (${m.visitCount}x kunjungan, total Rp ${Number(m.totalSpent).toLocaleString("id-ID")})`
      )
      .join("; ");

    const promptText = `
Berikut adalah ringkasan data finansial pengguna untuk periode ${periodLabel || `${startDate} s/d ${endDate}`}:
- Total Pemasukan: Rp ${Number(summary?.totalIncome || 0).toLocaleString("id-ID")} (${summary?.incomeChangePct >= 0 ? "+" : ""}${summary?.incomeChangePct || 0}% dibanding periode lalu)
- Total Pengeluaran: Rp ${Number(summary?.totalExpense || 0).toLocaleString("id-ID")} (${summary?.expenseChangePct >= 0 ? "+" : ""}${summary?.expenseChangePct || 0}% dibanding periode lalu)
- Sisa Arus Kas (Cashflow): Rp ${Number(summary?.cashflow || 0).toLocaleString("id-ID")}
- Rasio Menabung: ${summary?.savingsRate || 0}% dari pemasukan
- Rata-rata Pengeluaran: Rp ${Number(summary?.dailyAverage || 0).toLocaleString("id-ID")} / hari
- Kategori Terbesar: ${catText || "Belum ada rincian"}
- Toko Terbanyak: ${merchantText || "Belum ada catatan toko"}
- Status Kesehatan: ${financialHealth?.overallStatus || "sehat"} (Cadangan dana darurat: ${financialHealth?.emergencyFundMonths || 0} bulan biaya hidup)

Tugasmu:
1. Buatkan 3 hingga 5 poin insight yang tajam, spesifik dengan angka perbandingannya, dan gunakan bahasa Indonesia yang hangat, santai, dan bersahabat (hindari jargon finansial kaku).
2. Berikan 1 saran konkret (actionable tip) yang realistis dan mudah langsung dijalankan minggu ini.
`.trim();

    // 3. Panggil Gemini API dengan Response Schema JSON
    const geminiResult = await generateJson<AIInsightResponse>(
      [{ text: promptText }],
      {
        system:
          'Kamu adalah asisten analisis keuangan pribadi cerdas untuk aplikasi "Dompetku" di Indonesia. Tugasmu menguraikan angka agregasi menjadi wawasan bersahabat dan saran praktis. JANGAN menyebut kata "AI" dalam hasil teksmu, gunakan sudut pandang "Kami" atau sapaan hangat asisten keuangan.',
        responseSchema: {
          type: "OBJECT",
          properties: {
            insights: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Daftar 3-5 poin insight spesifik tentang arus kas dan pengeluaran",
            },
            actionable_tip: {
              type: "STRING",
              description: "Satu saran konkret dan praktis yang bisa langsung diterapkan",
            },
          },
          required: ["insights", "actionable_tip"],
        },
        temperature: 0.2,
      }
    );

    const generatedInsights = geminiResult.insights || [];
    const generatedTip = geminiResult.actionable_tip || "";

    // 4. Simpan ke Cache Supabase Tabel `ai_insights`
    try {
      await supabase.from("ai_insights").insert({
        period_start: startDate,
        period_end: endDate,
        content: {
          insights: generatedInsights,
          actionable_tip: generatedTip,
        },
      });
    } catch (dbErr) {
      console.warn("Gagal menyimpan cache ke Supabase ai_insights:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        periodKey: `${startDate}:${endDate}`,
        insights: generatedInsights,
        actionableTip: generatedTip,
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error: any) {
    console.error("Gagal generate AI insights:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.userMessage || error.message || "Gagal membuat wawasan finansial",
      },
      { status: 500 }
    );
  }
}
