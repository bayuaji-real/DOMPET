/**
 * Utilitas Parser Transaksi Suara & Kalimat Bebas (Phase 5)
 */

export interface VoiceTransactionItem {
  type: "income" | "expense" | "transfer";
  amount: number;
  wallet_name: string;
  category_name: string;
  note: string;
  date: string; // YYYY-MM-DD
}

/**
 * Konversi angka lisan & bahasa gaul Indonesia ke angka integer rupiah.
 * Mendukung: goceng, ceban, noban, gocap, cepek, seceng, gopek,
 * "1,5 juta", "2.5 jt", "200 rebu", "15rb", "dua setengah juta".
 */
export function parseIndonesianSpokenNumber(input: string): number {
  if (!input) return 0;
  const clean = input.toLowerCase().trim();

  // Cek kata gaul tunggal
  const slangMap: Record<string, number> = {
    gopek: 500,
    seceng: 1000,
    goceng: 5000,
    ceban: 10000,
    noban: 20000,
    gocap: 50000,
    cepek: 100000, // dalam percakapan sehari-hari keuangan sering berarti 100rb
    "cepek ceng": 100000,
    pekgo: 150,
  };

  if (slangMap[clean]) {
    return slangMap[clean];
  }

  // Cek pola "X juta" / "X,Y juta" / "X.Y jt"
  const jutaMatch = clean.match(/([\d.,]+)\s*(?:juta|jt)\b/);
  if (jutaMatch) {
    const numPart = parseFloat(jutaMatch[1].replace(",", "."));
    if (!isNaN(numPart)) {
      return Math.round(numPart * 1_000_000);
    }
  }

  // Cek kata "dua setengah juta" atau "satu setengah juta"
  if (clean.includes("dua setengah juta") || clean.includes("dua koma lima juta")) {
    return 2_500_000;
  }
  if (clean.includes("satu setengah juta") || clean.includes("satu koma lima juta")) {
    return 1_500_000;
  }
  if (clean.includes("tiga setengah juta")) {
    return 3_500_000;
  }

  // Cek pola "X rebu" / "X ribu" / "X rb" / "X k"
  const ribuMatch = clean.match(/([\d.,]+)\s*(?:ribu|rebu|rb|k)\b/);
  if (ribuMatch) {
    const numPart = parseFloat(ribuMatch[1].replace(",", "."));
    if (!isNaN(numPart)) {
      return Math.round(numPart * 1_000);
    }
  }

  // Cek kata-kata "lima belas ribu", "dua puluh ribu", "seratus ribu", dsb
  const wordMap: Record<string, number> = {
    "sepuluh ribu": 10000,
    "lima belas ribu": 15000,
    "dua puluh ribu": 20000,
    "dua puluh lima ribu": 25000,
    "tiga puluh ribu": 30000,
    "tiga puluh lima ribu": 35000,
    "empat puluh ribu": 40000,
    "lima puluh ribu": 50000,
    "tujuh puluh lima ribu": 75000,
    "seratus ribu": 100000,
    "seratus lima puluh ribu": 150000,
    "dua ratus ribu": 200000,
    "dua ratus rebu": 200000,
    "dua ratus lima puluh ribu": 250000,
    "lima ratus ribu": 500000,
    "satu juta": 1000000,
    "dua juta": 2000000,
    "dua setengah juta": 2500000,
    "tiga juta": 3000000,
    "lima juta": 5000000,
    "sepuluh juta": 10000000,
  };

  for (const [k, v] of Object.entries(wordMap)) {
    if (clean.includes(k)) {
      return v;
    }
  }

  // Cek angka murni dengan titik atau tanpa titik
  const digitsOnly = clean.replace(/[^\d]/g, "");
  if (digitsOnly) {
    return parseInt(digitsOnly, 10);
  }

  return 0;
}

/**
 * Konversi kata waktu relatif Indonesia ke format YYYY-MM-DD
 * Contoh: "tadi pagi" -> baseDate
 * "kemarin" -> baseDate - 1 hari
 * "kemarin lusa" -> baseDate - 2 hari
 */
export function resolveRelativeDate(phrase: string, baseDate = new Date()): string {
  const clean = phrase.toLowerCase().trim();
  const d = new Date(baseDate.getTime());

  if (clean.includes("kemarin lusa") || clean.includes("2 hari lalu") || clean.includes("dua hari lalu")) {
    d.setDate(d.getDate() - 2);
  } else if (clean.includes("kemarin") || clean.includes("semalam")) {
    d.setDate(d.getDate() - 1);
  } else {
    // "tadi", "tadi pagi", "tadi siang", "tadi malam", "hari ini"
    // tetap baseDate
  }

  return d.toISOString().split("T")[0];
}

