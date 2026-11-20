"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, cn, triggerHapticFeedback } from "@/lib/utils";
import {
  User,
  Settings,
  Wallet,
  Tag,
  Calendar,
  Coins,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Save,
  Repeat,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  Info,
  Clock,
  PiggyBank,
  ArrowLeftRight,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getWallets, type WalletBalance } from "@/lib/data/wallets";
import {
  getCategories,
  createCategory,
  deleteCategory,
  type Category,
} from "@/lib/data/categories";
import {
  getPaydaySchedules,
  createPaydaySchedule,
  type PaydaySchedule,
} from "@/lib/data/payday";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  deleteRecurringTransaction,
  type RecurringTransaction,
} from "@/lib/data/recurring";
import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
} from "@/lib/data/settings";
import { getTransactions } from "@/lib/data/transactions";
import { getSavingsGoals } from "@/lib/data/goals";
import {
  generateTransactionsCSV,
  generateBackupJSON,
  triggerBrowserDownload,
} from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilPage() {
  const router = useRouter();

  // Tab Pengaturan
  const [activeTab, setActiveTab] = React.useState<
    "general" | "categories" | "recurring" | "backup" | "account"
  >("general");

  // User Profile Data
  const [userEmail, setUserEmail] = React.useState<string>("demo@dompetku.id");
  const [isDemoUser, setIsDemoUser] = React.useState(true);
  const [totalWalletsCount, setTotalWalletsCount] = React.useState(0);
  const [totalGoalsCount, setTotalGoalsCount] = React.useState(0);
  const [totalTrxCount, setTotalTrxCount] = React.useState(0);

  // Data & Settings State
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [recurringList, setRecurringList] = React.useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  // Form Pengaturan Umum & Finansial
  const [defaultWalletId, setDefaultWalletId] = React.useState("");
  const [livingCostInput, setLivingCostInput] = React.useState("400.000");
  const [paydayDateInput, setPaydayDateInput] = React.useState("20");
  const [expectedSalaryInput, setExpectedSalaryInput] = React.useState("8.500.000");
  const [isSavingGeneral, setIsSavingGeneral] = React.useState(false);
  const [generalToast, setGeneralToast] = React.useState<string | null>(null);

  // Form Tambah Kategori
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatType, setNewCatType] = React.useState<"expense" | "income">("expense");
  const [newCatColor, setNewCatColor] = React.useState("#0d9488");
  const [isAddingCat, setIsAddingCat] = React.useState(false);

  // Form Tambah Transaksi Berulang
  const [newRecNote, setNewRecNote] = React.useState("");
  const [newRecAmount, setNewRecAmount] = React.useState("");
  const [newRecWallet, setNewRecWallet] = React.useState("");
  const [newRecDay, setNewRecDay] = React.useState("20");
  const [isAddingRec, setIsAddingRec] = React.useState(false);

  // State Export
  const [isExportingCSV, setIsExportingCSV] = React.useState(false);
  const [isExportingJSON, setIsExportingJSON] = React.useState(false);

  // State Sembunyikan Saldo
  const [hideBalance, setHideBalance] = React.useState(false);

  // Load User & All Settings
  React.useEffect(() => {
    async function loadInitialData() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          setUserEmail(session.user.email);
          setIsDemoUser(false);
        } else {
          setUserEmail("demo@dompetku.id");
          setIsDemoUser(true);
        }

        const [wList, cList, rList, uSet, pList, gList, tList] = await Promise.allSettled([
          getWallets(),
          getCategories(),
          getRecurringTransactions(),
          getUserSettings(),
          getPaydaySchedules(),
          getSavingsGoals(),
          getTransactions(),
        ]);

        if (wList.status === "fulfilled") {
          setWallets(wList.value);
          setTotalWalletsCount(wList.value.length);
        }
        if (cList.status === "fulfilled") setCategories(cList.value);
        if (rList.status === "fulfilled") setRecurringList(rList.value);
        if (gList.status === "fulfilled") setTotalGoalsCount(gList.value.length);
        if (tList.status === "fulfilled") setTotalTrxCount(tList.value.length);

        if (uSet.status === "fulfilled" && uSet.value) {
          setSettings(uSet.value);
          if (uSet.value.default_wallet_id) setDefaultWalletId(uSet.value.default_wallet_id);
          if (uSet.value.living_cost_per_payday) {
            setLivingCostInput(Number(uSet.value.living_cost_per_payday).toLocaleString("id-ID"));
          }
        }

        if (pList.status === "fulfilled" && pList.value.length > 0) {
          const latest = pList.value[0];
          const d = latest.date ? latest.date.split("-")[2] : "20";
          setPaydayDateInput(String(Number(d) || 20));
          if (latest.expected_amount) {
            setExpectedSalaryInput(Number(latest.expected_amount).toLocaleString("id-ID"));
          }
        }

        const savedHide = localStorage.getItem("dompet_hide_balance");
        if (savedHide === "true") setHideBalance(true);
      } catch (err) {
        console.warn("Gagal memuat profil & pengaturan:", err);
      }
    }

    loadInitialData();
  }, []);

  const showToast = (msg: string) => {
    setGeneralToast(msg);
    setTimeout(() => setGeneralToast(null), 3000);
  };

  // Simpan Pengaturan Umum
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    triggerHapticFeedback();

    try {
      const livingCost = parseInt(livingCostInput.replace(/\D/g, ""), 10) || 400000;
      const expectedSalary = parseInt(expectedSalaryInput.replace(/\D/g, ""), 10) || 8500000;
      const paydayDay = parseInt(paydayDateInput, 10) || 20;

      await updateUserSettings({
        default_wallet_id: defaultWalletId || null,
        living_cost_per_payday: livingCost,
      });

      const pad = (n: number) => String(n).padStart(2, "0");
      const nextDate = `2026-11-${pad(paydayDay)}`;

      await createPaydaySchedule({
        date: nextDate,
        expected_amount: expectedSalary,
        note: `Gaji Bulanan (tgl ${paydayDay})`,
      });

      showToast("Pengaturan finansial & gaji berhasil disimpan!");
    } catch (err) {
      console.error("Gagal simpan pengaturan:", err);
      showToast("Gagal menyimpan pengaturan.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Tambah Kategori
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsAddingCat(true);
    triggerHapticFeedback();

    try {
      const created = await createCategory({
        name: newCatName.trim(),
        type: newCatType,
        color: newCatColor,
        icon: newCatType === "expense" ? "ShoppingBag" : "TrendingUp",
      });

      if (created) {
        setCategories((prev) => [...prev, created]);
        setNewCatName("");
        showToast(`Kategori "${created.name}" berhasil ditambahkan!`);
      }
    } catch (err) {
      console.error("Gagal menambah kategori:", err);
      showToast("Gagal menambah kategori.");
    } finally {
      setIsAddingCat(false);
    }
  };

  // Hapus Kategori
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    triggerHapticFeedback();

    try {
      const ok = await deleteCategory(id);
      if (ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        showToast(`Kategori "${name}" dihapus.`);
      }
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  // Tambah Transaksi Berulang
  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newRecAmount.replace(/\D/g, ""), 10) || 0;
    if (!newRecNote.trim() || amount <= 0) return;

    setIsAddingRec(true);
    triggerHapticFeedback();

    try {
      const day = parseInt(newRecDay, 10) || 20;
      const pad = (n: number) => String(n).padStart(2, "0");
      const nextDateStr = `2026-11-${pad(day)}`;

      const created = await createRecurringTransaction({
        type: "expense",
        amount,
        wallet_id: newRecWallet || wallets[0]?.id || "w-1",
        category_id: categories.find((c) => c.type === "expense")?.id || null,
        note: newRecNote.trim(),
        rule: "monthly",
        day_of_month: day,
        next_date: nextDateStr,
        is_active: true,
      });

      if (created) {
        setRecurringList((prev) => [created, ...prev]);
        setNewRecNote("");
        setNewRecAmount("");
        showToast(`Tagihan "${created.note}" berhasil didaftarkan!`);
      }
    } catch (err) {
      console.error("Gagal menambah tagihan berulang:", err);
      showToast("Gagal mendaftarkan tagihan.");
    } finally {
      setIsAddingRec(false);
    }
  };

  // Hapus Transaksi Berulang
  const handleDeleteRecurring = async (id: string, note?: string | null) => {
    const label = note || "Tagihan ini";
    if (!confirm(`Hapus tagihan "${label}"?`)) return;
    triggerHapticFeedback();

    try {
      const ok = await deleteRecurringTransaction(id);
      if (ok) {
        setRecurringList((prev) => prev.filter((r) => r.id !== id));
        showToast(`Tagihan "${label}" berhasil dihapus.`);
      }
    } catch (err) {
      console.error("Gagal menghapus tagihan:", err);
    }
  };

  // Ekspor CSV
  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    triggerHapticFeedback();
    try {
      const trxList = await getTransactions({ limit: 500 });
      const csvContent = generateTransactionsCSV(trxList);
      const filename = `dompetku_transaksi_${new Date().toISOString().split("T")[0]}.csv`;
      triggerBrowserDownload(csvContent, filename, "text/csv;charset=utf-8;");
      showToast("File CSV transaksi berhasil diunduh!");
    } catch (err) {
      console.error("Gagal export CSV:", err);
      showToast("Gagal mengunduh file CSV.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Ekspor Backup JSON
  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    triggerHapticFeedback();
    try {
      const [trxList, wList, cList, gList, rList, pList, uSet] = await Promise.all([
        getTransactions({ limit: 500 }),
        getWallets(),
        getCategories(),
        getSavingsGoals(),
        getRecurringTransactions(),
        getPaydaySchedules(),
        getUserSettings(),
      ]);

      const backupPayload = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        appName: "Dompetku",
        wallets: wList,
        categories: cList,
        transactions: trxList,
        savings_goals: gList,
        recurring_transactions: rList,
        payday_schedule: pList,
        user_settings: uSet,
      };

      const jsonContent = generateBackupJSON(backupPayload);
      const filename = `dompetku_backup_lengkap_${new Date().toISOString().split("T")[0]}.json`;
      triggerBrowserDownload(jsonContent, filename, "application/json");
      showToast("Backup JSON akun berhasil diunduh!");
    } catch (err) {
      console.error("Gagal backup JSON:", err);
      showToast("Gagal mencadangkan data.");
    } finally {
      setIsExportingJSON(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin keluar dari akun?")) return;
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Gagal logout:", e);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-28">
      <TopHeader
        title="Profil & Pengaturan"
        subtitle="Kelola akun, gaji, & data keuangan"
        showLogout={false}
      />

      {generalToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-teal-600 text-white px-4 py-2 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          {generalToast}
        </div>
      )}

      <div className="space-y-4 p-4">
        {/* 1. KARTU PROFIL PENGGUNA */}
        <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/25 ring-2 ring-teal-500/20 font-black text-xl shrink-0">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground truncate">
                  {userEmail.split("@")[0]}
                </h2>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    isDemoUser
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                  )}
                >
                  {isDemoUser ? "Mode Demo" : "Terverifikasi"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          {/* 3 Mini Statistik Finansial */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-center">
            <div className="rounded-2xl bg-background/50 p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold">Dompet</p>
              <p className="text-sm font-extrabold text-foreground">{totalWalletsCount}</p>
            </div>
            <div className="rounded-2xl bg-background/50 p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold">Tabungan</p>
              <p className="text-sm font-extrabold text-foreground">{totalGoalsCount}</p>
            </div>
            <div className="rounded-2xl bg-background/50 p-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold">Transaksi</p>
              <p className="text-sm font-extrabold text-foreground">{totalTrxCount}</p>
            </div>
          </div>
        </div>

        {/* 2. TAB MENU PENGATURAN LENGKAP */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: "general", label: "Finansial & Gaji", icon: Coins },
            { id: "categories", label: "Kategori", icon: Tag },
            { id: "recurring", label: "Langganan", icon: Repeat },
            { id: "backup", label: "Cadangan & Ekspor", icon: Download },
            { id: "account", label: "Akun & Keamanan", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setActiveTab(tab.id as any);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 3. KONTEN TAB */}

        {/* TAB 1: FINANSIAL & GAJI */}
        {activeTab === "general" && (
          <form
            onSubmit={handleSaveGeneral}
            className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in"
          >
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Jadwal Gajian & Dompet Utama
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Atur siklus gajian agar mode pembagian otomatis berfungsi akurat
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tanggal Gajian Bulanan</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={paydayDateInput}
                    onChange={(e) => setPaydayDateInput(e.target.value)}
                    className="w-24 h-10 text-xs rounded-xl text-center font-bold"
                  />
                  <span className="text-xs text-muted-foreground">
                    Tiap tanggal {paydayDateInput || "20"} setiap bulannya
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estimasi Gaji yang Masuk (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={expectedSalaryInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setExpectedSalaryInput(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    placeholder="8.500.000"
                    className="h-10 pl-9 text-xs rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Batas Biaya Hidup Pokok per Gajian (Rp)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={livingCostInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setLivingCostInput(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    placeholder="400.000"
                    className="h-10 pl-9 text-xs rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Alokasi kebutuhan pokok yang otomatis disisihkan saat gajian.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dompet Utama Transaksi</Label>
                <select
                  value={defaultWalletId}
                  onChange={(e) => setDefaultWalletId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Pilih Dompet Default --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance, { absolute: true })})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSavingGeneral}
              className="w-full h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20"
            >
              {isSavingGeneral ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Pengaturan"}
            </Button>
          </form>
        )}

        {/* TAB 2: KATEGORI */}
        {activeTab === "categories" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Form Tambah Kategori */}
            <form
              onSubmit={handleAddCategory}
              className="rounded-3xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs"
            >
              <div className="border-b border-border/50 pb-2">
                <h3 className="text-sm font-extrabold text-foreground">Tambah Kategori Baru</h3>
                <p className="text-[11px] text-muted-foreground">
                  Kelompokkan pengeluaran atau pemasukan sesukamu
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewCatType("expense")}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold transition-all",
                    newCatType === "expense"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setNewCatType("income")}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold transition-all",
                    newCatType === "income"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Pemasukan
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Kategori</Label>
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Kopi, Laundry, Investasi"
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Warna Label</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="h-9 w-12 rounded-xl border border-border/70 p-0.5 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{newCatColor}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isAddingCat || !newCatName.trim()}
                className="w-full h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
              >
                {isAddingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah Kategori"}
              </Button>
            </form>

            {/* Daftar Kategori Aktif */}
            <div className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <h4 className="text-xs font-bold text-foreground mb-2">
                Daftar Kategori Aktif ({categories.length})
              </h4>
              <div className="divide-y divide-border/40 max-h-[38vh] overflow-y-auto pr-1">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color || "#0d9488" }}
                      />
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        ({c.type})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="text-muted-foreground hover:text-rose-500 p-1 transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LANGGANAN / RECURRING */}
        {activeTab === "recurring" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Form Tambah Tagihan Berulang */}
            <form
              onSubmit={handleAddRecurring}
              className="rounded-3xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs"
            >
              <div className="border-b border-border/50 pb-2">
                <h3 className="text-sm font-extrabold text-foreground">
                  Tambah Langganan / Tagihan Rutin
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Akan muncul kartu konfirmasi otomatis saat tanggal jatuh tempo
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Tagihan / Langganan</Label>
                <Input
                  value={newRecNote}
                  onChange={(e) => setNewRecNote(e.target.value)}
                  placeholder="Contoh: Claude Pro, Netflix, Wifi"
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nominal (Rp)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newRecAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setNewRecAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    placeholder="416.000"
                    required
                    className="h-10 text-xs rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tgl Jatuh Tempo</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={newRecDay}
                    onChange={(e) => setNewRecDay(e.target.value)}
                    placeholder="20"
                    required
                    className="h-10 text-xs rounded-xl text-center font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dompet Pembayar</Label>
                <select
                  value={newRecWallet}
                  onChange={(e) => setNewRecWallet(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance, { absolute: true })})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isAddingRec || !newRecNote.trim()}
                className="w-full h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
              >
                {isAddingRec ? <Loader2 className="h-4 w-4 animate-spin" /> : "Daftarkan Tagihan"}
              </Button>
            </form>

            {/* Daftar Tagihan Aktif */}
            <div className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
              <h4 className="text-xs font-bold text-foreground mb-2">
                Daftar Tagihan Berulang ({recurringList.length})
              </h4>
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                {recurringList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-muted/20 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-foreground">{item.note}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRupiah(item.amount, { absolute: true })} • Jatuh tempo tgl{" "}
                        {item.next_date?.split("-")[2] || "20"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecurring(item.id, item.note)}
                      className="text-muted-foreground hover:text-rose-500 p-1.5 transition-colors"
                      title="Hapus Tagihan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CADANGAN & EKSPOR */}
        {activeTab === "backup" && (
          <div className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in">
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Ekspor & Cadangkan Data Finansial
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Data Anda sepenuhnya adalah milik Anda. Unduh kapan saja.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Unduh Riwayat Transaksi (CSV)</h4>
                    <p className="text-[10px] text-muted-foreground">
                      Format UTF-8 BOM siap dibuka rapi di Google Sheets, Excel, & Apple Numbers
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={isExportingCSV}
                  className="w-full h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {isExportingCSV ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unduh CSV Transaksi"}
                </Button>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileJson className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Backup Lengkap Akun (JSON)</h4>
                    <p className="text-[10px] text-muted-foreground">
                      Mencakup dompet, target tabungan, kategori, tagihan, dan preferensi akun
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={isExportingJSON}
                  variant="outline"
                  className="w-full h-10 rounded-xl border-border/80 text-foreground font-bold text-xs"
                >
                  {isExportingJSON ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download Backup (JSON)"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AKUN & KEAMANAN */}
        {activeTab === "account" && (
          <div className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in">
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">Privasi & Keamanan Akun</h3>
              <p className="text-[11px] text-muted-foreground">
                Kontrol privasi tampilan dan akses autentikasi
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Sembunyikan Seluruh Saldo</p>
                    <p className="text-[10px] text-muted-foreground">
                      Sensor angka saldo dengan masking di tempat umum
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hideBalance;
                    setHideBalance(next);
                    localStorage.setItem("dompet_hide_balance", String(next));
                    triggerHapticFeedback();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    hideBalance ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {hideBalance ? "Aktif" : "Nonaktif"}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <p className="text-xs font-bold text-foreground">Tentang Dompetku</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Versi 1.0.0 (Progressive Web App). Seluruh data diamankan dengan PostgreSQL Row
                  Level Security (RLS) dan pemrosesan AI Google Gemini 3.5.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleLogout}
                variant="destructive"
                className="w-full h-11 rounded-2xl font-bold text-xs shadow-md shadow-rose-500/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar dari Akun (Logout)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
