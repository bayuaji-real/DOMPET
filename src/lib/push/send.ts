import { setVapidDetails, sendNotification } from "web-push";
import type { PushMsg } from "./alerts";

export type Sub = { endpoint: string; p256dh: string; auth: string };

/** Menyiapkan kunci VAPID dari env. Mengembalikan false kalau belum diisi. */
export function configurePush(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@dompetku.app", pub, priv);
  return true;
}

/** "gone" artinya perangkat sudah tidak berlangganan (hapus dari database). */
export async function sendPush(sub: Sub, msg: PushMsg): Promise<"ok" | "gone" | "error"> {
  try {
    await sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 12 });
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return code === 404 || code === 410 ? "gone" : "error";
  }
}
