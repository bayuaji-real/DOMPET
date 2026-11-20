import { NextResponse } from "next/server";
import { generateJson, GeminiPart, GeminiError } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { voiceTransactionSchema } from "@/lib/validation";

export interface ParsedVoiceTransaction {
  type: "income" | "expense" | "transfer";
  amount: number;
  wallet_guess: string;
  category_guess: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export interface VoiceTransactionResponse {
  transcript: string;
  transactions: ParsedVoiceTransaction[];
}

export async function POST(req: Request) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.authenticated && auth.response) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const parsed = voiceTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
    }
    const {
      audioBase64,
      mimeType,
      textPrompt,
      userWallets = [],
      userCategories = [],
      currentDate,
    } = body;

    if (!audioBase64 && !textPrompt?.trim()) {
      return NextResponse.json(
        { error: "Mohon sediakan rekaman suara (audioBase64) atau kalimat teks (textPrompt)." },
        { status: 400 }
      );
    }

    // Ambil tanggal hari ini dalam zona waktu Asia/Jakarta jika tidak disediakan
    const today =
      currentDate ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

    // Format daftar dompet & kategori untuk prompt
    const defaultWallet = userWallets[0] || "Uang Tunai";
    const walletsListStr =
      userWallets.length > 0
        ? userWallets.join(", ")
        : "Uang Tunai, BCA Utama, GoPay, Bank Mandiri";
    const categoriesListStr =
      userCategories.length > 0
        ? userCategories.join(", ")
        : "Makanan & Minuman, Belanja Harian, Transportasi, Tagihan, Hiburan, Gaji / Pemasukan, Lainnya";

    // Siapkan Gemini Parts
    const parts: GeminiPart[] = [];

    if (audioBase64) {
      // Audio langsung
      const validMime = mimeType || "audio/webm";
      parts.push({
        inlineData: {
          mimeType: validMime,
          data: audioBase64,
        },
      });
      parts.push({
        text: `Dengarkan rekaman suara audio di atas dan ubah menjadi transkrip lengkap serta ekstrak semua transaksi keuangan di dalamnya.`,
      });
    } else {
      // Kalimat teks langsung (Ketik Cepat)
      parts.push({
        text: `Analisis teks kalimat berikut dan ekstrak semua transaksi keuangan di dalamnya:\n"${textPrompt.trim()}"`,
      });
    }

    const systemPrompt = `Kamu adalah asisten pencatat keuangan pribadi pintar untuk aplikasi Dompetku di Indonesia.
Tugasmu: Mendengarkan audio atau membaca teks bahasa Indonesia, membuat transkrip akurat, dan mengekstrak SETIAP transaksi keuangan yang disebutkan.

PANDUAN & ATURAN EKSTRAKSI:
1. MULTI-TRANSAKSI:
   - Satu rekaman atau kalimat BISA berisi LEBIH DARI SATU transaksi.
   - Contoh: "tadi makan bakso 15rb terus isi bensin 20rb pakai gopay, sama gajian masuk 2.5jt ke BCA"
     -> Wajib menghasilkan 3 item transaksi:
        1. Makan bakso: 15.000, expense, Uang Tunai, Makanan & Minuman
        2. Isi bensin: 20.000, expense, GoPay, Transportasi
        3. Gajian masuk: 2.500.000, income, BCA Utama, Gaji / Pemasukan

2. ANGKA LISAN & BAHASA GAUL INDONESIA:
   - "goceng" = 5000
   - "ceban" = 10000
   - "noban" = 20000
   - "gocap" = 50000
   - "cepek" / "cepek ceng" = 100000 (atau 100 tergantung konteks transaksi)
   - "seceng" = 1000
   - "gopek" = 500
   - "15rb", "15k", "lima belas ribu" = 15000
   - "dua ratus rebu", "200rb" = 200000
   - "1,5 juta", "satu setengah juta" = 1500000
   - "dua setengah juta", "2.5 juta" = 2500000
   - Nilai amount WAJIB berupa integer positif (angka rupiah bulat tanpa titik/koma/sen).

3. TIPE TRANSAKSI (type):
   - "expense": pengeluaran / belanja / jajan / bayar / beli
   - "income": pemasukan / gajian / transfer masuk / bonus / upah / cashback
   - "transfer": pindah dana antar rekening user

4. TANGGAL TRANSAKSI (date):
   - Tanggal referensi hari ini (Asia/Jakarta): ${today}
   - "tadi pagi", "tadi siang", "tadi", "hari ini" = ${today}
   - "kemarin" = 1 hari sebelum ${today}
   - "kemarin lusa" = 2 hari sebelum ${today}
   - Format tanggal WAJIB: YYYY-MM-DD.

5. TEBAKAN DOMPET (wallet_guess):
   - Cocokkan dengan daftar dompet pengguna: [${walletsListStr}].
   - Jika disebutkan "pakai gopay" -> "GoPay".
   - Jika disebutkan "ke BCA" atau "lewat BCA" -> "BCA Utama" (atau dompet BCA yang cocok).
   - Jika TIDAK disebutkan dompetnya -> gunakan "${defaultWallet}".

6. TEBAKAN KATEGORI (category_guess):
   - Cocokkan dengan daftar kategori pengguna: [${categoriesListStr}].
   - Makanan/minuman/kopi/makan -> "Makanan & Minuman"
   - Bensin/parkir/ojol/transport -> "Transportasi"
   - Gajian/gaji/upah -> "Gaji / Pemasukan" atau kategori pemasukan yang paling relevan
   - Tagihan/listrik/pulsa -> "Tagihan"
   - Lainnya -> "Lainnya"

7. TRANSKRIP (transcript):
   - Jika input berupa audio: tuliskan kalimat transkrip verbatim lengkap dalam bahasa Indonesia yang diucapkan pengguna.
   - Jika input berupa teks: tuliskan kembali teks kalimat pengguna tersebut.`;

    const responseSchema = {
      type: "object",
      properties: {
        transcript: {
          type: "string",
          description: "Transkrip kalimat lengkap yang diucapkan atau diinput pengguna",
        },
        transactions: {
          type: "array",
          description: "Daftar transaksi yang diekstrak dari audio/teks",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["income", "expense", "transfer"],
                description: "Tipe transaksi",
              },
              amount: {
                type: "integer",
                description: "Nominal rupiah utuh tanpa desimal",
              },
              wallet_guess: {
                type: "string",
                description: "Nama dompet yang cocok dari daftar dompet user",
              },
              category_guess: {
                type: "string",
                description: "Nama kategori yang cocok dari daftar kategori user",
              },
              note: {
                type: "string",
                description: "Deskripsi singkat / catatan transaksi",
              },
              date: {
                type: "string",
                description: "Format tanggal YYYY-MM-DD",
              },
            },
            required: ["type", "amount", "wallet_guess", "category_guess", "note", "date"],
          },
        },
      },
      required: ["transcript", "transactions"],
    };

    const result = await generateJson<VoiceTransactionResponse>(parts, {
      system: systemPrompt,
      responseSchema,
      temperature: 0.1,
    });

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      transactions: result.transactions,
    });
  } catch (error: unknown) {
    console.error("Gagal memproses voice transaction:", error);
    const err = error as { message?: string; userMessage?: string; status?: number };
    return NextResponse.json(
      {
        error:
          err.userMessage ||
          err.message ||
          "Gagal memproses transaksi suara. Coba lagi atau gunakan input manual ya.",
      },
      { status: err.status || 500 }
    );
  }
}
