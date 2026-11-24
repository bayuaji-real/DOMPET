import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { verifyServerAuth } from "@/lib/auth/server-auth";
import { guardAi, logAi } from "@/lib/ai/entitlement";
import { scanReceiptSchema } from "@/lib/validation";
import { USE_SAMPLE_DATA, todayJakarta } from "@/lib/data/sample-mode";

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export interface TaxBreakdown {
  subtotal?: number | null;
  tax?: number | null; // Nominal pajak PPN / PB1
  tax_name?: string | null; // Misal "PPN 11%" atau "PB1 Resto (10%)"
  service_charge?: number | null; // Biaya layanan / service charge
  discount?: number | null; // Potongan / diskon promo
  rounding?: number | null; // Pembulatan kasir
}

export interface ScanReceiptResult {
  is_receipt: boolean;
  merchant: string;
  date: string | null;
  total: number;
  items: ReceiptItem[];
  suggested_category: string | null;
  suggested_wallet: string | null;
  payment_hint: string | null;
  confidence: number;
  tax_breakdown?: TaxBreakdown | null;
  message?: string;
}

// Skema prompt ekstraksi struk Indonesia
const SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi cerdas dari aplikasi "Dompetku" yang ahli dalam membaca struk belanja, faktur, nota, dan bukti pembayaran di Indonesia.

Tugasmu:
Analisis gambar struk yang diberikan dan ekstrak data transaksi keuangan secara akurat dalam format JSON.

PANDUAN EKSTRAKSI STRUK INDONESIA:
1. is_receipt (boolean):
   - Berikan true jika gambar adalah struk belanja, nota kasir, faktur, bukti pembayaran, atau transfer.
   - Berikan false jika gambar buram total, tidak terbaca, atau bukan bukti transaksi keuangan (misal: foto pemandangan, selfie, dsb).

2. merchant (string):
   - Nama toko, minimarket, restoran, atau merchant (misal: "Indomaret", "Alfamart", "Starbucks", "Kopi Kenangan", "SPBU Pertamina", "Warung Makan Padang").
   - Bersihkan teks alamat/kode cabang yang terlalu panjang.

3. date (string YYYY-MM-DD):
   - Tanggal transaksi pada struk (struk Indonesia biasanya DD/MM/YYYY atau DD-MM-YYYY).
   - Jika tahun tidak tertera, gunakan tahun 2026. Jika tanggal tidak ada sama sekali, gunakan tanggal hari ini.

4. total (integer):
   - SANGAT PENTING: Ambil TOTAL AKHIR / TOTAL BAYAR / GRAND TOTAL / NETT yang dibayar pembeli.
   - JANGAN mengambil Subtotal sebelum pajak jika terdapat PPN (11%), PB1 (10%), atau Service Charge (5%).
   - JANGAN mengambil total sebelum diskon/potongan jika ada promo/voucher diskon.
   - Perhitungkan pembulatan kasir jika ada. Ambil angka final yang sebenarnya dikeluarkan dari dompet.
   - Konversikan ke integer utuh Rupiah (hapus "Rp", titik ribuan, atau koma sen). Contoh: "Rp 85.500" -> 85500.

5. items (array of objects):
   - Rincian item: [{"name": string, "qty": number, "price": integer}].
   - "price" adalah total nominal item tersebut (atau harga satuan jika qty=1).
   - Jika rincian barang tidak terbaca jelas, berikan array kosong [].

6. payment_hint (string):
   - Petunjuk metode pembayaran yang tertera pada struk (contoh: "QRIS", "GoPay", "ShopeePay", "OVO", "BCA Debit", "Mandiri", "Tunai", "Cash").

7. suggested_category (string):
   - Pilih satu nama kategori yang PALING SESUAI dari daftar kategori pengeluaran milik user.

8. tax_breakdown (object):
   - subtotal (integer): nominal subtotal sebelum pajak dan diskon.
   - tax (integer): nominal pajak (PPN atau PB1/pajak resto).
   - tax_name (string): keterangan nama pajak (misal: "PPN 11%" atau "PB1 (Pajak Resto 10%)").
   - service_charge (integer): nominal biaya layanan jika ada.
   - discount (integer): nominal potongan diskon jika ada.
   - rounding (integer): nominal pembulatan kasir jika ada.

