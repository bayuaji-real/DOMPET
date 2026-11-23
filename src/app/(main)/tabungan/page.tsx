"use client";

import * as React from "react";
import { notify } from "@/lib/notify";
import { TopHeader } from "@/components/layout/top-header";
import { SavingsTimeline } from "@/components/tabungan/savings-timeline";
import { formatRupiah, formatTanggalWIB } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { todayJakarta } from "@/lib/data/sample-mode";
import type { Database } from "@/types/database";
import { isSpendableWallet, type WalletBalance } from "@/lib/data/wallets";
import { deleteSavingsGoal } from "@/lib/data/goals";
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
  Trash2,
  X,
  ChevronRight,
  Loader2,
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
import { AiChat, type SavingsProposal } from "@/components/ai/ai-chat";
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

/**
 * Jika rencana setoran per gajian belum diisi (0), status "Telat" menyesatkan
 * selama tenggat belum lewat: tampilkan label netral. Tenggat lewat tetap "Telat".
 */
function badgeLabel(
  planned: number,
  proj: { status: string; statusLabel: string; daysRemaining: number | null }
): string {
  if (proj.status === "telat" && !(planned > 0) && (proj.daysRemaining ?? 0) >= 0) {
    return "Setoran belum diatur";
  }
  return proj.statusLabel;
}

