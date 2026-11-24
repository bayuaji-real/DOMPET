// Teori dan hitungan keuangan pribadi (murni). Semua hasil berupa ILUSTRASI dari asumsi yang kamu isi, bukan jaminan atau rekomendasi produk.

export type AllocationRule = { id: string; name: string; parts: { label: string; pct: number; hint: string }[]; note: string };

export const ALLOCATION_RULES: AllocationRule[] = [
  { id: "50-30-20", name: "50/30/20", note: "Paling umum untuk pemula (dipopulerkan Elizabeth Warren). Cocok kalau cicilan utang tidak besar.",
    parts: [{ label: "Kebutuhan", pct: 50, hint: "Sewa/kos, makan, transport, tagihan, cicilan wajib" }, { label: "Keinginan", pct: 30, hint: "Hiburan, jajan, langganan, belanja" }, { label: "Tabungan & investasi", pct: 20, hint: "Dana darurat, tabungan target, investasi, tambahan bayar utang" }] },
  { id: "70-20-10", name: "70/20/10", note: "Cocok kalau pendapatan masih kecil dan kebutuhan besar.",
    parts: [{ label: "Hidup sehari-hari", pct: 70, hint: "Kebutuhan dan keinginan" }, { label: "Tabungan & investasi", pct: 20, hint: "Dana darurat dan investasi" }, { label: "Utang / berbagi", pct: 10, hint: "Bayar utang lebih cepat, zakat/sedekah" }] },
  { id: "80-20", name: "Bayar diri sendiri dulu (80/20)", note: "Sisihkan 20% begitu gajian, sisanya baru dibelanjakan. Sederhana dan mudah dijaga.",
    parts: [{ label: "Disisihkan dulu", pct: 20, hint: "Pindahkan otomatis di hari gajian" }, { label: "Boleh dibelanjakan", pct: 80, hint: "Semua pengeluaran" }] },
  { id: "60-jar", name: "6 pos (60% kebutuhan)", note: "Membagi uang ke beberapa pos supaya tujuan jelas.",
    parts: [{ label: "Kebutuhan", pct: 55, hint: "Pengeluaran wajib" }, { label: "Tabungan jangka panjang", pct: 10, hint: "Rumah, pensiun" }, { label: "Pendidikan", pct: 10, hint: "Kursus, buku" }, { label: "Hiburan", pct: 10, hint: "Rekreasi" }, { label: "Kebebasan finansial", pct: 10, hint: "Investasi" }, { label: "Berbagi", pct: 5, hint: "Zakat, sedekah" }] },
];

export function allocate(income: number, rule: AllocationRule): { label: string; pct: number; amount: number; hint: string }[] {
  const inc = Math.max(0, Math.round(income));
  const out = rule.parts.map((p) => ({ ...p, amount: Math.floor((inc * p.pct) / 100) }));
  const rest = inc - out.reduce((s, x) => s + x.amount, 0);
  if (out.length && rest > 0) out[0].amount += rest; // sisa pembulatan masuk pos pertama
  return out;
}

export type Household = "lajang" | "menikah" | "menikah_anak" | "freelance";
const EMERGENCY_MONTHS: Record<Household, [number, number]> = { lajang: [3, 6], menikah: [6, 9], menikah_anak: [9, 12], freelance: [6, 12] };
export function emergencyFund(monthlyExpense: number, kind: Household, current = 0): { minMonths: number; maxMonths: number; minAmount: number; maxAmount: number; coveredMonths: number; gapToMin: number } {
  const [a, b] = EMERGENCY_MONTHS[kind], e = Math.max(0, monthlyExpense);
  return { minMonths: a, maxMonths: b, minAmount: e * a, maxAmount: e * b, coveredMonths: e > 0 ? Math.round((current / e) * 10) / 10 : 0, gapToMin: Math.max(0, e * a - Math.max(0, current)) };
}

export type PensionInput = {
  age: number; retireAge: number; lifeExpectancy: number;
  monthlyExpenseToday: number;   // kebutuhan bulanan setelah pensiun, dalam harga hari ini
  otherPensionMonthlyToday: number; // perkiraan pensiun lain (JP BPJS, DPLK) per bulan, harga hari ini
  inflationPct: number; returnBeforePct: number; returnAfterPct: number;
  currentSavings: number;
};
export type PensionResult = { valid: boolean; error?: string; yearsToRetire: number; yearsInRetirement: number; expenseAtRetirementMonthly: number; corpusNeeded: number; savingsFutureValue: number; shortfall: number; monthlySaving: number };

