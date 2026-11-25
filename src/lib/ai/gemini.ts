/**
 * Pemanggil Gemini API — HANYA untuk server (Route Handler / Server Action).
 * Jangan di-import dari komponen "use client": GEMINI_API_KEY tidak boleh sampai ke browser.
 *
 * Env:
 *   GEMINI_API_KEY          kunci dari Google AI Studio (Free tier)
 *   GEMINI_MODEL            model utama  (default: gemini-3.5-flash-lite)
 *   GEMINI_FALLBACK_MODEL   dipakai kalau model utama sibuk/error 5xx (default: gemini-flash-latest)
 *   GEMINI_FALLBACK_MODEL_2 cadangan kedua (default: gemini-flash-lite-latest)
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
  if (status === 401 || status === 403) return "Fitur Ruby sedang dalam perbaikan. Coba lagi nanti ya.";
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
  const usage: UsageInfo = {
    model,
    inputTokens: Number(json?.usageMetadata?.promptTokenCount ?? 0),
    outputTokens: Number(json?.usageMetadata?.candidatesTokenCount ?? 0) + Number(json?.usageMetadata?.thoughtsTokenCount ?? 0),
  };
  return { text, usage };
}


// ---------------------------------------------------------------------------
// Ulang otomatis + model cadangan (503 "model sedang ramai", 429, timeout)
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetriable(err: unknown): boolean {
  if (err instanceof GeminiError) return err.status === 429 || err.status >= 500;
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

/** Model yang dicoba berurutan: utama, cadangan, cadangan kedua (tanpa duplikat). */
function modelChain(): string[] {
  const list = [
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest",
    process.env.GEMINI_FALLBACK_MODEL_2 || "gemini-flash-lite-latest",
  ];
  return list.filter((m, i) => m && list.indexOf(m) === i);
}

/**
 * Tiap model dicoba maksimal 2 kali (jeda singkat), lalu pindah ke model berikutnya.
 * Pindah model juga dilakukan bila model tidak ditemukan (404). Error lain (mis. 400) langsung dilempar.
 */
async function withFallback<T>(call: (model: string, attempt: number) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const model of modelChain()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await call(model, attempt);
      } catch (err) {
        lastErr = err;
        const missing = err instanceof GeminiError && err.status === 404;
        if (missing) break; // model tidak ada: langsung ke cadangan
        if (!isRetriable(err)) throw normalize(err);
        if (attempt === 0) await sleep(700);
      }
    }
  }
  throw normalize(lastErr);
}

/**
 * Kirim teks/gambar/audio ke Gemini. Kalau model sibuk (5xx/429/timeout), diulang sekali dengan jeda,
 * lalu pindah ke model cadangan.
 */
export async function generateText(parts: GeminiPart[], opts: GenerateOptions = {}): Promise<string> {
  return (await generateTextWithUsage(parts, opts)).text;
}

/** Sama seperti generateText, tapi juga mengembalikan jumlah token (untuk catatan biaya). */
export async function generateTextWithUsage(parts: GeminiPart[], opts: GenerateOptions = {}): Promise<{ text: string; usage: UsageInfo }> {
  return withFallback((model) => callModel(model, parts, { ...opts, timeoutMs: opts.timeoutMs ?? 20_000 }));
}

const usageMap = new WeakMap<object, UsageInfo>();
/** Ambil jumlah token dari hasil generateJson (disimpan tersembunyi, tidak ikut terkirim ke pengguna). */
export function usageOf(x: unknown): UsageInfo | undefined {
  return x && typeof x === "object" ? usageMap.get(x as object) : undefined;
}

/** Sama seperti generateText, tapi langsung mengembalikan objek JSON hasil parse. */
export async function generateJson<T>(parts: GeminiPart[], opts: GenerateOptions & { responseSchema: Record<string, unknown> }): Promise<T> {
  const { text, usage } = await generateTextWithUsage(parts, opts);
  try {
    // Toleran pada pagar kode atau teks di luar JSON.
    const cleaned = text.replace(/```(?:json)?/gi, "").trim();
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(a !== -1 && b > a ? cleaned.slice(a, b + 1) : cleaned) as T;
    if (parsed && typeof parsed === "object") usageMap.set(parsed as object, usage);
    return parsed;
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
  if (!key) throw new GeminiError("GEMINI_API_KEY belum diisi", 500, "Fitur Ruby sedang dalam perbaikan. Coba lagi nanti ya.");

  const body: Record<string, unknown> = {
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      // Tanpa batas bila tidak diisi (jawaban JSON jangan sampai terpotong).
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
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
  return withFallback((model) => callChatModel(model, turns, { ...opts, timeoutMs: opts.timeoutMs ?? 20_000 }));
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
