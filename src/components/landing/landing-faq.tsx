"use client";

import * as React from "react";
import { ChevronDown, HelpCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Apakah Dompetku meminta akses, PIN, atau password mobile banking saya?",
    answer:
      "Sama sekali TIDAK. Dompetku menganut prinsip privasi ketat 'Zero-Credential Risk'. Kami tidak pernah meminta username, PIN, kode OTP, ataupun password rekening bank Anda. Rekening Anda 100% aman karena pencatatan dilakukan secara cerdas melalui foto struk belanjaan dan pesan suara santai.",
  },
  {
    question: "Bagaimana cara memasang (install) Dompetku di HP iPhone atau Android?",
    answer:
      "Dompetku dirancang sangat ringan (<5MB) dan tidak butuh unduh memori besar dari App Store / Play Store:\n• Di iPhone: Buka website ini di Safari, ketuk tombol Share (ikon kotak dengan panah ke atas), lalu pilih 'Add to Home Screen' (Tambahkan ke Layar Utama).\n• Di Android: Buka di Google Chrome, ketuk ikon titik tiga di kanan atas, lalu pilih 'Pasang Aplikasi' atau 'Tambahkan ke Layar Utama'.\nDompetku akan langsung tampil di beranda HP Anda layaknya aplikasi native.",
  },
  {
    question: "Bagaimana cara kerja uji coba gratis 7 hari (Trial)?",
    answer:
      "Setelah Anda membuat akun, Anda dapat langsung mengaktifkan uji coba gratis paket Pro selama 7 hari penuh di halaman Paket. Tidak memerlukan nomor kartu kredit dan tidak ada biaya tersembunyi. Anda bisa bebas mencoba fitur Scan Struk AI, Voice Note, dan konsultasi dengan Ruby sepuasnya.",
  },
  {
    question: "Apakah data transaksi saya privat dan tidak dijual ke pihak ketiga?",
    answer:
      "100% Privat. Database kami dipagari dengan teknologi Row Level Security (RLS) PostgreSQL kelas enterprise, memastikan hanya akun Anda yang memiliki akses kunci untuk membaca data Anda sendiri. Kami tidak pernah menjual data atau profil belanja pengguna ke platform periklanan, pinjol, atau pihak ketiga manapun.",
  },
  {
    question: "Apakah data saya bisa diekspor ke Microsoft Excel atau Google Sheets?",
    answer:
      "Bisa banget! Kapan pun Anda butuh, Anda bisa membuka menu Pengaturan lalu mengunduh riwayat transaksi ke format CSV (dengan enkoding UTF-8 BOM agar angka rupiah dan tanggal langsung rapi di Excel tanpa kendala karakter aneh). Anda juga bisa mengunduh Full Backup akun dalam format JSON sekali klik.",
  },
  {
    question: "Bagaimana sistem pembayaran untuk berlangganan Pro?",
    answer:
      "Pembayaran sangat mudah menggunakan standar QRIS nasional. Anda bisa membayar dari aplikasi m-banking bank mana saja (BCA, Mandiri, BRI, BNI, CIMB, dll) atau dompet digital (GoPay, OVO, ShopeePay, Dana). Tanpa langganan kartu kredit otomatis yang memotong saldo diam-diam—semua atas kendali Anda.",
  },
];

export function LandingFaq() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 border-t border-border/80 bg-muted/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-3 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/25">
            <HelpCircle className="size-3.5" />
            <span>Tanya Jawab Seputar Dompetku</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Semua yang perlu kamu ketahui tentang keamanan, kemudahan install, dan cara kerja Dompetku.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-extrabold text-sm sm:text-base text-foreground">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-teal-600 dark:text-teal-400"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/40 animate-in fade-in duration-200">
                    <p className="pt-3">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Help Banner */}
        <div className="mt-10 p-5 rounded-2xl bg-card border border-border/80 text-center space-y-2">
          <p className="text-xs font-bold text-foreground">Masih ada pertanyaan lain yang belum terjawab?</p>
          <p className="text-xs text-muted-foreground">
            Buka menu Bantuan di dalam aplikasi atau hubungi kami untuk panduan lebih lanjut.
          </p>
        </div>
      </div>
    </section>
  );
}
