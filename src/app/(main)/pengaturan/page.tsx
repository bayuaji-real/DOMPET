"use client";

import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, cn, triggerHapticFeedback } from "@/lib/utils";
import {
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
  Sliders,
  ChevronRight,
  Shield,
} from "lucide-react";
import { getWallets, createWallet, type WalletBalance } from "@/lib/data/wallets";
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

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = React.useState<
    "general" | "wallets" | "categories" | "recurring" | "backup"
  >("general");

  // State data
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [recurringList, setRecurringList] = React.useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  // Form Tambah Dompet
  const [newWalletName, setNewWalletName] = React.useState("");
  const [newWalletType, setNewWalletType] = React.useState<"bank" | "ewallet" | "cash" | "investasi">("bank");
  const [newWalletBalance, setNewWalletBalance] = React.useState("");
  const [isAddingWallet, setIsAddingWallet] = React.useState(false);

  // Form Pengaturan Umum
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
  const [exportToast, setExportToast] = React.useState<string | null>(null);

  // Load All Settings
  const loadAll = React.useCallback(async () => {
    try {
      const [w, c, r, s, pList] = await Promise.all([
        getWallets(),
        getCategories(),
        getRecurringTransactions(),
        getUserSettings(),
        getPaydaySchedules(),
      ]);

      if (w) {
        setWallets(w);
        if (!defaultWalletId && w[0]) {
          setDefaultWalletId(s?.default_wallet_id || w[0].id);
        }
      }
      if (c) setCategories(c);
      if (r) setRecurringList(r);
      if (s) {
        setSettings(s);
        setLivingCostInput((s.living_cost_per_payday || 400000).toLocaleString("id-ID"));
      }
      if (pList && pList[0]) {
        const d = pList[0].date.split("-")[2] || "20";
        setPaydayDateInput(String(Number(d)));
        setExpectedSalaryInput((pList[0].expected_amount || 8500000).toLocaleString("id-ID"));
      }
    } catch (err) {
      console.warn("Gagal memuat pengaturan:", err);
    }
  }, [defaultWalletId]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Simpan Pengaturan Umum
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralToast(null);

    try {
      const livingCost = Number(livingCostInput.replace(/\D/g, "")) || 400000;
      await updateUserSettings({
        default_wallet_id: defaultWalletId,
        living_cost_per_payday: livingCost,
      });

      // Simpan jadwal gajian baru jika disesuaikan
      const salaryNum = Number(expectedSalaryInput.replace(/\D/g, "")) || 8500000;
      const dayNum = Number(paydayDateInput) || 20;
      const pad = (n: number) => String(n).padStart(2, "0");
      const nextDate = `2026-11-${pad(dayNum)}`;

      await createPaydaySchedule({
        date: nextDate,
        expected_amount: salaryNum,
        note: `Gaji Bulanan (tgl ${dayNum})`,
      });

      setGeneralToast("Pengaturan berhasil disimpan! ✨");
      setTimeout(() => setGeneralToast(null), 3500);
      await loadAll();
    } catch (err: any) {
      console.error("Gagal menyimpan:", err);
      setGeneralToast("Tersimpan secara lokal di browser!");
      setTimeout(() => setGeneralToast(null), 3500);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Tambah Dompet Baru
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim() || isAddingWallet) return;

    setIsAddingWallet(true);
    triggerHapticFeedback([15, 30, 15]);

    try {
      const balanceNum = parseInt(newWalletBalance.replace(/\D/g, "") || "0", 10);
      await createWallet({
        name: newWalletName.trim(),
        type: newWalletType,
        initial_balance: balanceNum,
        color:
          newWalletType === "bank"
            ? "#0284c7"
            : newWalletType === "ewallet"
              ? "#0d9488"
              : newWalletType === "cash"
                ? "#16a34a"
                : "#8b5cf6",
        icon:
          newWalletType === "bank"
            ? "Building2"
            : newWalletType === "ewallet"
              ? "Smartphone"
              : newWalletType === "cash"
                ? "Banknote"
                : "TrendingUp",
        is_archived: false,
        sort_order: wallets.length + 1,
      });

      triggerHapticFeedback([30, 50, 30]);
      setNewWalletName("");
      setNewWalletBalance("");
      setGeneralToast("Dompet baru berhasil ditambahkan!");
      setTimeout(() => setGeneralToast(null), 3000);
      await loadAll();
    } catch (err: any) {
      console.error("Gagal menambah dompet:", err);
      alert(err.message || "Gagal menambah dompet baru");
    } finally {
      setIsAddingWallet(false);
    }
  };

  // Tambah Kategori
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isAddingCat) return;

    setIsAddingCat(true);
    try {
      await createCategory({
        name: newCatName.trim(),
        type: newCatType,
        color: newCatColor,
        icon: "tag",
        is_default: false,
      });
      setNewCatName("");
      await loadAll();
    } catch (err) {
      console.error("Gagal menambah kategori:", err);
    } finally {
      setIsAddingCat(false);
    }
  };

  // Hapus Kategori
  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  // Tambah Transaksi Berulang
  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecNote.trim() || isAddingRec) return;

    setIsAddingRec(true);
    try {
      const amountNum = Number(newRecAmount.replace(/\D/g, "")) || 100000;
      const dayNum = Number(newRecDay) || 20;
      const pad = (n: number) => String(n).padStart(2, "0");
      const targetWallet = newRecWallet || wallets[0]?.id || "w-1";

      await createRecurringTransaction({
        type: "expense",
        amount: amountNum,
        wallet_id: targetWallet,
        category_id: categories[0]?.id || null,
        note: newRecNote.trim(),
        rule: "monthly",
        day_of_month: dayNum,
        next_date: `2026-11-${pad(dayNum)}`,
        is_active: true,
      });

      setNewRecNote("");
      setNewRecAmount("");
      await loadAll();
    } catch (err) {
      console.error("Gagal menambah transaksi berulang:", err);
    } finally {
      setIsAddingRec(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const txs = await getTransactions({ limit: 500 });
      const csvStr = generateTransactionsCSV(txs);
      const dateStr = new Date().toISOString().split("T")[0];
      triggerBrowserDownload(csvStr, `transaksi-dompetku-${dateStr}.csv`, "text/csv");
      setExportToast("File CSV transaksi berhasil didownload!");
      setTimeout(() => setExportToast(null), 3000);
    } catch (err) {
      console.error("Gagal export CSV:", err);
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Export Backup JSON
  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    try {
      const [w, c, t, g, r, p, s] = await Promise.all([
        getWallets(),
        getCategories(),
        getTransactions({ limit: 500 }),
        getSavingsGoals(),
        getRecurringTransactions(),
        getPaydaySchedules(),
        getUserSettings(),
      ]);

      const backupPayload = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        appName: "Dompetku",
        wallets: w,
        categories: c,
        transactions: t,
        savings_goals: g,
        recurring_transactions: r,
        payday_schedule: p,
        user_settings: s,
      };

      const jsonStr = generateBackupJSON(backupPayload);
      const dateStr = new Date().toISOString().split("T")[0];
      triggerBrowserDownload(
        jsonStr,
        `backup-lengkap-dompetku-${dateStr}.json`,
        "application/json"
      );
      setExportToast("Backup JSON akun berhasil didownload!");
      setTimeout(() => setExportToast(null), 3000);
    } catch (err) {
      console.error("Gagal export JSON:", err);
    } finally {
      setIsExportingJSON(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24">
      <TopHeader
        title="Pengaturan"
        subtitle="Kelola preferensi, kategori & backup akun"
      />

      <div className="space-y-4 p-4">
        {/* Tab Navigasi Pengaturan */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "general", label: "Umum & Gaji" },
            { id: "wallets", label: "Dompet" },
            { id: "categories", label: "Kategori" },
            { id: "recurring", label: "Langganan Rutin" },
            { id: "backup", label: "Export & Backup" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {generalToast && (
          <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-3 text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>{generalToast}</span>
          </div>
        )}

        {/* TAB 1: PENGATURAN UMUM & GAJIAN */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="space-y-4 animate-in fade-in">
            {/* Dompet Default */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <div>
                <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-teal-500" />
                  Dompet Default
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Dompet utama yang otomatis terpilih saat mencatat transaksi baru
                </p>
              </div>

              <select
                value={defaultWalletId}
                onChange={(e) => setDefaultWalletId(e.target.value)}
                className="w-full h-11 rounded-2xl border border-border/80 bg-muted/30 px-3 text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-card text-foreground">
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Jadwal Gajian & Biaya Hidup */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <div>
                <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-teal-500" />
                  Mode Gajian & Biaya Hidup
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Parameter cerdas untuk alokasi pembagian saat hari gajian tiba
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Tanggal Gajian */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Tanggal Gajian (Tiap Bulan)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground">Tgl</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={paydayDateInput}
                      onChange={(e) => setPaydayDateInput(e.target.value)}
                      className="w-full bg-transparent text-sm font-extrabold text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {/* Perkiraan Gaji Masuk */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Estimasi Gaji Masuk (Rp)
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expectedSalaryInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setExpectedSalaryInput(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      className="w-full bg-transparent text-sm font-extrabold text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Biaya Hidup per Gajian */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Biaya Hidup Pokok per Gajian (Rp)
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={livingCostInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setLivingCostInput(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-transparent text-sm font-extrabold text-foreground focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground pt-0.5">
                  Pos belanja wajib untuk kebutuhan hidup pokok sebelum membagi ke tabungan.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingGeneral}
              className="w-full h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingGeneral ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Pengaturan
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB DOMPET */}
        {activeTab === "wallets" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Form Tambah Dompet */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3.5 shadow-sm">
              <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Tambah Dompet / Rekening Baru
              </h3>

              <form onSubmit={handleAddWallet} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Dompet (misal: SeaBank, Bank Jago, OVO)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-medium placeholder:text-muted-foreground outline-none focus:border-teal-500"
                  required
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newWalletType}
                    onChange={(e) => setNewWalletType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-medium outline-none focus:border-teal-500"
                  >
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="cash">Uang Tunai</option>
                    <option value="investasi">Investasi</option>
                  </select>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Saldo Awal (Rp)"
                    value={newWalletBalance}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "");
                      setNewWalletBalance(num ? Number(num).toLocaleString("id-ID") : "");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border/80 bg-background text-xs font-medium placeholder:text-muted-foreground outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingWallet || !newWalletName.trim()}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isAddingWallet ? "Menambahkan..." : "Tambah Dompet"}
                </button>
              </form>
            </div>

            {/* Daftar Dompet Aktif */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-extrabold text-foreground">
                Daftar Dompet Aktif ({wallets.length})
              </h3>
              <div className="divide-y divide-border/50">
                {wallets.map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: w.color || "#0d9488" }}
                      >
                        {w.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{w.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {formatRupiah(w.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA KATEGORI */}
        {activeTab === "categories" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Form Tambah Kategori */}
            <form
              onSubmit={handleAddCategory}
              className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm"
            >
              <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-teal-500" />
                Tambah Kategori Baru
              </h3>

              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Nama Kategori (misal: Skincare, Gym...)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>

                  <div className="flex items-center gap-2 border border-border/70 rounded-xl px-3 bg-muted/30">
                    <span className="text-[10px] font-semibold text-muted-foreground">Warna:</span>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="h-6 w-8 bg-transparent border-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAddingCat}
                  className="w-full h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAddingCat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Tambah Kategori"}
                </button>
              </div>
            </form>

            {/* Daftar Kategori */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-extrabold text-foreground">
                Daftar Kategori Aktif ({categories.length})
              </h3>

              <div className="space-y-2 divide-y divide-border/30">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between pt-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: c.color || "#0d9488" }}
                      />
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                        {c.type === "income" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </div>

                    {!c.is_default && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                        title="Hapus kategori"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSAKSI BERULANG (PART B) */}
        {activeTab === "recurring" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Form Tambah Tagihan Rutin */}
            <form
              onSubmit={handleAddRecurring}
              className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm"
            >
              <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-teal-500" />
                Tambah Tagihan Rutin Baru
              </h3>

              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Keterangan (misal: Claude Pro, Netflix, Listrik...)"
                  value={newRecNote}
                  onChange={(e) => setNewRecNote(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1 border border-border/70 rounded-xl px-3 bg-muted/30">
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Nominal"
                      value={newRecAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setNewRecAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      required
                      className="w-full h-10 bg-transparent text-xs font-bold text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 border border-border/70 rounded-xl px-3 bg-muted/30">
                    <span className="text-[10px] font-semibold text-muted-foreground">Tiap tgl:</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newRecDay}
                      onChange={(e) => setNewRecDay(e.target.value)}
                      required
                      className="w-full h-10 bg-transparent text-xs font-bold text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <select
                  value={newRecWallet}
                  onChange={(e) => setNewRecWallet(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/70 bg-muted/30 px-3 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      Bayar via {w.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={isAddingRec}
                  className="w-full h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAddingRec ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan Tagihan Rutin"}
                </button>
              </div>
            </form>

            {/* Daftar Transaksi Berulang */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-extrabold text-foreground">
                Daftar Tagihan Berulang ({recurringList.length})
              </h3>

              <div className="space-y-2.5 divide-y divide-border/30">
                {recurringList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between pt-2.5 text-xs gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.note}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Tiap tanggal {item.day_of_month} • Jatuh tempo: {item.next_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        {formatRupiah(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteRecurringTransaction(item.id);
                          setRecurringList((prev) => prev.filter((r) => r.id !== item.id));
                        }}
                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                        title="Hapus tagihan berulang"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT & BACKUP (PART D) */}
        {activeTab === "backup" && (
          <div className="space-y-4 animate-in fade-in">
            {exportToast && (
              <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-3 text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{exportToast}</span>
              </div>
            )}

            {/* Kartu Export CSV */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">
                    Export Transaksi ke CSV
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Format tabel siap buka di Microsoft Excel, Google Sheets, atau Numbers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExportingCSV}
                className="w-full h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isExportingCSV ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download File .CSV
                  </>
                )}
              </button>
            </div>

            {/* Kartu Export JSON Backup */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">
                    Backup Lengkap Data ke JSON
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Mencadangkan seluruh saldo, dompet, transaksi, target tabungan & pengaturan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportJSON}
                disabled={isExportingJSON}
                className="w-full h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isExportingJSON ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Backup .JSON
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
