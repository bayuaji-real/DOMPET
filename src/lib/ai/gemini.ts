/**
 * Pemanggil Gemini API — HANYA untuk server (Route Handler / Server Action).
 * Jangan di-import dari komponen "use client": GEMINI_API_KEY tidak boleh sampai ke browser.
 *
 * Env:
 *   GEMINI_API_KEY          kunci dari Google AI Studio (Free tier)
 *   GEMINI_MODEL            model utama  (default: gemini-3.5-flash-lite)
 *   GEMINI_FALLBACK_MODEL   dipakai kalau model utama sibuk/error 5xx (default: gemini-flash-latest)
 */

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai/gemini.ts hanya boleh dipakai di server.");
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }; // data = base64 (gambar struk / audio)

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Pesan ramah untuk ditampilkan ke user. */
    public userMessage: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

interface GenerateOptions {
  /** Instruksi sistem (peran, aturan format). */
  system?: string;
  /** JSON Schema (format OpenAPI subset Gemini) untuk memaksa output JSON terstruktur. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  /** Batas waktu per percobaan, ms. Default 30 detik. */
  timeoutMs?: number;
}

function friendly(status: number): string {
  if (status === 429) return "Mohon maaf, jaringan kami sedang padat. Coba lagi sebentar lagi, atau isi manual dulu ya.";
  if (status === 400) return "Kami belum bisa membaca data ini. Coba ulangi, atau isi manual.";
  if (status === 401 || status === 403) return "Fitur AI sedang dalam perbaikan. Coba lagi nanti ya.";
  return "Mohon maaf, jaringan kami sedang padat. Coba lagi sebentar lagi, atau isi manual dulu ya.";
}

async function callModel(model: string, parts: GeminiPart[], opts: GenerateOptions) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY belum diisi", 500, "Fitur pencatatan otomatis sedang dalam perbaikan. Coba lagi nanti ya.");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      ...(opts.responseSchema
        ? { responseMimeType: "application/json", responseSchema: opts.responseSchema }
        : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? res.statusText;
    throw new GeminiError(`[${model}] ${res.status}: ${msg}`, res.status, friendly(res.status));
  }
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new GeminiError(`[${model}] respons kosong`, 502, friendly(502));
  return text;
}

/**
 * Kirim teks/gambar/audio ke Gemini. Kalau model utama sibuk (5xx/timeout),
 * otomatis mencoba model cadangan sekali.
 */
export async function generateText(parts: GeminiPart[], opts: GenerateOptions = {}): Promise<string> {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
  try {
    return await callModel(primary, parts, opts);
  } catch (err) {
    const retriable =
      (err instanceof GeminiError && err.status >= 500) ||
      (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"));
    if (!retriable || fallback === primary) throw normalize(err);
    try {
      return await callModel(fallback, parts, { ...opts, timeoutMs: opts.timeoutMs ?? 45_000 });
    } catch (err2) {
      throw normalize(err2);
    }
  }
}

/** Sama seperti generateText, tapi langsung mengembalikan objek JSON hasil parse. */
export async function generateJson<T>(parts: GeminiPart[], opts: GenerateOptions & { responseSchema: Record<string, unknown> }): Promise<T> {
  const text = await generateText(parts, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Output bukan JSON valid", 502, "Kami menerima format yang tidak bisa dibaca. Coba lagi ya.");
  }
}

function normalize(err: unknown): GeminiError {
  if (err instanceof GeminiError) return err;
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return new GeminiError("Timeout", 504, "Waktu proses habis. Coba lagi, atau isi manual dulu ya.");
  }
  return new GeminiError(String(err), 500, friendly(500));
}

/** Ubah File/Blob (dari FormData) menjadi part inlineData untuk Gemini. */
export async function fileToPart(file: Blob): Promise<GeminiPart> {
  const buf = Buffer.from(await file.arrayBuffer());
  return { inlineData: { mimeType: file.type || "application/octet-stream", data: buf.toString("base64") } };
}


// ---------------------------------------------------------------------------
// Chat berbilang giliran + catatan pemakaian token (dipakai fitur Chat AI)
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface UsageInfo {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface ChatOptions {
  system?: string;
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  /** Batas panjang jawaban (hemat token). */
  maxOutputTokens?: number;
  timeoutMs?: number;
}

async function callChatModel(model: string, turns: ChatTurn[], opts: ChatOptions) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY belum diisi", 500, "Fitur AI sedang dalam perbaikan. Coba lagi nanti ya.");

  const body: Record<string, unknown> = {
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 500,
      ...(opts.responseSchema ? { responseMimeType: "application/json", responseSchema: opts.responseSchema } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GeminiError(`[${model}] ${res.status}: ${json?.error?.message ?? res.statusText}`, res.status, friendly(res.status));
  }
  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new GeminiError(`[${model}] respons kosong`, 502, friendly(502));
  const usage: UsageInfo = {
    model,
    inputTokens: Number(json?.usageMetadata?.promptTokenCount ?? 0),
    outputTokens: Number(json?.usageMetadata?.candidatesTokenCount ?? 0) + Number(json?.usageMetadata?.thoughtsTokenCount ?? 0),
  };
  return { text, usage };
}

/** Chat berbilang giliran. Mengembalikan teks dan jumlah token yang dipakai. Cadangan model seperti generateText. */
export async function generateChat(turns: ChatTurn[], opts: ChatOptions = {}): Promise<{ text: string; usage: UsageInfo }> {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";
  try {
    return await callChatModel(primary, turns, opts);
  } catch (err) {
    const retriable =
      (err instanceof GeminiError && err.status >= 500) ||
      (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"));
    if (!retriable || fallback === primary) throw normalize(err);
    try {
      return await callChatModel(fallback, turns, { ...opts, timeoutMs: opts.timeoutMs ?? 45_000 });
    } catch (err2) {
      throw normalize(err2);
    }
  }
}

/**
 * Perkiraan biaya dalam rupiah. Harga per 1 juta token dan kurs bisa diatur lewat env
 * (GEMINI_PRICE_IN_USD, GEMINI_PRICE_OUT_USD, USD_IDR). Ini PERKIRAAN, cocokkan dengan tagihan asli.
 */
export function estimateCostIdr(u: UsageInfo): number {
  const pin = Number(process.env.GEMINI_PRICE_IN_USD ?? 0.1);
  const pout = Number(process.env.GEMINI_PRICE_OUT_USD ?? 0.4);
  const fx = Number(process.env.USD_IDR ?? 16500);
  return ((u.inputTokens * pin + u.outputTokens * pout) / 1_000_000) * fx;
}
