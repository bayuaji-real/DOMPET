"use client";

import { TopHeader } from "@/components/layout/top-header";
import { AiChat } from "@/components/ai/ai-chat";

export default function ChatKeuanganPage() {
  return (
    <div className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] flex-col bg-background" style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 1.25rem) + 3.75rem)" }}>
      <TopHeader title="Tanya Keuangan" subtitle="Konsultasi dengan AI berdasarkan datamu" />
      <div className="min-h-0 flex-1">
        <AiChat
          mode="advisor"
          showMenu
          intro="Tanya apa saja soal uangmu. Aku menjawab berdasarkan ringkasan pemasukan, pengeluaran, dompet, dan tabunganmu."
          placeholder="Misal: aman nggak beli HP 3 juta bulan ini?"
          suggestions={["Pengeluaran terbesarku apa?", "Aman nggak beli HP 3 juta?", "Bagaimana kondisi keuanganku?"]}
        />
      </div>
    </div>
  );
}
