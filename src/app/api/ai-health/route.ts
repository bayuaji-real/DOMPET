import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/ai/gemini";
import { rateLimit } from "@/lib/rate-limit";

/** Tes cepat koneksi Gemini. Buka /api/ai-health saat sudah login. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login dulu" }, { status: 401 });

  // #3 Antrean: cegah serbuan permintaan ke Gemini.
  const rl = rateLimit(`api:${user.id}`);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });

  const started = Date.now();
  try {
    const result = await generateJson<{ items: { nama: string; nominal: number }[] }>(
      [{ text: 'Ubah jadi transaksi: "bakso goceng, bensin dua puluh rebu"' }],
      {
        system: "Kamu pencatat keuangan. Nominal dalam rupiah utuh (angka).",
        responseSchema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: { nama: { type: "string" }, nominal: { type: "integer" } },
                required: ["nama", "nominal"],
              },
            },
          },
          required: ["items"],
        },
      },
    );
    return NextResponse.json({ ok: true, model: process.env.GEMINI_MODEL, ms: Date.now() - started, result });
  } catch (e) {
    const err = e as { message?: string; userMessage?: string; status?: number };
    return NextResponse.json({ ok: false, error: err.userMessage ?? err.message }, { status: err.status ?? 500 });
  }
}
