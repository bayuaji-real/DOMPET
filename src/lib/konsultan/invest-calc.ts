/** Kalkulator investasi (simulasi/ilustrasi, bukan janji hasil). Bunga majemuk bulanan dari return efektif per tahun. */
export interface InvestInput { initial: number; monthly: number; annualReturnPct: number; years: number }
export interface InvestMonth { month: number; contributed: number; value: number; gain: number }
export interface InvestResult { months: InvestMonth[]; years: InvestMonth[]; contributed: number; finalValue: number; gain: number }

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : lo);

export function simulateInvestment(input: InvestInput): InvestResult {
  const initial = clamp(input.initial, 0, 1e13);
  const monthly = clamp(input.monthly, 0, 1e12);
  const rate = clamp(input.annualReturnPct, -90, 200) / 100;
  const years = Math.floor(clamp(input.years, 0, 50));
  const mRate = Math.pow(1 + rate, 1 / 12) - 1;
  const months: InvestMonth[] = [];
  let value = initial;
  let contributed = initial;
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + mRate) + monthly; // setoran di akhir bulan
    contributed += monthly;
    months.push({ month: m, contributed: Math.round(contributed), value: Math.round(value), gain: Math.round(value - contributed) });
  }
  const yearly = months.filter((x) => x.month % 12 === 0);
  const last = months[months.length - 1] ?? { contributed: Math.round(initial), value: Math.round(initial), gain: 0, month: 0 };
  return { months, years: yearly, contributed: last.contributed, finalValue: last.value, gain: last.gain };
}

/** Return bulanan (%) -> setara per tahun (%), efektif. */
export function monthlyToAnnualPct(monthlyPct: number): number {
  return (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100;
}
