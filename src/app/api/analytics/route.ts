import { NextResponse, type NextRequest } from "next/server";
import { getAnalyticsData } from "@/lib/data/analytics";
import type { AnalyticsPeriod } from "@/types/analytics";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { analyticsQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyServerAuth(request);
    if (!auth.authenticated && auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "month") as AnalyticsPeriod;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const vq = analyticsQuerySchema.safeParse({ period: searchParams.get("period") ?? undefined, startDate, endDate });
    if (!vq.success) {
      return NextResponse.json({ success: false, error: "Parameter tidak valid." }, { status: 400 });
    }

    const data = await getAnalyticsData({
      period,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Gagal mengambil data analisis:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data analisis",
      },
      { status: 500 }
    );
  }
}
