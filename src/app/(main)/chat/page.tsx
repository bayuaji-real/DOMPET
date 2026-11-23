"use client";

import { TopHeader } from "@/components/layout/top-header";
import { AiChat } from "@/components/ai/ai-chat";

export default function ChatKeuanganPage() {
  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-1 flex-col">
      <TopHeader title="Tanya Keuangan" subtitle="Konsultasi dengan AI berdasarkan datamu" />
      <div className="min-h-0 flex-1">
        <AiChat
          mode="advisor"
          intro="Halo! Tanya apa saja soal uangmu. Aku menjawab berdasarkan ringkasan pemasukan, pengeluaran, dompet, dan tabunganmu. Aku bukan penasihat keuangan berlisensi."
          placeholder="Misal: aman nggak beli HP 3 juta bulan ini?"
          suggestions={["Pengeluaran terbesarku apa?", "Aman nggak beli HP 3 juta?", "Bagaimana kondisi keuanganku?"]}
        />
      </div>
    </div>
  );
}
