import { NextResponse, type NextRequest } from "next/server";
import { generateJson, GeminiError } from "@/lib/ai/gemini";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { guardAi, logAi } from "@/lib/ai/entitlement";
import { aiPlanSchema } from "@/lib/validation";

/**
 * Saran AI untuk rencana keuangan. Angka sudah dihitung pasti di aplikasi (lib/financial-plan);
 * AI hanya menjelaskan dengan bahasa sederhana dan menyarankan susunan dompet.
 */

interface PlanNeedSummary {
  name: string;
  target: number;
  remaining: number;
  deadline: string | null;
  fullOn: string | null;
  onTime: boolean | null;
  neededPerPayday: number | null;
  shortfallAtDeadline: number;
  monthsToDeadline: number | null;
  storage: string;
}

interface Body {
  today: string;
  incomePerPayday: number;
  paydayCount: number;
  frequencyLabel: string;
  livingPerPayday: number;
  bills: { name: string; amount: number; dayOfMonth: number }[];
  needs: PlanNeedSummary[];
  wallets: { name: string; type: string }[];
  totals: { totalNeeds: number; totalIncome: number; totalLeftover: number; allDoneOn: string | null };
}

export interface AIPlanResponse {
  ringkasan: string;
  saran: string[];
  dompet: { nama: string; jenis: "bank" | "ewallet" | "cash" | "investasi"; tempat: string; untuk: string; alasan: string }[];
}

const rp = (n: number) => `Rp${Math.round(n || 0).toLocaleString("id-ID")}`;

export async function POST(request: NextRequest) {
  const auth = await verifyServerAuth(request);
  if (!auth.authenticated && auth.response) return auth.response;

  let body: Body;
  try {
    body = await request.json();
    const parsed = aiPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Input tidak valid." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
  }
  if (!Array.isArray(body?.needs)) {
    return NextResponse.json({ success: false, error: "Data kebutuhan kosong" }, { status: 400 });
  }

  const guard = await guardAi("ai_rencana", auth.userId, undefined, true);
  if (!guard.ok) return guard.response;

  const needsText = body.needs
    .slice(0, 20)
    .map(
      (n) =>
        `- ${String(n.name).slice(0, 60)}: target ${rp(n.target)}, kurang ${rp(n.remaining)}, tenggat ${n.deadline ?? "tidak ada"}` +
        ` (${n.monthsToDeadline ?? "?"} bulan lagi), perkiraan penuh ${n.fullOn ?? "belum terkejar"}, ` +
        `${n.onTime === false ? `TELAT, kurang ${rp(n.shortfallAtDeadline)} saat tenggat` : n.onTime ? "tepat waktu" : "tanpa tenggat"}, ` +
        `perlu ±${rp(n.neededPerPayday ?? 0)} per gajian, saran aturan jangka waktu: ${n.storage}`
    )
    .join("\n");

  const prompt = `
Hari ini ${body.today}. Data keuangan (angka sudah dihitung aplikasi, JANGAN dihitung ulang atau diubah):
- Pemasukan: ${rp(body.incomePerPayday)} per gajian (${body.frequencyLabel}), ${body.paydayCount} gajian dihitung
- Biaya hidup per gajian: ${rp(body.livingPerPayday)}
- Tagihan bulanan: ${body.bills.map((b) => `${String(b.name).slice(0, 40)} ${rp(b.amount)} tgl ${b.dayOfMonth}`).join("; ") || "tidak ada"}
- Total kebutuhan yang masih harus dikumpulkan: ${rp(body.totals.totalNeeds)}
- Semua kebutuhan diperkirakan penuh: ${body.totals.allDoneOn ?? "belum semuanya terkejar dalam jadwal gajian"}
- Sisa bebas (tidak dialokasikan) selama periode: ${rp(body.totals.totalLeftover)}
Kebutuhan:
${needsText || "- belum ada"}
Dompet yang sudah ada: ${body.wallets.map((w) => `${String(w.name).slice(0, 40)} (${w.type})`).join(", ") || "belum ada"}

Aturan jangka waktu: < 3 bulan → tabungan bank terpisah; 3 bulan–5 tahun → RDPU (reksa dana pasar uang) / deposito; > 5 tahun → reksa dana indeks/saham bertahap.

Tugas:
1. ringkasan: 2–3 kalimat, bahasa Indonesia santai untuk pemula, apakah rencana ini aman, mana yang paling mepet.
2. saran: 3–5 langkah konkret (pakai angka dari data di atas). Kalau ada yang telat, beri pilihan realistis (geser tenggat, kurangi target, tambah pemasukan, atau kurangi biaya hidup) — jangan menjanjikan untung pasti.
3. dompet: susunan dompet/pos yang disarankan supaya uang tiap tujuan tidak tercampur. Pakai dompet yang sudah ada bila cocok (sebut namanya persis), tambahkan yang baru bila perlu. Maksimal 6.
`.trim();

  try {
    const result = await generateJson<AIPlanResponse>([{ text: prompt }], {
      system:
        'Kamu pendamping keuangan pribadi di aplikasi "Dompetku" untuk pengguna Indonesia yang pemula. Sabar, tidak menghakimi, bahasa sederhana. Kamu bukan penasihat keuangan berlisensi (saranmu hanya berdasarkan data dan riset umum, tetapi jangan menulis kalimat penafian di jawabanmu): jangan menyebut nama produk investasi atau saham tertentu, cukup kategorinya. Jangan menyebut kata "AI".',
      responseSchema: {
        type: "OBJECT",
        properties: {
          ringkasan: { type: "STRING" },
          saran: { type: "ARRAY", items: { type: "STRING" } },
          dompet: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                nama: { type: "STRING", description: "Nama dompet/pos, singkat" },
                jenis: { type: "STRING", enum: ["bank", "ewallet", "cash", "investasi"] },
                tempat: { type: "STRING", description: "Contoh: tabungan bank terpisah, RDPU, e-wallet" },
                untuk: { type: "STRING", description: "Kebutuhan yang ditampung" },
                alasan: { type: "STRING" },
              },
              required: ["nama", "jenis", "tempat", "untuk", "alasan"],
            },
          },
        },
        required: ["ringkasan", "saran", "dompet"],
      },
      temperature: 0.3,
    });

    await logAi("ai_rencana", result);
    return NextResponse.json({
      success: true,
      data: {
        ringkasan: String(result.ringkasan || ""),
        saran: (result.saran || []).slice(0, 6).map(String),
        dompet: (result.dompet || []).slice(0, 6),
      },
    });
  } catch (err) {
    const msg = err instanceof GeminiError ? err.userMessage : "Saran belum bisa dibuat. Coba lagi sebentar lagi.";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
