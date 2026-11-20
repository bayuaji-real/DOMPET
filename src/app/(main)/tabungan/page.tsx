"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, formatTanggalWIB } from "@/lib/utils";
import {
  calculateSavingsProjection,
  type SavingsProjectionResult,
} from "@/lib/savings";
import {
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  AlertTriangle,
  Building2,
  TrendingUp,
  History,
  CheckCircle2,
  Clock,
  Pencil,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Tipe data lokal tabungan untuk UI & integrasi
export interface GoalItem {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  initial_amount: number;
  deadline: string | null;
  storage_place: string;
  planned_per_payday: number;
  priority: number;
  status: "aktif" | "tercapai" | "dibatalkan";
  is_emergency_fund: boolean;
  notes: string | null;
  history?: {
    id: string;
    date: string;
    type: "goal_deposit" | "goal_withdraw";
    amount: number;
    walletName: string;
    note?: string;
  }[];
}

export default function TabunganPage() {
  // Tanggal acuan: 20 Nov 2026
  const asOfDate = React.useMemo(() => new Date("2026-11-20T00:00:00Z"), []);

  // Jadwal gajian simulasi (dari payday_schedule)
  const paydayDates = React.useMemo(
    () => [
      "2026-11-28",
      "2026-12-28",
      "2027-01-28",
      "2027-02-28",
      "2027-03-28",
      "2027-04-28",
    ],
    []
  );

  // Data Seed Utama: "Lamaran" (saldo Rp2.100.000, target Rp6.000.000, tenggat 25 Des 2026)
  const [goals, setGoals] = React.useState<GoalItem[]>([
    {
      id: "seed-lamaran",
      name: "Lamaran",
      target_amount: 6000000,
      current_amount: 2100000,
      initial_amount: 1000000,
      deadline: "2026-12-25",
      storage_place: "RDPU Bibit",
      planned_per_payday: 500000,
      priority: 1,
      status: "aktif",
      is_emergency_fund: false,
      notes: "Biaya persiapan seserahan dan gedung lamaran",
      history: [
        {
          id: "trx-1",
          date: "2026-10-28",
          type: "goal_deposit",
          amount: 500000,
          walletName: "BCA Utama",
          note: "Setoran gajian Oktober",
        },
        {
          id: "trx-2",
          date: "2026-11-10",
          type: "goal_deposit",
          amount: 600000,
          walletName: "GoPay",
          note: "Bonus proyek sampingan",
        },
      ],
    },
    {
      id: "seed-darurat",
      name: "Dana Darurat (3 Bulan)",
      target_amount: 12000000,
      current_amount: 7500000,
      initial_amount: 3000000,
      deadline: "2027-06-30",
      storage_place: "Tabungan Bank Jago",
      planned_per_payday: 1000000,
      priority: 2,
      status: "aktif",
      is_emergency_fund: true,
      notes: "Simpanan liquid saat kondisi tak terduga",
      history: [
        {
          id: "trx-3",
          date: "2026-10-28",
          type: "goal_deposit",
          amount: 1000000,
          walletName: "BCA Utama",
          note: "Rutin gajian",
        },
      ],
    },
  ]);

  // State navigasi modal & detail
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [activeDetailView, setActiveDetailView] = React.useState<"detail" | "deposit" | "withdraw">("detail");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalItem | null>(null);

  // State form Setor & Tarik
  const [actionAmount, setActionAmount] = React.useState("");
  const [selectedWallet, setSelectedWallet] = React.useState("BCA Utama");
  const [actionNote, setActionNote] = React.useState("");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Form input state untuk Tambah / Edit
  const [formName, setFormName] = React.useState("");
  const [formTarget, setFormTarget] = React.useState("");
  const [formInitial, setFormInitial] = React.useState("");
  const [formDeadline, setFormDeadline] = React.useState("");
  const [formStorage, setFormStorage] = React.useState("RDPU Bibit");
  const [formPlannedPayday, setFormPlannedPayday] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedGoal = React.useMemo(
    () => goals.find((g) => g.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  );

  // Kalkulasi proyeksi untuk goal yang dipilih
  const selectedProjection: SavingsProjectionResult | null = React.useMemo(() => {
    if (!selectedGoal) return null;
    return calculateSavingsProjection({
      currentAmount: selectedGoal.current_amount,
      targetAmount: selectedGoal.target_amount,
      deadline: selectedGoal.deadline,
      plannedPerPayday: selectedGoal.planned_per_payday,
      paydayDates,
      asOfDate,
    });
  }, [selectedGoal, paydayDates, asOfDate]);

  // Ringkasan Atas
  const totalTerkumpul = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalKekurangan = Math.max(0, totalTarget - totalTerkumpul);

  // Buka form tambah
  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormName("");
    setFormTarget("");
    setFormInitial("0");
    setFormDeadline("");
    setFormStorage("RDPU Bibit");
    setFormPlannedPayday("500000");
    setFormNotes("");
    setIsFormOpen(true);
  };

  // Buka form edit
  const handleOpenEdit = (goal: GoalItem) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(goal.target_amount.toString());
    setFormInitial(goal.initial_amount.toString());
    setFormDeadline(goal.deadline || "");
    setFormStorage(goal.storage_place);
    setFormPlannedPayday(goal.planned_per_payday.toString());
    setFormNotes(goal.notes || "");
    setIsFormOpen(true);
  };

  // Simpan Tambah / Edit
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(formTarget.replace(/\D/g, "") || "0", 10);
    const initialNum = parseInt(formInitial.replace(/\D/g, "") || "0", 10);
    const plannedNum = parseInt(formPlannedPayday.replace(/\D/g, "") || "0", 10);

    if (!formName.trim() || targetNum <= 0) {
      alert("Nama tabungan dan target nominal wajib diisi!");
      return;
    }

    if (editingGoal) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoal.id
            ? {
                ...g,
                name: formName,
                target_amount: targetNum,
                deadline: formDeadline || null,
                storage_place: formStorage,
                planned_per_payday: plannedNum,
                notes: formNotes || null,
              }
            : g
        )
      );
      showToast(`Tabungan "${formName}" berhasil diperbarui!`);
    } else {
      const newGoal: GoalItem = {
        id: `goal-${Date.now()}`,
        name: formName,
        target_amount: targetNum,
        current_amount: initialNum,
        initial_amount: initialNum,
        deadline: formDeadline || null,
        storage_place: formStorage,
        planned_per_payday: plannedNum,
        priority: goals.length + 1,
        status: "aktif",
        is_emergency_fund: false,
        notes: formNotes || null,
        history:
          initialNum > 0
            ? [
                {
                  id: `init-${Date.now()}`,
                  date: formatTanggalWIB(asOfDate),
                  type: "goal_deposit",
                  amount: initialNum,
                  walletName: formStorage,
                  note: "Saldo awal tabungan",
                },
              ]
            : [],
      };
      setGoals((prev) => [...prev, newGoal]);
      showToast(`Target "${formName}" berhasil dibuat!`);
    }

    setIsFormOpen(false);
  };

  // Eksekusi Setor Uang ke Tabungan
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountNum = parseInt(actionAmount.replace(/\D/g, "") || "0", 10);
    if (amountNum <= 0) return;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === selectedGoal.id) {
          const newCurrent = g.current_amount + amountNum;
          const newHistory = [
            {
              id: `dep-${Date.now()}`,
              date: formatTanggalWIB(asOfDate),
              type: "goal_deposit" as const,
              amount: amountNum,
              walletName: selectedWallet,
              note: actionNote || "Setoran manual",
            },
            ...(g.history || []),
          ];
          return {
            ...g,
            current_amount: newCurrent,
            status: newCurrent >= g.target_amount ? "tercapai" : g.status,
            history: newHistory,
          };
        }
        return g;
      })
    );

    showToast(`Berhasil setor ${formatRupiah(amountNum)} ke ${selectedGoal.name}!`);
    setActiveDetailView("detail");
    setActionAmount("");
    setActionNote("");
  };

  // Eksekusi Tarik Uang dari Tabungan
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountNum = parseInt(actionAmount.replace(/\D/g, "") || "0", 10);
    if (amountNum <= 0) return;

    if (amountNum > selectedGoal.current_amount) {
      alert("Nominal penarikan melebihi saldo tabungan saat ini!");
      return;
    }

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === selectedGoal.id) {
          const newCurrent = Math.max(0, g.current_amount - amountNum);
          const newHistory = [
            {
              id: `wdr-${Date.now()}`,
              date: formatTanggalWIB(asOfDate),
              type: "goal_withdraw" as const,
              amount: amountNum,
              walletName: selectedWallet,
              note: actionNote || "Penarikan tabungan",
            },
            ...(g.history || []),
          ];
          return {
            ...g,
            current_amount: newCurrent,
            history: newHistory,
          };
        }
        return g;
      })
    );

    showToast(`Berhasil tarik ${formatRupiah(amountNum)} ke ${selectedWallet}!`);
    setActiveDetailView("detail");
    setActionAmount("");
    setActionNote("");
  };

  // Generate Data Tren Garis Aktual vs Rencana
  const chartData = React.useMemo(() => {
    if (!selectedGoal) return [];
    const points = [
      {
        nama: "Awal",
        aktual: selectedGoal.initial_amount,
        rencana: selectedGoal.initial_amount,
      },
      {
        nama: "Okt 26",
        aktual: selectedGoal.initial_amount + 500000,
        rencana: selectedGoal.initial_amount + selectedGoal.planned_per_payday,
      },
      {
        nama: "Nov 26",
        aktual: selectedGoal.current_amount,
        rencana:
          selectedGoal.initial_amount + selectedGoal.planned_per_payday * 2,
      },
      {
        nama: "Des 26",
        aktual: null,
        rencana: Math.min(
          selectedGoal.target_amount,
          selectedGoal.initial_amount + selectedGoal.planned_per_payday * 3
        ),
      },
      {
        nama: "Target",
        aktual: null,
        rencana: selectedGoal.target_amount,
      },
    ];
    return points;
  }, [selectedGoal]);

  return (
    <div className="flex flex-col flex-1">
      <TopHeader
        title="Tabungan & Impian"
        subtitle="Rencanakan target & pantau proyeksi gajian"
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-teal-800 text-white px-4 py-2.5 text-xs font-semibold shadow-xl animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-4 p-4">
        {/* A. Ringkasan Atas */}
        <div className="rounded-3xl bg-gradient-to-br from-teal-800 via-teal-900 to-slate-950 p-4.5 text-white shadow-xl shadow-teal-950/20">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <p className="text-[11px] text-teal-200 font-medium">Total Terkumpul</p>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {formatRupiah(totalTerkumpul)}
              </h2>
            </div>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-8 rounded-xl bg-teal-500 text-zinc-950 hover:bg-teal-400 font-bold text-xs gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Buat Target
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
            <div>
              <span className="text-[10px] text-teal-200">Total Target</span>
              <p className="font-bold text-white text-sm">
                {formatRupiah(totalTarget)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-teal-200">Total Kekurangan</span>
              <p className="font-bold text-rose-300 text-sm">
                {formatRupiah(totalKekurangan)}
              </p>
            </div>
          </div>
        </div>

        {/* Daftar Tabungan (Kartu per Tujuan) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Impian ({goals.length})
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Ketuk untuk detail & aksi
            </span>
          </div>

          {goals.map((goal) => {
            const proj = calculateSavingsProjection({
              currentAmount: goal.current_amount,
              targetAmount: goal.target_amount,
              deadline: goal.deadline,
              plannedPerPayday: goal.planned_per_payday,
              paydayDates,
              asOfDate,
            });

            return (
              <div
                key={goal.id}
                onClick={() => {
                  setSelectedGoalId(goal.id);
                  setActiveDetailView("detail");
                }}
                className="group cursor-pointer rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-teal-500/50 hover:shadow-md active:scale-[0.99] space-y-3"
              >
                {/* Header Kartu: Nama, Badge Tempat Simpan, Badge Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground leading-tight">
                        {goal.name}
                      </h4>
                      {/* Badge Tempat Simpan */}
                      <Badge
                        variant="secondary"
                        className="rounded-lg text-[10px] px-2 py-0.5 bg-muted font-medium text-muted-foreground flex items-center gap-1"
                      >
                        <Building2 className="h-2.5 w-2.5" />
                        {goal.storage_place}
                      </Badge>
                    </div>

                    {/* Tenggat & Hitung Mundur */}
                    {goal.deadline && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                        <span>Tenggat {formatTanggalWIB(goal.deadline)}</span>
                        <span className="font-semibold text-foreground">
                          ({proj.daysRemainingText})
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Badge Status Otomatis */}
                  <Badge
                    className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold shadow-none ${
                      proj.status === "tercapai"
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {proj.statusLabel}
                  </Badge>
                </div>

                {/* Progress Bar & Nominal */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        proj.status === "tercapai"
                          ? "bg-blue-500"
                          : "bg-gradient-to-r from-teal-500 to-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, proj.percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {formatRupiah(goal.current_amount)} dari{" "}
                      {formatRupiah(goal.target_amount)}
                    </span>
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      ({proj.percent}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      {proj.remaining > 0
                        ? `Kurang ${formatRupiah(proj.remaining)}`
                        : "Target sudah terpenuhi!"}
                    </span>
                    <span className="flex items-center text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform font-medium">
                      Detail <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* B. Sheet Detail Tabungan & In-Sheet Views */}
      <Sheet
        open={Boolean(selectedGoalId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGoalId(null);
            setActiveDetailView("detail");
          }
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-w-[430px] rounded-t-3xl border-border/80 bg-background max-h-[90vh] overflow-y-auto pb-8 pt-4 px-5 space-y-4 shadow-2xl"
        >
          {selectedGoal && selectedProjection && (
            <>
              {/* TAMPILAN IN-SHEET 1: FORM SETOR UANG */}
              {activeDetailView === "deposit" ? (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveDetailView("detail")}
                      className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      ← Kembali ke Detail
                    </button>
                    <SheetTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <ArrowDownLeft className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Setor ke {selectedGoal.name}
                    </SheetTitle>
                    <button
                      type="button"
                      onClick={() => setSelectedGoalId(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleDepositSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Sumber Dompet</Label>
                      <select
                        value={selectedWallet}
                        onChange={(e) => setSelectedWallet(e.target.value)}
                        className="w-full h-10 rounded-xl border border-border/60 bg-muted/40 px-3 text-xs text-foreground focus:outline-none"
                      >
                        <option value="BCA Utama">BCA Utama</option>
                        <option value="GoPay">GoPay</option>
                        <option value="Uang Tunai">Uang Tunai</option>
                        <option value="Bank Mandiri">Bank Mandiri</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Nominal Setoran (Rp)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Misal: 400.000"
                        value={actionAmount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setActionAmount(
                            raw ? Number(raw).toLocaleString("id-ID") : ""
                          );
                        }}
                        required
                        autoFocus
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Catatan (Opsional)</Label>
                      <Input
                        placeholder="Misal: Setoran gajian November"
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded-xl leading-relaxed">
                      ℹ️ Setoran ini mengurangi saldo <strong>{selectedWallet}</strong>{" "}
                      dan <strong>tidak dihitung sebagai pengeluaran</strong> di analisis.
                    </p>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveDetailView("detail")}
                        className="flex-1 h-10 rounded-xl text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                      >
                        Konfirmasi Setor
                      </Button>
                    </div>
                  </form>
                </div>
              ) : activeDetailView === "withdraw" ? (
                /* TAMPILAN IN-SHEET 2: FORM TARIK UANG */
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveDetailView("detail")}
                      className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      ← Kembali ke Detail
                    </button>
                    <SheetTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <ArrowUpRight className="h-4 w-4 text-rose-500" />
                      Tarik dari {selectedGoal.name}
                    </SheetTitle>
                    <button
                      type="button"
                      onClick={() => setSelectedGoalId(null)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Kirim ke Dompet</Label>
                      <select
                        value={selectedWallet}
                        onChange={(e) => setSelectedWallet(e.target.value)}
                        className="w-full h-10 rounded-xl border border-border/60 bg-muted/40 px-3 text-xs text-foreground focus:outline-none"
                      >
                        <option value="BCA Utama">BCA Utama</option>
                        <option value="GoPay">GoPay</option>
                        <option value="Uang Tunai">Uang Tunai</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Nominal Penarikan (Rp)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Misal: 500.000"
                        value={actionAmount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setActionAmount(
                            raw ? Number(raw).toLocaleString("id-ID") : ""
                          );
                        }}
                        required
                        autoFocus
                        className="h-10 text-xs rounded-xl"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Saldo tersedia: {formatRupiah(selectedGoal.current_amount)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Catatan (Opsional)</Label>
                      <Input
                        placeholder="Misal: Keperluan darurat"
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground bg-muted/50 p-2.5 rounded-xl leading-relaxed">
                      ℹ️ Penarikan ini menambah saldo <strong>{selectedWallet}</strong>{" "}
                      dan <strong>tidak dihitung sebagai pemasukan</strong> di analisis.
                    </p>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveDetailView("detail")}
                        className="flex-1 h-10 rounded-xl text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                      >
                        Konfirmasi Tarik
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* TAMPILAN IN-SHEET 3: DETAIL LENGKAP TABUNGAN */
                <>
                  {/* Header Detail */}
                  <div className="flex items-start justify-between border-b border-border/50 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <SheetTitle className="text-base font-extrabold text-foreground">
                          {selectedGoal.name}
                        </SheetTitle>
                        <Badge
                          className={`text-[10px] font-bold ${
                            selectedProjection.status === "tercapai"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {selectedProjection.statusLabel}
                        </Badge>
                      </div>
                      <SheetDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Simpan di {selectedGoal.storage_place}
                      </SheetDescription>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(selectedGoal)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit Tabungan"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedGoalId(null)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress & Angka Terkumpul */}
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Terkumpul
                        </span>
                        <p className="text-lg font-bold text-foreground leading-tight">
                          {formatRupiah(selectedGoal.current_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground">
                          Target
                        </span>
                        <p className="text-sm font-bold text-muted-foreground">
                          {formatRupiah(selectedGoal.target_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, selectedProjection.percent)}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Progres: {selectedProjection.percent}%</span>
                      <span>
                        Sisa: {formatRupiah(selectedProjection.remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Panel Proyeksi Cerdas & Rekomendasi Jika Telat */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      Proyeksi Tercapai Penuh
                    </h4>

                    <div className="rounded-2xl border border-border/60 bg-card p-3 text-xs space-y-2">
                      <p className="text-foreground leading-relaxed">
                        Dengan setoran{" "}
                        <strong>
                          {formatRupiah(selectedGoal.planned_per_payday)}
                        </strong>{" "}
                        per gajian, tabungan ini diproyeksikan penuh pada{" "}
                        <span className="font-bold text-teal-600 dark:text-teal-400">
                          {selectedProjection.projectedFullDateFormatted || "-"}
                        </span>{" "}
                        ({selectedProjection.paydaysNeeded} kali gajian).
                      </p>

                      {/* Rekomendasi Jika Telat */}
                      {selectedProjection.status === "telat" && (
                        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-teal-800 dark:text-teal-200 space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-teal-700 dark:text-teal-300">
                            <Sparkles className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                            Rekomendasi Setoran Tepat Waktu
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Tenggatmu adalah{" "}
                            <strong>
                              {selectedGoal.deadline
                                ? formatTanggalWIB(selectedGoal.deadline)
                                : "-"}
                            </strong>
                            . Agar target ini tercapai tepat waktu, kamu disarankan
                            menaikkan setoran menjadi{" "}
                            <strong className="underline decoration-teal-500 underline-offset-2 font-bold text-teal-700 dark:text-teal-300">
                              {formatRupiah(
                                selectedProjection.requiredPerPayday || 0
                              )}
                            </strong>{" "}
                            per gajian (kelipatan Rp50.000).
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grafik Garis: Saldo Aktual vs Rencana */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      Grafik: Saldo Aktual vs Rencana
                    </h4>
                    <div className="h-44 w-full rounded-2xl border border-border/60 bg-card p-2 pt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(150,150,150,0.15)"
                          />
                          <XAxis
                            dataKey="nama"
                            tick={{ fontSize: 10 }}
                            stroke="#888"
                          />
                          <YAxis
                            tick={{ fontSize: 9 }}
                            stroke="#888"
                            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                          />
                          <Tooltip
                            formatter={(val) =>
                              val ? formatRupiah(Number(val)) : "-"
                            }
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              borderColor: "#334155",
                              borderRadius: "0.75rem",
                              fontSize: "11px",
                              color: "#fff",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="rencana"
                            name="Rencana"
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="aktual"
                            name="Aktual"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#0d9488" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tombol Aksi: Setor & Tarik (In-Sheet Switcher) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <Button
                      onClick={() => {
                        setActionAmount("");
                        setActionNote("");
                        setActiveDetailView("deposit");
                      }}
                      className="h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
                    >
                      <ArrowDownLeft className="h-4 w-4" /> Setor Uang
                    </Button>
                    <Button
                      onClick={() => {
                        setActionAmount("");
                        setActionNote("");
                        setActiveDetailView("withdraw");
                      }}
                      variant="outline"
                      className="h-11 rounded-xl border-border/80 font-bold text-xs gap-1.5 text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ArrowUpRight className="h-4 w-4" /> Tarik Uang
                    </Button>
                  </div>

                  {/* Riwayat Mutasi Tabungan */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                      Riwayat Setoran & Penarikan
                    </h4>

                    {selectedGoal.history && selectedGoal.history.length > 0 ? (
                      <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card">
                        {selectedGoal.history.map((h) => {
                          const isDeposit = h.type === "goal_deposit";
                          return (
                            <div
                              key={h.id}
                              className="flex items-center justify-between p-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    isDeposit
                                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {isDeposit ? (
                                    <ArrowDownLeft className="h-4 w-4" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground leading-tight">
                                    {isDeposit ? "Setoran Masuk" : "Penarikan"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {h.walletName} • {h.date}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`font-bold ${
                                  isDeposit
                                    ? "text-teal-600 dark:text-teal-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isDeposit ? "+" : "-"}
                                {formatRupiah(h.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Belum ada riwayat mutasi pada tabungan ini.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* C. Dialog Tambah / Edit Tabungan (Z-Index 70) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-[400px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                {editingGoal ? "Edit Tabungan" : "Buat Target Tabungan Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs">Nama Tujuan Tabungan</Label>
                <Input
                  placeholder="Misal: Lamaran, Beli Laptop, dsb."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Target Nominal (Rp)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6.000.000"
                    value={formTarget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setFormTarget(
                        raw ? Number(raw).toLocaleString("id-ID") : ""
                      );
                    }}
                    required
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {!editingGoal && (
                  <div className="space-y-1">
                    <Label className="text-xs">Saldo Awal (Rp)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formInitial}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setFormInitial(
                          raw ? Number(raw).toLocaleString("id-ID") : ""
                        );
                      }}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Tenggat Waktu (Opsional)</Label>
                  <Input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Setoran per Gajian (Rp)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="500.000"
                    value={formPlannedPayday}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setFormPlannedPayday(
                        raw ? Number(raw).toLocaleString("id-ID") : ""
                      );
                    }}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tempat Penyimpanan</Label>
                <select
                  value={formStorage}
                  onChange={(e) => setFormStorage(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/60 bg-muted/40 px-3 text-xs text-foreground focus:outline-none"
                >
                  <option value="RDPU Bibit">RDPU Bibit (Reksa Dana)</option>
                  <option value="BCA Utama (Tabungan)">BCA Utama (Tabungan)</option>
                  <option value="Bank Jago Kantong">Bank Jago Kantong</option>
                  <option value="Emas Digital">Emas Digital</option>
                  <option value="Tunai Celengan">Tunai Celengan</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Catatan Tambahan</Label>
                <Input
                  placeholder="Keterangan singkat..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 h-10 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {editingGoal ? "Simpan Perubahan" : "Buat Target"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