/**
 * Cari dompet yang paling cocok dari teks berdasarkan daftar dompet pengguna.
 */
export function matchWallet(
  text: string,
  userWallets: { id: string; name: string }[],
  defaultWalletId?: string
): { id: string; name: string } {
  if (!userWallets || userWallets.length === 0) {
    return { id: "default", name: "Uang Tunai" };
  }

  const clean = text.toLowerCase();

  // Cari yang namanya disebut dalam kalimat
  for (const w of userWallets) {
    const wName = w.name.toLowerCase();
    // Jika ada di teks (misal "gopay", "bca", "mandiri")
    if (clean.includes(wName)) {
      return w;
    }
    // Cek alias umum (misal "tunai" cocok ke "Uang Tunai")
    if (wName.includes("tunai") && (clean.includes("cash") || clean.includes("tunai"))) {
      return w;
    }
    if (wName.includes("bca") && clean.includes("bca")) {
      return w;
    }
    if (wName.includes("gopay") && clean.includes("gopay")) {
      return w;
    }
    if (wName.includes("mandiri") && clean.includes("mandiri")) {
      return w;
    }
    if (wName.includes("jago") && clean.includes("jago")) {
      return w;
    }
    if (wName.includes("ovo") && clean.includes("ovo")) {
      return w;
    }
    if (wName.includes("dana") && clean.includes("dana")) {
      return w;
    }
  }

  // Jika tidak ditemukan, pakai default atau dompet pertama (Uang Tunai)
  if (defaultWalletId) {
    const found = userWallets.find((w) => w.id === defaultWalletId);
    if (found) return found;
  }

  const tunaiWallet = userWallets.find((w) => /tunai/i.test(w.name));
  return tunaiWallet || userWallets[0];
}

/**
 * Cari kategori yang paling cocok dari teks berdasarkan kata kunci umum Indonesia.
 */
export function matchCategory(
  text: string,
  userCategories: { id: string; name: string }[]
): { id: string; name: string } {
  if (!userCategories || userCategories.length === 0) {
    return { id: "default", name: "Lainnya" };
  }

  const clean = text.toLowerCase();

  // Makanan & Minuman
  if (
    clean.includes("makan") ||
    clean.includes("minum") ||
    clean.includes("bakso") ||
    clean.includes("kopi") ||
    clean.includes("nasi") ||
    clean.includes("resto") ||
    clean.includes("kafe") ||
    clean.includes("cafe")
  ) {
    const cat = userCategories.find((c) => /makan|minum/i.test(c.name));
    if (cat) return cat;
  }

  // Transportasi
  if (
    clean.includes("bensin") ||
    clean.includes("pertalite") ||
    clean.includes("pertamax") ||
    clean.includes("ojol") ||
    clean.includes("gojek") ||
    clean.includes("grab") ||
    clean.includes("parkir") ||
    clean.includes("tol") ||
    clean.includes("kereta") ||
    clean.includes("angkot")
  ) {
    const cat = userCategories.find((c) => /trans/i.test(c.name));
    if (cat) return cat;
  }

  // Tagihan
  if (
    clean.includes("listrik") ||
    clean.includes("pln") ||
    clean.includes("air") ||
    clean.includes("pdam") ||
    clean.includes("pulsa") ||
    clean.includes("paket data") ||
    clean.includes("wifi") ||
    clean.includes("indihome") ||
    clean.includes("tagihan")
  ) {
    const cat = userCategories.find((c) => /tagih/i.test(c.name));
    if (cat) return cat;
  }

  // Gaji & Pemasukan
  if (
    clean.includes("gaji") ||
    clean.includes("gajian") ||
    clean.includes("bonus") ||
    clean.includes("upah") ||
    clean.includes("thr") ||
    clean.includes("transferan masuk")
  ) {
    const cat = userCategories.find((c) => /gaji|masuk|pemasukan/i.test(c.name));
    if (cat) return cat;
  }

  // Belanja
  if (
    clean.includes("belanja") ||
    clean.includes("mart") ||
    clean.includes("indomaret") ||
    clean.includes("alfamart") ||
    clean.includes("pasar") ||
    clean.includes("sayur")
  ) {
    const cat = userCategories.find((c) => /belanja/i.test(c.name));
    if (cat) return cat;
  }

  // Hiburan
  if (
    clean.includes("bioskop") ||
    clean.includes("nonton") ||
    clean.includes("game") ||
    clean.includes("hiburan") ||
    clean.includes("karaoke")
  ) {
    const cat = userCategories.find((c) => /hibur/i.test(c.name));
    if (cat) return cat;
  }

  // Fallback ke kategori pertama atau Lainnya
  const otherCat = userCategories.find((c) => /lain/i.test(c.name));
  return otherCat || userCategories[0];
}
