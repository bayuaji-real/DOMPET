// Dana-dana kebutuhan hidup selain pensiun dan dana darurat (murni angka, bisa dites).
export type FundType = { id: string; name: string; desc: string; inflation: number; returnPct: number; years: number; tips: string[] };

export const FUND_TYPES: FundType[] = [
  { id: "kesehatan", name: "Dana kesehatan", desc: "Cadangan untuk biaya berobat yang tidak ditanggung asuransi atau BPJS.", inflation: 10, returnPct: 5, years: 5,
    tips: ["Pastikan BPJS Kesehatan aktif dan iurannya tidak menunggak.", "Kalau memakai asuransi swasta, premi bisa naik tiap tahun dan makin mahal saat usia bertambah. Bandingkan manfaat dan batas tahunan.", "Simpan dana ini terpisah dari dana darurat supaya tidak terpakai untuk hal lain.", "Biaya kesehatan biasanya naik lebih cepat dari inflasi umum, jadi angka kenaikan di sini sengaja dibuat lebih tinggi. Ubah sesuai kondisimu."] },
  { id: "pendidikan", name: "Dana pendidikan anak", desc: "Biaya sekolah dan kuliah anak: uang pangkal, SPP, buku, dan kebutuhan lain.", inflation: 8, returnPct: 6, years: 10,
    tips: ["Isi biaya yang kamu perkirakan hari ini, lalu hitung kenaikannya sampai anak masuk sekolah atau kuliah.", "Makin jauh waktunya, makin boleh memakai instrumen yang bertumbuh, tapi makin dekat jatuh tempo, pindahkan ke yang aman.", "Cek juga beasiswa dan biaya per jenjang, jangan hanya satu jenjang.", "Kenaikan biaya pendidikan biasanya di atas inflasi umum. Ubah angkanya sesuai sekolah yang kamu tuju."] },
  { id: "nikah", name: "Dana menikah", desc: "Biaya acara, seserahan, mas kawin, dan persiapan awal berumah tangga.", inflation: 5, returnPct: 5, years: 2,
    tips: ["Untuk daftar vendor dan tamu yang lebih rinci, pakai menu Planner Acara.", "Sisihkan juga dana awal rumah tangga: sewa atau DP, perabot, dan dana darurat berdua."] },
  { id: "rumah", name: "DP rumah", desc: "Uang muka, biaya notaris, pajak, dan biaya pindah.", inflation: 6, returnPct: 5, years: 5,
    tips: ["Siapkan DP sekitar 10 sampai 30 persen harga, tergantung syarat bank, ditambah biaya notaris dan pajak.", "Cicilan KPR sebaiknya tidak lebih dari sekitar sepertiga pemasukan.", "Harga properti cenderung naik tiap tahun, jadi makin lama menunda, makin besar DP yang dibutuhkan."] },
  { id: "kendaraan", name: "Kendaraan", desc: "DP atau pembelian tunai motor atau mobil, termasuk pajak dan asuransi.", inflation: 4, returnPct: 5, years: 2,
    tips: ["Hitung juga biaya tahunan: pajak, servis, asuransi, dan bensin.", "Lebih baik DP besar supaya cicilan dan bunganya kecil."] },
  { id: "ibadah", name: "Ibadah dan perjalanan jauh", desc: "Umrah, haji, atau liburan besar keluarga.", inflation: 6, returnPct: 5, years: 3,
    tips: ["Biaya perjalanan ke luar negeri ikut naik saat kurs dolar naik. Beri ruang cadangan.", "Untuk haji, cek biaya dan antrean resmi di kanal pemerintah."] },
  { id: "usaha", name: "Modal usaha", desc: "Modal awal usaha, stok, dan cadangan beberapa bulan pertama.", inflation: 4, returnPct: 4, years: 2,
    tips: ["Pisahkan uang usaha dari uang pribadi sejak awal.", "Siapkan cadangan biaya operasional 3 sampai 6 bulan sebelum usaha menghasilkan stabil."] },
  { id: "orangtua", name: "Dana untuk orang tua", desc: "Bantuan bulanan, biaya kesehatan, atau persiapan hari tua orang tua.", inflation: 5, returnPct: 4, years: 5,
    tips: ["Bicarakan jumlah dan kebutuhan dengan keluarga lain supaya bebannya terbagi.", "Cek apakah orang tua punya BPJS dan dana pensiun sendiri."] },
  { id: "lainnya", name: "Dana lainnya", desc: "Gadget, renovasi, atau tujuan lain yang butuh dana besar.", inflation: 4, returnPct: 4, years: 2, tips: ["Untuk barang yang akan dibeli, menu Target Beli bisa menghitung tunai dan cicilan."] },
];

export type FundInput = { costNow: number; years: number; inflationPct: number; returnPct: number; saved: number };
export type FundResult = { valid: boolean; futureCost: number; savedFuture: number; gap: number; monthlySaving: number; months: number };

export function fundPlan(i: FundInput): FundResult {
  if (!(i.costNow > 0) || !(i.years > 0)) return { valid: false, futureCost: 0, savedFuture: 0, gap: 0, monthlySaving: 0, months: 0 };
  const months = Math.max(1, Math.round(i.years * 12));
  const futureCost = i.costNow * Math.pow(1 + i.inflationPct / 100, i.years);
  const r = i.returnPct / 100 / 12;
  const savedFuture = Math.max(0, i.saved) * Math.pow(1 + r, months);
  const gap = Math.max(0, futureCost - savedFuture);
  const monthlySaving = gap === 0 ? 0 : r > 0 ? (gap * r) / (Math.pow(1 + r, months) - 1) : gap / months;
  return { valid: true, futureCost: Math.round(futureCost), savedFuture: Math.round(savedFuture), gap: Math.round(gap), monthlySaving: Math.ceil(monthlySaving), months };
}
