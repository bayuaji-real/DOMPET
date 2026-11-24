import { connection } from "next/server";
import { emptyAnalyticsData } from "@/lib/data/analytics";
import { Gate } from "@/components/plan/gate";
import { AnalisisClient } from "./analisis-client";

export const instant = false;

export default async function AnalisisPage() {
  // Dirender per permintaan (bukan saat build) karena memakai tanggal hari ini.
  await connection();
  // Halaman terbuka seketika; data asli dimuat layar sekali lewat /api/analytics
  // (sebelumnya dihitung dua kali: di server lalu di layar).
  return (
    <Gate feature="analisis" redirect>
      <AnalisisClient initialData={emptyAnalyticsData("month")} />
    </Gate>
  );
}
