import { connection } from "next/server";
import { getAnalyticsData } from "@/lib/data/analytics";
import { AnalisisClient } from "./analisis-client";

export const instant = false;

export default async function AnalisisPage() {
  // Dirender per permintaan (bukan saat build) supaya "hari ini" selalu tanggal sebenarnya.
  await connection();
  const initialData = await getAnalyticsData({ period: "month" });

  return <AnalisisClient initialData={initialData} />;
}