export function pensionPlan(i: PensionInput): PensionResult {
  const empty = { yearsToRetire: 0, yearsInRetirement: 0, expenseAtRetirementMonthly: 0, corpusNeeded: 0, savingsFutureValue: 0, shortfall: 0, monthlySaving: 0 };
  if (!(i.age >= 15 && i.age < i.retireAge)) return { valid: false, error: "Usia pensiun harus lebih besar dari usiamu sekarang.", ...empty };
  if (!(i.lifeExpectancy > i.retireAge)) return { valid: false, error: "Perkiraan usia hidup harus lebih besar dari usia pensiun.", ...empty };
  if (i.monthlyExpenseToday <= 0) return { valid: false, error: "Isi kebutuhan bulanan setelah pensiun.", ...empty };
  const n = i.retireAge - i.age, m = i.lifeExpectancy - i.retireAge;
  const inf = i.inflationPct / 100, rb = i.returnBeforePct / 100, ra = i.returnAfterPct / 100;
  const netToday = Math.max(0, i.monthlyExpenseToday - Math.max(0, i.otherPensionMonthlyToday));
  const annualAtRetire = netToday * 12 * Math.pow(1 + inf, n);
  // Nilai pada saat pensiun dari pengeluaran tahunan yang naik mengikuti inflasi, dengan imbal hasil setelah pensiun.
  const real = (1 + ra) / (1 + inf) - 1;
  const factor = Math.abs(real) < 1e-9 ? m : (1 - Math.pow(1 + real, -m)) / real;
  const corpus = annualAtRetire * factor;
  const fvSavings = Math.max(0, i.currentSavings) * Math.pow(1 + rb, n);
  const shortfall = Math.max(0, corpus - fvSavings);
  const rm = Math.pow(1 + rb, 1 / 12) - 1, months = n * 12;
  const monthly = shortfall <= 0 ? 0 : rm === 0 ? shortfall / months : (shortfall * rm) / (Math.pow(1 + rm, months) - 1);
  return { valid: true, yearsToRetire: n, yearsInRetirement: m, expenseAtRetirementMonthly: netToday * Math.pow(1 + inf, n), corpusNeeded: corpus, savingsFutureValue: fvSavings, shortfall, monthlySaving: Math.ceil(monthly) };
}

/** Aturan 72: perkiraan tahun uang berlipat pada imbal hasil tahunan (persen). */
export function doublingYears(ratePct: number): number | null { return ratePct > 0 ? 72 / ratePct : null; }
/** Imbal hasil tahunan (persen) yang dibutuhkan agar uang berlipat dalam sekian tahun. */
export function rateToDouble(years: number): number | null { return years > 0 ? 72 / years : null; }

/** Angka kebebasan finansial: pengeluaran tahunan dibagi tingkat penarikan (aturan 4% = 25x). */
export function fireNumber(monthlyExpense: number, withdrawalPct = 4): number { return withdrawalPct > 0 ? (Math.max(0, monthlyExpense) * 12) / (withdrawalPct / 100) : 0; }

/** Harga di masa depan dan daya beli uang sekarang akibat inflasi. */
export function inflationEffect(amount: number, inflationPct: number, years: number): { futureCost: number; powerLeft: number } {
  const f = Math.pow(1 + inflationPct / 100, Math.max(0, years));
  return { futureCost: amount * f, powerLeft: f > 0 ? amount / f : amount };
}

export const PRINSIP: { title: string; body: string }[] = [
  { title: "Dana darurat dulu, baru investasi", body: "Siapkan cadangan 3 sampai 12 bulan pengeluaran (tergantung status) sebelum menaruh uang di investasi yang nilainya bisa turun." },
  { title: "Bayar diri sendiri dulu", body: "Pindahkan tabungan di hari gajian, bukan menabung dari sisa. Otomatiskan supaya tidak bergantung pada niat." },
  { title: "Lunasi utang berbunga tinggi", body: "Utang kartu kredit dan paylater berbunga jauh di atas imbal hasil investasi wajar. Lunasi dulu. Lihat tab Utang di Konsultan." },
  { title: "Bunga majemuk butuh waktu", body: "Mulai lebih awal lebih berpengaruh daripada nominal besar yang terlambat. Cek di kalkulator Investasi." },
  { title: "Sebar, jangan satu keranjang", body: "Jangan menaruh seluruh uang di satu produk. Pahami risiko tiap produk sebelum memilih." },
  { title: "Beli bertahap (DCA)", body: "Menyisihkan nominal tetap tiap bulan mengurangi risiko salah waktu masuk. Ini bukan jaminan untung." },
  { title: "Gaya hidup jangan naik sebanding gaji", body: "Saat gaji naik, naikkan persentase tabungan lebih dulu sebelum menaikkan pengeluaran." },
  { title: "Cek asuransi dasar", body: "Perlindungan kesehatan (BPJS atau swasta) mencegah satu sakit menghabiskan dana darurat dan tabunganmu." },
];