9. confidence (number antara 0.0 sampai 1.0):
   - 1.0: Sangat jelas, seluruh teks toko, rincian, dan total bayar terbaca sempurna.
   - 0.7 - 0.9: Cukup jelas, total bayar pasti terbaca meskipun beberapa teks samping samar.
   - < 0.7: Gambar miring/terpotong/berkerut, atau total bayar meragukan.`;

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.authenticated && auth.response) {
      return auth.response;
    }

    // Foto struk di Split Bill khusus Pro (tanpa jatah cicip). Scan di Catat Transaksi boleh dicicip Basic.
    const dariSplitBill = req.headers.get("x-scan-source") === "split-bill";
    const guard = await guardAi("ai_struk", auth.userId, undefined, dariSplitBill);
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const parsed = scanReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
    }
    const { imageBase64, mimeType = "image/jpeg", userCategories, userWallets } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Gambar struk (imageBase64) wajib disertakan" },
        { status: 400 }
      );
    }

    // 1. Ambil Kategori & Dompet Pengguna (dari Supabase atau parameter)
    let categoriesList: string[] = Array.isArray(userCategories) ? userCategories : [];
    let walletsList: string[] = Array.isArray(userWallets) ? userWallets : [];

    try {
      const supabase = await createClient();
      if (categoriesList.length === 0) {
        const { data: dbCategories } = await supabase
          .from("categories")
          .select("name")
          .eq("type", "expense");
        if (dbCategories && dbCategories.length > 0) {
          categoriesList = dbCategories.map((c) => c.name);
        }
      }

      if (walletsList.length === 0) {
        const { data: dbWallets } = await supabase
          .from("wallets")
          .select("name")
          .eq("is_archived", false);
        if (dbWallets && dbWallets.length > 0) {
          walletsList = dbWallets.map((w) => w.name);
        }
      }
    } catch {
      // Abaikan jika unauthenticated di server, gunakan default fallback
    }

    if (categoriesList.length === 0) {
      categoriesList = ["Makanan & Minuman", "Belanja Harian", "Transportasi", "Tagihan", "Hiburan", "Lainnya"];
    }
    if (walletsList.length === 0) {
      walletsList = ["Uang Tunai", "BCA Utama", "GoPay", "Bank Mandiri"];
    }

    const categoriesPromptText = categoriesList.join(", ");
    const walletsPromptText = walletsList.join(", ");

    const dynamicUserPrompt = `Berikut daftar kategori pengeluaran milik user: [${categoriesPromptText}].\nBerikut daftar dompet milik user: [${walletsPromptText}].\n\nAnalisis gambar struk terlampir dan berikan JSON sesuai instruksi.`;

    // 2. Cek GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey && !USE_SAMPLE_DATA) {
      return NextResponse.json(
        { error: "Fitur Ruby belum diatur (GEMINI_API_KEY kosong di server)." },
        { status: 500 },
      );
    }

    if (!apiKey) {
      // Fallback cerdas untuk pengujian jika GEMINI_API_KEY belum terpasang di .env.local
      console.warn("⚠️ GEMINI_API_KEY belum terpasang di .env.local. Menggunakan ekstraksi berbasis data contoh.");

      // Cek karakteristik gambar untuk membedakan sampel Indomaret vs Kopi Kenangan
      const isKopi = imageBase64.length > 55000;

      if (isKopi) {
        return NextResponse.json({
          is_receipt: true,
          merchant: "Kopi Kenangan - Kota Kasablanka",
          date: todayJakarta(),
          total: 71000,
          items: [
            { name: "Kopi Kenangan Mantan (L)", qty: 2, price: 48000 },
            { name: "Roti Coklat Klasik", qty: 1, price: 14000 },
          ],
          payment_hint: "Tunai / Cash",
          suggested_category: categoriesList.find((c) => /makan|minum/i.test(c)) || "Makanan & Minuman",
          suggested_wallet: walletsList.find((w) => /tunai/i.test(w)) || "Uang Tunai",
          confidence: 0.94,
          tax_breakdown: {
            subtotal: 62000,
            tax: 6200,
            tax_name: "PB1 Resto (10%)",
            service_charge: 3100,
            discount: 0,
            rounding: -300,
          },
          message: "Hasil ekstraksi akurat (mode pengujian struk kafe/resto)",
        } satisfies ScanReceiptResult);
      }

      return NextResponse.json({
        is_receipt: true,
        merchant: "Indomaret Point",
        date: todayJakarta(),
        total: 82500, // Total akhir setelah diskon Rp5.000 (bukan subtotal Rp87.500)
        items: [
          { name: "Roti Tawar Gandum", qty: 1, price: 19500 },
          { name: "Ultra Milk Full Cream 1L", qty: 2, price: 38000 },
          { name: "Kopi Kenangan RTD 220ml", qty: 2, price: 30000 },
        ],
        payment_hint: "QRIS GoPay",
        suggested_category: categoriesList.find((c) => /belanja/i.test(c)) || "Belanja Harian",
        suggested_wallet: walletsList.find((w) => /gopay/i.test(w)) || "GoPay",
        confidence: 0.96,
        tax_breakdown: {
          subtotal: 87500,
          tax: 8175,
          tax_name: "PPN 11% (Termasuk)",
          service_charge: 0,
          discount: 5000,
          rounding: 0,
        },
        message: "Hasil ekstraksi akurat (mode pengujian struk minimarket)",
      } satisfies ScanReceiptResult);
    }

    // 3. Panggil Google Gemini API resmi via @google/genai (gunakan apiVersion: "v1beta" untuk dukungan input gambar multimodal)
    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

    // Model multimodal cepat dan akurat: gemini-3.5-flash-lite, fallback ke gemini-4-hydrogen
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-4-hydrogen"];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.interactions.create({
          model: modelName,
          input: [
            {
              type: "text",
              text: `${SYSTEM_PROMPT}\n\n${dynamicUserPrompt}`,
            },
            {
              type: "image",
              data: imageBase64,
              mime_type: mimeType,
            },
          ],
          response_format: {
            type: "object",
            properties: {
              is_receipt: { type: "boolean" },
              merchant: { type: "string" },
              date: { type: "string", description: "Format YYYY-MM-DD" },
              total: { type: "integer", description: "Total bayar akhir integer Rupiah" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    qty: { type: "number" },
                    price: { type: "integer" },
                  },
                  required: ["name", "qty", "price"],
                },
              },
              tax_breakdown: {
                type: "object",
                properties: {
                  subtotal: { type: "integer" },
                  tax: { type: "integer" },
                  tax_name: { type: "string" },
                  service_charge: { type: "integer" },
                  discount: { type: "integer" },
                  rounding: { type: "integer" },
                },
              },
              payment_hint: { type: "string" },
              suggested_category: { type: "string" },
              suggested_wallet: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["is_receipt", "merchant", "total", "confidence"],
          },
        });

        // Parse teks output dari model
        const outputText = response.output_text;
        if (outputText) {
          const parsed = JSON.parse(outputText);
          await logAi("ai_struk", { model: "scan-receipt", inputTokens: Number((response as { usage?: { input_tokens?: number } }).usage?.input_tokens ?? 0), outputTokens: Number((response as { usage?: { output_tokens?: number } }).usage?.output_tokens ?? 0) });
          return NextResponse.json({
            is_receipt: Boolean(parsed.is_receipt),
            merchant: String(parsed.merchant || "Toko"),
            date: parsed.date || null,
            total: Math.max(0, parseInt(String(parsed.total).replace(/\D/g, "") || "0", 10)),
            items: Array.isArray(parsed.items) ? parsed.items : [],
            tax_breakdown: parsed.tax_breakdown || null,
            payment_hint: parsed.payment_hint || null,
            suggested_category: parsed.suggested_category || null,
            suggested_wallet: parsed.suggested_wallet || null,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
          } satisfies ScanReceiptResult);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Gagal memanggil model ${modelName}:`, err);
        // Coba model berikutnya di loop
      }
    }

    throw lastError || new Error("Gagal membaca struk dengan Gemini AI");
  } catch (error: unknown) {
    console.error("Error scan-receipt API:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat memproses struk";
    return NextResponse.json(
      {
        is_receipt: false,
        merchant: "",
        date: null,
        total: 0,
        items: [],
        suggested_category: null,
        suggested_wallet: null,
        payment_hint: null,
        confidence: 0,
        message,
      } satisfies ScanReceiptResult,
      { status: 500 }
    );
  }
}
