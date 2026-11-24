// Hitungan murni untuk Planner Acara (lamaran/nikah). Tanpa akses database.
export type Side = "pria" | "wanita" | "umum";
export type ItemKind = "vendor" | "seserahan" | "lainnya";
export type PItem = { id: string; kind: ItemKind; name: string; planned_cost: number; status: string; needed_date: string | null; side: Side };
export type PPayment = { id: string; item_id: string | null; amount: number; paid_at: string };
export type PTodo = { id: string; kind: "dokumen" | "jadwal"; title: string; due_date: string | null; done: boolean; side: Side };

export function paidFor(itemId: string, payments: PPayment[]): number {
  return payments.reduce((s, p) => (p.item_id === itemId ? s + p.amount : s), 0);
}

export type Summary = {
  planned: number;        // total rencana belanja (semua item)
  paid: number;           // uang yang sudah keluar (semua pembayaran)
  obligation: number;     // sisa yang masih harus dibayar ke item
  budgetLeft: number;     // total budget dikurangi rencana belanja (negatif = melebihi)
  cashLeft: number;       // total budget dikurangi uang keluar
  overBudget: boolean;
  usedPct: number;        // rencana belanja terhadap budget, 0-100+
};

export function summarize(items: PItem[], payments: PPayment[], totalBudget: number): Summary {
  const planned = items.reduce((s, i) => s + i.planned_cost, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const obligation = items.reduce((s, i) => s + Math.max(i.planned_cost - paidFor(i.id, payments), 0), 0);
  const budgetLeft = totalBudget - planned;
  return {
    planned, paid, obligation, budgetLeft,
    cashLeft: totalBudget - paid,
    overBudget: totalBudget > 0 && planned > totalBudget,
    usedPct: totalBudget > 0 ? Math.round((planned / totalBudget) * 100) : 0,
  };
}

export function isItemDone(i: PItem): boolean { return i.status === "lunas" || i.status === "selesai"; }

export function itemProgressPct(i: PItem, payments: PPayment[]): number {
  if (i.planned_cost <= 0) return isItemDone(i) ? 100 : 0;
  return Math.min(100, Math.round((paidFor(i.id, payments) / i.planned_cost) * 100));
}

function dayNum(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}
/** Selisih hari dari today ke date (negatif = sudah lewat). */
export function daysUntil(date: string, today: string): number { return dayNum(date) - dayNum(today); }

export type Upcoming = { id: string; title: string; date: string; days: number; kind: "belanja" | "dokumen" | "jadwal"; overdue: boolean };
/** Hal yang jatuh tempo/dibutuhkan dalam `withinDays` hari ke depan, atau sudah lewat dan belum beres. */
export function upcoming(items: PItem[], todos: PTodo[], today: string, withinDays = 30): Upcoming[] {
  const out: Upcoming[] = [];
  for (const i of items) if (i.needed_date && !isItemDone(i)) out.push({ id: i.id, title: i.name, date: i.needed_date, days: daysUntil(i.needed_date, today), kind: "belanja", overdue: false });
  for (const t of todos) if (t.due_date && !t.done) out.push({ id: t.id, title: t.title, date: t.due_date, days: daysUntil(t.due_date, today), kind: t.kind === "dokumen" ? "dokumen" : "jadwal", overdue: false });
  return out.filter((u) => u.days <= withinDays).map((u) => ({ ...u, overdue: u.days < 0 })).sort((a, b) => a.days - b.days);
}

export function todoProgress(todos: PTodo[]): { done: number; total: number; pct: number } {
  const total = todos.length, done = todos.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Berapa yang perlu disisihkan per bulan agar kewajiban terkumpul sebelum tanggal acara. */
export function monthlySaving(obligation: number, eventDate: string | null, today: string): number | null {
  if (!eventDate || obligation <= 0) return null;
  const days = daysUntil(eventDate, today);
  if (days <= 0) return null;
  const months = Math.max(1, Math.ceil(days / 30));
  return Math.ceil(obligation / months);
}

export function guestTotals(g: { pax: number; attendance: string; side: Side }[]): { orang: number; undangan: number; hadir: number; tidak: number; belum: number } {
  const orang = g.reduce((s, x) => s + x.pax, 0);
  return {
    orang, undangan: g.length,
    hadir: g.filter((x) => x.attendance === "hadir").reduce((s, x) => s + x.pax, 0),
    tidak: g.filter((x) => x.attendance === "tidak").reduce((s, x) => s + x.pax, 0),
    belum: g.filter((x) => x.attendance === "belum").reduce((s, x) => s + x.pax, 0),
  };
}

// Daftar awal (contoh umum, bisa diubah/dihapus). Bukan nasihat hukum: syarat resmi tanya KUA setempat.
export const STARTER_DOCS: { title: string; side: Side }[] = [
  { title: "KTP", side: "umum" }, { title: "Kartu Keluarga", side: "umum" }, { title: "Akta kelahiran", side: "umum" },
  { title: "Surat pengantar RT/RW dan kelurahan (N1, N2, N4)", side: "umum" }, { title: "Pas foto (ukuran sesuai KUA)", side: "umum" },
  { title: "Fotokopi ijazah terakhir", side: "umum" }, { title: "Pemeriksaan kesehatan / imunisasi calon pengantin", side: "umum" },
  { title: "Kursus pranikah (bimwin)", side: "umum" }, { title: "Daftar akad ke KUA", side: "umum" },
];
export const STARTER_VENDORS = ["Gedung / tempat acara", "Katering", "Rias dan busana", "Dokumentasi foto/video", "Dekorasi", "Hiburan / MC", "Undangan dan souvenir"];
export const STARTER_SESERAHAN = ["Mahar", "Perhiasan", "Pakaian", "Sepatu dan tas", "Alat ibadah", "Kosmetik dan perawatan", "Makanan / buah"];
