"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TopHeader } from "@/components/layout/top-header";
import { formatRupiah, cn, triggerHapticFeedback } from "@/lib/utils";
import {
  Settings,
  User,
  Calendar,
  Coins,
  Tag,
  Repeat,
  Download,
  FileSpreadsheet,
  FileJson,
  Shield,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Camera,
  Check,
  Plus,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Info,
  Sparkles,
  Smile,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import {
  getUserProfile,
  saveUserProfile,
  PRESET_AVATARS,
  type UserProfile,
} from "@/lib/user-profile";
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

type SettingsSection =
  | null
  | "profile"
  | "payday"
  | "categories"
  | "recurring"
  | "backup"
  | "about";

export default function PengaturanPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Active sub-setting section (null means main vertical list)
  const [activeSection, setActiveSection] = React.useState<SettingsSection>(null);

  // Profile state
  const [profile, setProfile] = React.useState<UserProfile>({
    name: "Bayu Aji",
    email: "bayuaji@dompetku.id",
    avatarUrl: null,
    avatarEmoji: "🧑‍💻",
    avatarBg: "#0d9488",
  });
  const [editName, setEditName] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [avatarUploadPreview, setAvatarUploadPreview] = React.useState<string | null>(null);

  // App data state
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [recurringList, setRecurringList] = React.useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  // Payday & living cost state
  const [paydayDateInput, setPaydayDateInput] = React.useState("20");
  const [expectedSalaryInput, setExpectedSalaryInput] = React.useState("8.500.000");
  const [livingCostInput, setLivingCostInput] = React.useState("400.000");
  const [defaultWalletId, setDefaultWalletId] = React.useState("");
  const [isSavingGeneral, setIsSavingGeneral] = React.useState(false);

  // Category state
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatType, setNewCatType] = React.useState<"expense" | "income">("expense");
  const [newCatColor, setNewCatColor] = React.useState("#0d9488");
  const [isAddingCat, setIsAddingCat] = React.useState(false);

  // Recurring state
  const [newRecNote, setNewRecNote] = React.useState("");
  const [newRecAmount, setNewRecAmount] = React.useState("");
  const [newRecWallet, setNewRecWallet] = React.useState("");
  const [newRecDay, setNewRecDay] = React.useState("20");
  const [isAddingRec, setIsAddingRec] = React.useState(false);

  // Export state
  const [isExportingCSV, setIsExportingCSV] = React.useState(false);
  const [isExportingJSON, setIsExportingJSON] = React.useState(false);

  // Privacy: Hide Balance
  const [hideBalance, setHideBalance] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load All Initial Settings
  React.useEffect(() => {
    async function loadData() {
      try {
        const userProf = await getUserProfile();
        setProfile(userProf);
        setEditName(userProf.name);

        const [wList, cList, rList, uSet, pList] = await Promise.allSettled([
          getWallets(),
          getCategories(),
          getRecurringTransactions(),
          getUserSettings(),
          getPaydaySchedules(),
        ]);

        if (wList.status === "fulfilled") setWallets(wList.value);
        if (cList.status === "fulfilled") setCategories(cList.value);
        if (rList.status === "fulfilled") setRecurringList(rList.value);

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
        console.warn("Gagal memuat pengaturan:", err);
      }
    }

    loadData();
  }, []);

  // Handler Update Profil (Foto & Nama)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSavingProfile(true);
    triggerHapticFeedback();

    try {
      const updated = await saveUserProfile({
        name: editName.trim(),
        avatarUrl: avatarUploadPreview !== null ? avatarUploadPreview : profile.avatarUrl,
        avatarEmoji: profile.avatarEmoji,
        avatarBg: profile.avatarBg,
      });

      setProfile(updated);
      showToast("Profil berhasil diperbarui!");
      setActiveSection(null);
    } catch (err) {
      console.error("Gagal simpan profil:", err);
      showToast("Gagal menyimpan profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handler Unggah Foto Profil (Base64 DataUrl)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUploadPreview(result);
      triggerHapticFeedback();
    };
    reader.readAsDataURL(file);
  };

  // Handler Simpan Finansial & Gaji
  const handleSavePayday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    triggerHapticFeedback();

    try {
      const livingCost = parseInt(livingCostInput.replace(/\D/g, ""), 10) || 400000;
      const expectedSalary = parseInt(expectedSalaryInput.replace(/\D/g, ""), 10) || 8500000;
      const dayNum = parseInt(paydayDateInput, 10) || 20;

      await updateUserSettings({
        default_wallet_id: defaultWalletId || null,
        living_cost_per_payday: livingCost,
      });

      const pad = (n: number) => String(n).padStart(2, "0");
      const nextDate = `2026-11-${pad(dayNum)}`;

      await createPaydaySchedule({
        date: nextDate,
        expected_amount: expectedSalary,
        note: `Gaji Bulanan (tgl ${dayNum})`,
      });

      showToast("Jadwal gaji & biaya hidup berhasil disimpan!");
      setActiveSection(null);
    } catch (err) {
      console.error("Gagal simpan jadwal:", err);
      showToast("Gagal menyimpan jadwal.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Handler Tambah Kategori
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

  // Handler Hapus Kategori
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

  // Handler Tambah Tagihan Berulang
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

  // Handler Hapus Tagihan Berulang
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

  // Handler Ekspor CSV
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

  // Handler Ekspor Backup JSON
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

  // Handler Logout
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

  const isDarkMode = resolvedTheme === "dark";

  return (
    <div className="flex flex-col flex-1 pb-28">
      <TopHeader
        title={activeSection ? "Pengaturan" : "Settings"}
        subtitle="Kelola profil, finansial, & data akun"
      />

      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-teal-600 text-white px-4 py-2 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="space-y-4 p-4">
        {/* Tombol Kembali jika sedang membuka sub-pengaturan */}
        {activeSection !== null && (
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback();
              setActiveSection(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Settings
          </button>
        )}

        {/* --------------------------------------------------------------- */}
        {/* VIEW 0: MENU SETTINGS UTAMA (DAFTAR KE BAWAH / GROUPED LIST)     */}
        {/* --------------------------------------------------------------- */}
        {activeSection === null && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Kartu Profil Utama dengan Tombol Edit Profil */}
            <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-card p-4.5 shadow-sm space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="h-14 w-14 rounded-3xl object-cover ring-2 ring-teal-500/30 shadow-md"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-3xl text-2xl shadow-md ring-2 ring-teal-500/30 font-bold"
                      style={{ backgroundColor: profile.avatarBg || "#0d9488" }}
                    >
                      {profile.avatarEmoji || profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold text-foreground truncate">
                      {profile.name}
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                    Akun Dompetku Terhubung
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setEditName(profile.name);
                    setAvatarUploadPreview(null);
                    setActiveSection("profile");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  Edit Profil
                </button>
              </div>
            </div>

            {/* GROUP 1: FINANSIAL & PREFERENSI */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                Finansial & Kategori
              </p>
              <div className="divide-y divide-border/50 rounded-3xl border border-border/70 bg-card shadow-xs overflow-hidden">
                {/* Opsi 1: Jadwal Gajian & Biaya Hidup */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setActiveSection("payday");
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Jadwal Gajian & Biaya Hidup</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Tanggal gajian, estimasi gaji, & pos biaya hidup pokok
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>

                {/* Opsi 2: Kelola Kategori */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setActiveSection("categories");
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Tag className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Kategori Transaksi</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Atur pos pengeluaran & pemasukan ({categories.length} aktif)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>

                {/* Opsi 3: Langganan & Tagihan Rutin */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setActiveSection("recurring");
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                      <Repeat className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Tagihan & Langganan Rutin</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Pengingat otomatis Claude Pro, Netflix, Wifi ({recurringList.length} aktif)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 2: TAMPILAN & PRIVASI */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                Tampilan & Privasi
              </p>
              <div className="divide-y divide-border/50 rounded-3xl border border-border/70 bg-card shadow-xs overflow-hidden">
                {/* Opsi 4: Tema Tampilan (Pindah dari Header ke sini!) */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                      {isDarkMode ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Tema Tampilan</p>
                      <p className="text-[10px] text-muted-foreground">
                        Mode {isDarkMode ? "Gelap (Dark)" : "Terang (Light)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/50 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        setTheme("light");
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                        !isDarkMode
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sun className="h-3 w-3 text-amber-500" />
                      Terang
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        setTheme("dark");
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                        isDarkMode
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Moon className="h-3 w-3 text-teal-400" />
                      Gelap
                    </button>
                  </div>
                </div>

                {/* Opsi 5: Sensor & Sembunyikan Saldo */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                      {hideBalance ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Sensor / Sembunyikan Saldo</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Tutupi nominal sensitif dengan titik di tempat umum
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      const next = !hideBalance;
                      setHideBalance(next);
                      localStorage.setItem("dompet_hide_balance", String(next));
                      showToast(next ? "Saldo disembunyikan." : "Saldo ditampilkan.");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      hideBalance
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {hideBalance ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              </div>
            </div>

            {/* GROUP 3: CADANGAN & DATA */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                Data & Sistem
              </p>
              <div className="divide-y divide-border/50 rounded-3xl border border-border/70 bg-card shadow-xs overflow-hidden">
                {/* Opsi 6: Cadangan & Ekspor Data */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setActiveSection("backup");
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                      <Download className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Cadangan & Ekspor Data</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Download CSV transaksi (Excel) & backup JSON akun
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>

                {/* Opsi 7: Tentang Aplikasi */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setActiveSection("about");
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                      <Info className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">Tentang Dompetku</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Versi 1.0.0 • AI powered by Google Gemini
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 4: KELUAR / LOGOUT (Pindah dari Header ke sini!) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Keluar dari Akun (Logout)
              </button>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* VIEW 1: SUB-SETTING EDIT PROFIL (NAMA & FOTO)                   */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in"
          >
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">Perbarui Profil Pengguna</h3>
              <p className="text-[11px] text-muted-foreground">
                Sesuaikan foto avatar dan nama yang akan disapa di halaman utama
              </p>
            </div>

            {/* Avatar Preview & Upload */}
            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <div className="relative group">
                {avatarUploadPreview || profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUploadPreview || profile.avatarUrl!}
                    alt="Preview"
                    className="h-20 w-20 rounded-3xl object-cover ring-4 ring-teal-500/30 shadow-md"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl shadow-md ring-4 ring-teal-500/30 font-bold"
                    style={{ backgroundColor: profile.avatarBg || "#0d9488" }}
                  >
                    {profile.avatarEmoji || editName.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md hover:bg-teal-700 transition-transform active:scale-90 cursor-pointer"
                  title="Pilih foto dari perangkat"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-[11px] rounded-xl px-3"
                >
                  <Camera className="mr-1.5 h-3.5 w-3.5" />
                  Unggah Foto
                </Button>

                {(avatarUploadPreview || profile.avatarUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAvatarUploadPreview(null);
                      setProfile((p) => ({ ...p, avatarUrl: null }));
                    }}
                    className="h-8 text-[11px] rounded-xl text-rose-500 hover:text-rose-600 px-2"
                  >
                    Hapus Foto
                  </Button>
                )}
              </div>
            </div>

            {/* Pilihan Preset Emoji Avatar */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Atau Pilih Karakter Avatar</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((av, idx) => {
                  const isSelected =
                    !avatarUploadPreview &&
                    !profile.avatarUrl &&
                    profile.avatarEmoji === av.emoji;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        setAvatarUploadPreview(null);
                        setProfile((p) => ({
                          ...p,
                          avatarUrl: null,
                          avatarEmoji: av.emoji,
                          avatarBg: av.bg,
                        }));
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-2xl border text-xl transition-all cursor-pointer",
                        isSelected
                          ? "border-teal-500 bg-teal-500/15 ring-2 ring-teal-500/30 scale-105"
                          : "border-border/60 bg-muted/20 hover:bg-muted/50"
                      )}
                    >
                      <span>{av.emoji}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-full">
                        {av.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Nama Lengkap */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Nama Lengkap / Nama Panggilan</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Contoh: Bayu Aji"
                required
                className="h-10 text-xs rounded-xl font-bold"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Nama ini akan disapa di bagian atas header aplikasi.
              </p>
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Akun</Label>
              <Input
                value={profile.email}
                disabled
                className="h-10 text-xs rounded-xl bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection(null)}
                className="flex-1 h-10 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingProfile || !editName.trim()}
                className="flex-1 h-10 text-xs rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Profil"}
              </Button>
            </div>
          </form>
        )}

        {/* --------------------------------------------------------------- */}
        {/* VIEW 2: SUB-SETTING JADWAL GAJIAN & BIAYA HIDUP                 */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "payday" && (
          <form
            onSubmit={handleSavePayday}
            className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in"
          >
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">
                Jadwal Gajian & Biaya Hidup
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Atur siklus gajian agar mode pembagian gajian otomatis berfungsi akurat
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

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSection(null)}
                className="flex-1 h-10 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingGeneral}
                className="flex-1 h-10 text-xs rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {isSavingGeneral ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Jadwal"}
              </Button>
            </div>
          </form>
        )}

        {/* --------------------------------------------------------------- */}
        {/* VIEW 3: SUB-SETTING KATEGORI TRANSAKSI                          */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "categories" && (
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
                      className="text-muted-foreground hover:text-rose-500 p-1 transition-colors cursor-pointer"
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

        {/* --------------------------------------------------------------- */}
        {/* VIEW 4: SUB-SETTING TAGIHAN BERULANG                            */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "recurring" && (
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
                  Akan muncul kartu konfirmasi otomatis di beranda saat tanggal jatuh tempo
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
                      className="text-muted-foreground hover:text-rose-500 p-1.5 transition-colors cursor-pointer"
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

        {/* --------------------------------------------------------------- */}
        {/* VIEW 5: SUB-SETTING CADANGAN & EKSPOR DATA                      */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "backup" && (
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

        {/* --------------------------------------------------------------- */}
        {/* VIEW 6: TENTANG APLIKASI                                        */}
        {/* --------------------------------------------------------------- */}
        {activeSection === "about" && (
          <div className="rounded-3xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in fade-in">
            <div className="border-b border-border/50 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">Tentang Dompetku</h3>
              <p className="text-[11px] text-muted-foreground">Informasi teknis dan sistem aplikasi</p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <p className="font-extrabold text-foreground">Dompetku v1.0.0 (PWA)</p>
                </div>
                <p>
                  Aplikasi pencatatan keuangan pribadi modern berstandar Progressive Web App (PWA)
                  yang didesain cepat, tenang, dan berdaya AI untuk pengguna di Indonesia.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                <p className="font-bold text-foreground">Keamanan & Privasi Data:</p>
                <p>
                  Setiap baris data dilindungi oleh enkripsi PostgreSQL Row Level Security (RLS) di
                  Supabase Cloud. Data Anda tidak pernah dijual atau dibagikan ke pihak ketiga.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1">
                <p className="font-bold text-foreground">Kecerdasan Buatan (AI):</p>
                <p>
                  Didukung oleh Google Gemini 3.5 Flash untuk OCR struk belanja, transkripsi pesan
                  suara, dan analisis rekomendasi finansial santai.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
