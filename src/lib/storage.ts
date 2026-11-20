import { createClient } from "@/lib/supabase/client";

export interface UploadReceiptResult {
  path: string | null;
  signedUrl: string | null;
  error?: string;
}

/**
 * Format tanggal YYYY-MM-DD zona waktu Asia/Jakarta (WIB)
 */
function getTanggalWIBString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "11";
  const d = parts.find((p) => p.type === "day")?.value || "20";
  return `${y}-${m}-${d}`;
}

/**
 * Upload foto struk ke Supabase Storage bucket privat 'receipts'
 * Format path wajib: {user_id}/{tanggal_YYYY-MM-DD}/{uuid}.jpg
 */
export async function uploadReceipt(
  userId: string,
  file: Blob | File,
  customDate?: Date
): Promise<UploadReceiptResult> {
  const supabase = createClient();
  const tanggal = getTanggalWIBString(customDate || new Date());
  const fileUuid = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const path = `${userId}/${tanggal}/${fileUuid}.jpg`;

  try {
    const { data, error } = await supabase.storage
      .from("receipts")
      .upload(path, file, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.warn("Peringatan upload Supabase Storage (receipts):", error.message);
      return {
        path: null,
        signedUrl: null,
        error: error.message,
      };
    }

    // Buat signed URL (berlaku 1 jam) agar foto privat bisa ditampilkan
    const { data: signedData } = await supabase.storage
      .from("receipts")
      .createSignedUrl(data.path, 3600);

    return {
      path: data.path,
      signedUrl: signedData?.signedUrl || null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal upload struk";
    console.warn("Storage upload exception:", message);
    return {
      path: null,
      signedUrl: null,
      error: message,
    };
  }
}

/**
 * Dapatkan Signed URL untuk menampilkan struk yang tersimpan di bucket privat 'receipts'
 */
export async function getReceiptSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  const supabase = createClient();

  try {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.warn(`Gagal membuat signed URL untuk path ${path}:`, error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.warn("Gagal membuat signed URL:", err);
    return null;
  }
}
