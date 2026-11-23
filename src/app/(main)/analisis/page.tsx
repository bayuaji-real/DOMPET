import { emptyAnalyticsData } from "@/lib/data/analytics";
import { AnalisisClient } from "./analisis-client";

export const instant = false;

export default function AnalisisPage() {
  // Halaman terbuka seketika; data asli dimuat layar sekali lewat /api/analytics
  // (sebelumnya dihitung dua kali: di server lalu di layar).
  return <AnalisisClient initialData={emptyAnalyticsData("month")} />;
}
