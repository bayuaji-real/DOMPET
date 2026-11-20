import { getAnalyticsData } from "@/lib/data/analytics";
import { AnalisisClient } from "./analisis-client";

export const instant = false;

export default async function AnalisisPage() {
  const initialData = await getAnalyticsData({ period: "month" });

  return <AnalisisClient initialData={initialData} />;
}