export default function TabunganPage() {
  // Tanggal acuan: diinisialisasi dalam useEffect untuk menghindari hydration/prerender mismatch
  const [todayStr, setTodayStr] = React.useState<string>("");
  const [asOfDate, setAsOfDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const today = todayJakarta();
    setTodayStr(today);
    setAsOfDate(new Date(`${today}T00:00:00Z`));
  }, []);

  const [paydayDates, setPaydayDates] = React.useState<string[]>([]);
  const [goals, setGoals] = React.useState<GoalItem[]>([]);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedWallet, setSelectedWallet] = React.useState("");

  const walletName = React.useCallback(
    (id: string) => wallets.find((w) => w.id === id)?.name ?? "Dompet",
    [wallets]
  );

  const loadData = React.useCallback(async () => {
    const supabase = createClient();
    const today = todayJakarta();
    setTodayStr(today);
    setAsOfDate(new Date(`${today}T00:00:00Z`));
    const [goalsRes, walletsRes, trxRes, payRes] = await Promise.all([
      supabase.from("goal_progress").select("*").order("priority", { ascending: true }),
      supabase.from("wallet_balances").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("transactions")
        .select("id,date,type,amount,wallet_id,note,goal_id,created_at")
        .in("type", ["goal_deposit", "goal_withdraw"])
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("payday_schedule")
        .select("date")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(24),
    ]);

    const walletList = (walletsRes.data ?? []) as WalletBalance[];
    setWallets(walletList);
    setPaydayDates((payRes.data ?? []).map((r: { date: string }) => r.date));

    const nameOf = (id: string) => walletList.find((w) => w.id === id)?.name ?? "Dompet";
    const trx = (trxRes.data ?? []) as {
      id: string; date: string; type: "goal_deposit" | "goal_withdraw";
      amount: number; wallet_id: string; note: string | null; goal_id: string | null;
    }[];

    setGoals(
      (goalsRes.data ?? []).map((g) => ({
        id: g.id as string,
        name: g.name as string,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.saved ?? 0),
        initial_amount: Number(g.initial_amount ?? 0),
        deadline: (g.deadline as string | null) ?? null,
        storage_place: (g.storage_place as string | null) ?? "-",
        planned_per_payday: Number(g.planned_per_payday ?? 0),
        priority: Number(g.priority ?? 1),
        status: (g.status as GoalItem["status"]) ?? "aktif",
        is_emergency_fund: Boolean(g.is_emergency_fund),
        notes: (g.notes as string | null) ?? null,
        history: trx
          .filter((t) => t.goal_id === g.id)
          .map((t) => ({
            id: t.id,
            date: formatTanggalWIB(`${t.date}T00:00:00+07:00`),
            type: t.type,
            amount: Number(t.amount),
            walletName: nameOf(t.wallet_id),
            note: t.note ?? undefined,
          })),
      }))
    );
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!selectedWallet && wallets.length > 0) setSelectedWallet((wallets.find((w) => w.type !== "tabungan") ?? wallets[0]).id);
  }, [wallets, selectedWallet]);

  React.useEffect(() => {
    loadData().catch((err) => {
      console.error("Gagal memuat tabungan:", err);
      setLoading(false);
    });
  }, [loadData]);

  // State navigasi modal & detail
  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [activeDetailView, setActiveDetailView] = React.useState<"detail" | "deposit" | "withdraw">("detail");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [showInsight, setShowInsight] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<GoalItem | null>(null);
  const [deleteMoveTo, setDeleteMoveTo] = React.useState("");
  const [editingGoal, setEditingGoal] = React.useState<GoalItem | null>(null);

  // State form Setor & Tarik
  const [actionAmount, setActionAmount] = React.useState("");
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
    if (!selectedGoal || !asOfDate) return null;
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

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteMoveTo) return;
    setSaving(true);
    const res = await deleteSavingsGoal(deleteTarget.id, deleteMoveTo);
    setSaving(false);
    if (!res.ok) {
      notify("Gagal menghapus tabungan. Coba lagi.");
      return;
    }
    showToast(`Tabungan "${deleteTarget.name}" dihapus, uangnya dipindah.`);
    setDeleteTarget(null);
    setSelectedGoalId(null);
    await loadData();
  };

  // Buat tabungan dari hasil chat AI (angka kelayakan dihitung server, bukan AI)
  const createFromProposal = async (pr: SavingsProposal, opts?: { deadline: string | null; planned: number }): Promise<boolean> => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const payload: Database["public"]["Tables"]["savings_goals"]["Insert"] = {
        name: pr.name,
        target_amount: pr.target_amount,
        initial_amount: pr.initial_amount,
        deadline: opts ? opts.deadline : pr.deadline,
        storage_place: "Dompet Tabungan",
        planned_per_payday: opts ? opts.planned : pr.feasibility.monthlyNeeded ?? 0,
        priority: goals.length + 1,
        status: "aktif",
        is_emergency_fund: false,
        notes: null,
        ...(user?.id ? { user_id: user.id } : {}),
      };
      const { error } = await supabase.from("savings_goals").insert(payload);
      if (error) throw error;
      showToast(`Target "${pr.name}" berhasil dibuat!`);
      setIsChatOpen(false);
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      notify("Gagal menyimpan ke database. Coba lagi.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const renderProposal = (pr: SavingsProposal, reset: () => void) => {
    const f = pr.feasibility;
    const blocked = !f.feasible && f.reason !== "tanpa_tenggat";
    const msg: Record<string, string> = {
      ok: "Realistis dengan pemasukan dan pengeluaranmu.",
      tanpa_tenggat: "Tanpa tenggat, kamu bisa menabung sebisanya.",
      sudah_tercapai: "Uang awalmu sudah cukup untuk target ini.",
      tidak_ada_sisa: "Saat ini pemasukan belum menyisakan uang bulanan, jadi target ini belum realistis.",
      kurang_per_bulan: `Kurang ${formatRupiah(f.shortfallMonthly)} per bulan dari sisa uangmu.`,
      tenggat_lewat: "Tenggat sudah lewat. Pilih tanggal yang akan datang.",
    };
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3 text-xs">
        <p className="font-bold text-foreground">{pr.name}</p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-muted-foreground">Target</span><p className="font-semibold">{formatRupiah(pr.target_amount)}</p></div>
          <div><span className="text-muted-foreground">Tenggat</span><p className="font-semibold">{pr.deadline ? formatTanggalWIB(pr.deadline) : "Tanpa tenggat"}</p></div>
          {f.monthlyNeeded != null && (
            <div><span className="text-muted-foreground">Sisihkan per bulan</span><p className="font-semibold">{formatRupiah(f.monthlyNeeded)}</p></div>
          )}
          <div><span className="text-muted-foreground">Sisa uang per bulan</span><p className="font-semibold">{formatRupiah(f.freeMonthly)}</p></div>
        </div>
        <p className={blocked ? "font-semibold text-rose-600 dark:text-rose-400" : "font-semibold text-emerald-600 dark:text-emerald-400"}>{msg[f.reason]}</p>
        {blocked && (
          <div className="space-y-1 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-foreground">
            <p className="font-bold">Realistisnya:</p>
            {f.freeMonthly > 0 && f.earliestRealisticDate ? (
              <p>
                Sisihkan sekitar {formatRupiah(Math.floor(f.freeMonthly / 10000) * 10000)} per bulan, target tercapai sekitar{" "}
                {formatTanggalWIB(f.earliestRealisticDate)}.
              </p>
            ) : (
              <p>Pemasukanmu belum menyisakan uang bulanan, jadi tabungan ini baru jalan kalau pengeluaran turun atau pemasukan naik.</p>
            )}
            <p className="text-muted-foreground">Kamu tetap boleh membuatnya sesuai rencanamu.</p>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-1">
          {blocked && f.freeMonthly > 0 && f.earliestRealisticDate && (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => createFromProposal(pr, { deadline: f.earliestRealisticDate, planned: Math.floor(f.freeMonthly / 10000) * 10000 })}
              className="h-8 cursor-pointer rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-500"
            >
              Buat dengan tanggal realistis
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={blocked ? "outline" : "default"}
              disabled={saving}
              onClick={() => createFromProposal(pr)}
              className={`h-8 flex-1 cursor-pointer rounded-xl text-xs font-bold ${blocked ? "" : "bg-teal-600 text-white hover:bg-teal-500"}`}
            >
              {saving ? "Menyimpan..." : blocked ? "Tetap buat sesuai rencanaku" : "Buat Tabungan"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset} className="h-8 cursor-pointer rounded-xl text-xs">Ulang</Button>
          </div>
        </div>
      </div>
    );
  };

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
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(formTarget.replace(/\D/g, "") || "0", 10);
    const initialNum = parseInt(formInitial.replace(/\D/g, "") || "0", 10);
    const plannedNum = parseInt(formPlannedPayday.replace(/\D/g, "") || "0", 10);

    if (!formName.trim() || targetNum <= 0) {
      notify("Nama tabungan dan target nominal wajib diisi!");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (editingGoal) {
        const { error } = await supabase
          .from("savings_goals")
          .update({
            name: formName.trim(),
            target_amount: targetNum,
            initial_amount: initialNum,
            deadline: formDeadline || null,
            storage_place: formStorage,
            planned_per_payday: plannedNum,
            notes: formNotes || null,
          })
          .eq("id", editingGoal.id);
        if (error) throw error;
        showToast(`Tabungan "${formName}" berhasil diperbarui!`);
      } else {
        const insertPayload: Database["public"]["Tables"]["savings_goals"]["Insert"] = {
          name: formName.trim(),
          target_amount: targetNum,
          initial_amount: initialNum,
          deadline: formDeadline || null,
          storage_place: formStorage,
          planned_per_payday: plannedNum,
          priority: goals.length + 1,
          status: "aktif",
          is_emergency_fund: false,
          notes: formNotes || null,
          ...(user?.id ? { user_id: user.id } : {}),
        };
        const { error } = await supabase.from("savings_goals").insert(insertPayload);
        if (error) throw error;
        showToast(`Target "${formName}" berhasil dibuat!`);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      notify("Gagal menyimpan ke database. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const recordGoalTransaction = async (
    type: "goal_deposit" | "goal_withdraw",
    amountNum: number,
    defaultNote: string
  ) => {
    if (!selectedGoal) return false;
    if (!selectedWallet) {
      notify("Pilih dompet dulu. Kalau belum ada dompet, tambahkan di Pengaturan.");
      return false;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("transactions").insert({
        type,
        amount: amountNum,
        wallet_id: selectedWallet,
        goal_id: selectedGoal.id,
        date: todayStr || todayJakarta(),
        note: actionNote || defaultNote,
        source: "manual",
        category_id: null,
        // Tabungan adalah dompet: uang masuk/keluar lewat dompet tabungan miliknya
        to_wallet_id: wallets.find((w) => w.goal_id === selectedGoal.id)?.id ?? null,
      });
      if (error) throw error;
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      notify("Gagal mencatat ke database. Coba lagi.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Eksekusi Setor Uang ke Tabungan
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountNum = parseInt(actionAmount.replace(/\D/g, "") || "0", 10);
    if (amountNum <= 0) return;

    const ok = await recordGoalTransaction("goal_deposit", amountNum, "Setoran manual");
    if (!ok) return;
    showToast(`Berhasil setor ${formatRupiah(amountNum)} ke ${selectedGoal.name}!`);
    setActiveDetailView("detail");
    setActionAmount("");
    setActionNote("");
  };

  // Eksekusi Tarik Uang dari Tabungan
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amountNum = parseInt(actionAmount.replace(/\D/g, "") || "0", 10);
    if (amountNum <= 0) return;

    if (amountNum > selectedGoal.current_amount) {
      notify("Nominal penarikan melebihi saldo tabungan saat ini!");
      return;
    }

    const ok = await recordGoalTransaction("goal_withdraw", amountNum, "Penarikan tabungan");
    if (!ok) return;
    showToast(`Berhasil tarik ${formatRupiah(amountNum)} ke ${walletName(selectedWallet)}!`);
    setActiveDetailView("detail");
    setActionAmount("");
    setActionNote("");
  };

  // Data tren: aktual per bulan (dari riwayat) vs rencana per gajian
  const chartData = React.useMemo(() => {
    if (!selectedGoal || !todayStr) return [];
    const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const label = (ym: string) => `${bulan[parseInt(ym.slice(5, 7), 10) - 1]} ${ym.slice(2, 4)}`;
    const nowYm = todayStr.slice(0, 7);
    const endYm = (selectedGoal.deadline ?? "").slice(0, 7) || nowYm;
    const months: string[] = [];
    let y = parseInt(nowYm.slice(0, 4), 10);
    let m = parseInt(nowYm.slice(5, 7), 10);
    const [ey, em] = [parseInt(endYm.slice(0, 4), 10), parseInt(endYm.slice(5, 7), 10)];
    while ((y < ey || (y === ey && m <= em)) && months.length < 18) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    if (months.length === 0) months.push(nowYm);
    let plannedSum = 0;
    return months.map((ym, i) => {
      const paydaysInMonth = paydayDates.filter((d) => d.startsWith(ym)).length;
      plannedSum += paydaysInMonth * selectedGoal.planned_per_payday;
      return {
        nama: label(ym),
        aktual: i === 0 ? selectedGoal.current_amount : null,
        rencana: Math.min(selectedGoal.target_amount, selectedGoal.current_amount + plannedSum),
      };
    });
  }, [selectedGoal, paydayDates, todayStr]);

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
              onClick={() => setIsChatOpen(true)}
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
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
              <span>Memuat data tabungan…</span>
            </div>
          )}
          {!loading && goals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
              Belum ada target tabungan. Ketuk <strong>Buat Target</strong> untuk memulai.
            </div>
          )}
          {goals.map((goal) => {
            const proj = calculateSavingsProjection({
              currentAmount: goal.current_amount,
              targetAmount: goal.target_amount,
              deadline: goal.deadline,
              plannedPerPayday: goal.planned_per_payday,
              paydayDates,
              asOfDate: asOfDate ?? undefined,
            });

            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                aria-label={`Buka detail tabungan ${goal.name}`}
                onClick={() => {
                  setSelectedGoalId(goal.id);
                  setActiveDetailView("detail");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedGoalId(goal.id);
                    setActiveDetailView("detail");
                  }
                }}
                className="group cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-teal-500/50 hover:shadow-md active:scale-[0.99] space-y-3"
              >
                {/* Header Kartu: Nama, Badge Tempat Simpan, Badge Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground leading-tight">
                        {goal.name}
                      </h4>
                    </div>

                    {/* Tenggat & Hitung Mundur */}
                    {goal.deadline && (
                      <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground [&>span]:whitespace-nowrap">
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
                        : badgeLabel(goal.planned_per_payday, proj) === "Setoran belum diatur"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {badgeLabel(goal.planned_per_payday, proj)}
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

                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline estimasi tanggal & nominal */}
        <SavingsTimeline goals={goals} todayStr={todayStr} />
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
                        <option value="" disabled>Pilih dompet</option>
                        {wallets.filter((w) => w.type !== "tabungan").map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
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
                      ℹ️ Setoran ini mengurangi saldo <strong>{walletName(selectedWallet)}</strong>{" "}
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
                        disabled={saving}
                        className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          "Konfirmasi Setor"
                        )}
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
                        <option value="" disabled>Pilih dompet</option>
                        {wallets.filter((w) => w.type !== "tabungan").map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
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
                      ℹ️ Penarikan ini menambah saldo <strong>{walletName(selectedWallet)}</strong>{" "}
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
                        disabled={saving}
                        className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          "Konfirmasi Tarik"
                        )}
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
                          {badgeLabel(selectedGoal.planned_per_payday, selectedProjection)}
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
                        onClick={() => {
                          setDeleteTarget(selectedGoal);
                          setDeleteMoveTo(wallets.find(isSpendableWallet)?.id ?? "");
                        }}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-500 cursor-pointer"
                        title="Hapus Tabungan"
                      >
                        <Trash2 className="h-4 w-4" />
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

                  <button
                    type="button"
                    onClick={() => setShowInsight((v) => !v)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold text-foreground"
                  >
                    <span>{showInsight ? "Sembunyikan proyeksi & grafik" : "Lihat proyeksi & grafik"}</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showInsight ? "rotate-90" : ""}`} />
                  </button>
                  {showInsight && (
                  <div className="space-y-4">
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

                  </div>
                  )}

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

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[360px] space-y-3 rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground">Hapus tabungan &quot;{deleteTarget.name}&quot;?</h3>
            <p className="text-xs text-muted-foreground">
              Uang terkumpul {formatRupiah(deleteTarget.current_amount)} tidak hilang. Pilih dompet tujuan untuk memindahkannya.
            </p>
            <select
              value={deleteMoveTo}
              onChange={(e) => setDeleteMoveTo(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-xl border border-border bg-background px-3 text-xs"
            >
              {wallets.filter(isSpendableWallet).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} className="h-9 flex-1 cursor-pointer rounded-xl text-xs">Batal</Button>
              <Button type="button" disabled={saving || !deleteMoveTo} onClick={handleConfirmDelete} className="h-9 flex-1 cursor-pointer rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500">
                {saving ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat AI pembuat tabungan */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto flex data-[side=bottom]:h-[100dvh] max-w-[430px] flex-col gap-0 rounded-none border-border/80 bg-background p-0 shadow-2xl"
        >
          <SheetHeader className="flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <SheetTitle className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-teal-600" /> Buat Tabungan dengan AI</SheetTitle>
              <SheetDescription className="text-[11px]">Ceritakan tujuanmu, aku bantu cek apakah realistis.</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setIsChatOpen(false); handleOpenAdd(); }} className="cursor-pointer text-[11px] font-semibold text-teal-700 underline dark:text-teal-400">Isi manual</button>
              <button type="button" onClick={() => setIsChatOpen(false)} aria-label="Tutup" className="cursor-pointer text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
          </SheetHeader>
          {isChatOpen && (
            <AiChat
              mode="savings"
              intro="Kamu mau menabung untuk apa, berapa targetnya, dan kapan mau tercapai?"
              placeholder="Misal: laptop 12 juta, akhir tahun depan"
              suggestions={["Dana darurat", "Beli laptop", "Liburan"]}
              renderProposal={renderProposal}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* C. Dialog Tambah / Edit Tabungan (Z-Index 70) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
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
                  {formStorage && !["RDPU Bibit","BCA Utama (Tabungan)","Bank Jago Kantong","Emas Digital","Tunai Celengan"].includes(formStorage) && (
                    <option value={formStorage}>{formStorage}</option>
                  )}
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
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : editingGoal ? (
                    "Simpan Perubahan"
                  ) : (
                    "Buat Target"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
