"use client";

import { todayJakarta } from "@/lib/data/sample-mode";
import * as React from "react";
import { TopHeader } from "@/components/layout/top-header";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import {
  Wallet,
  Target,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Building2,
  Smartphone,
  Banknote,
  LineChart,
  User,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WalletBalance, GoalProgress, PaydaySchedule } from "@/types/database";

export default function CekDataPage() {
  const [loading, setLoading] = React.useState(true);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [wallets, setWallets] = React.useState<WalletBalance[]>([]);
  const [goals, setGoals] = React.useState<GoalProgress[]>([]);
  const [paydays, setPaydays] = React.useState<PaydaySchedule[]>([]);
  const [errorStatus, setErrorStatus] = React.useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = React.useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorStatus(null);

    try {
      const supabase = createClient();

      // 1. Cek User Auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setUserEmail(null);
        setUserId(null);
      } else {
        setUserEmail(authData.user.email || null);
        setUserId(authData.user.id);
      }

      // 2. Cek Koneksi & Ambil data dari VIEW wallet_balances
      const { data: walletData, error: walletError } = await supabase
        .from("wallet_balances")
        .select("*")
        .order("sort_order", { ascending: true });

      if (walletError) {
        console.warn("Info wallet_balances:", walletError);
      } else {
        setWallets(walletData || []);
      }

      // 3. Ambil data dari VIEW goal_progress
      const { data: goalData, error: goalError } = await supabase
        .from("goal_progress")
        .select("*")
        .order("priority", { ascending: true });

      if (goalError) {
        console.warn("Info goal_progress:", goalError);
      } else {
        setGoals(goalData || []);
      }

      // 4. Ambil 3 jadwal gajian berikutnya dari payday_schedule
      const today = todayJakarta();
      const { data: paydayData, error: paydayError } = await supabase
        .from("payday_schedule")
        .select("*")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(3);

      if (paydayError) {
        console.warn("Info payday_schedule:", paydayError);
      } else {
        setPaydays(paydayData || []);
      }

      setConnectionSuccess(true);
    } catch (err: unknown) {
      console.error("Gagal terhubung ke Supabase:", err);
      setErrorStatus(err instanceof Error ? err.message : "Gagal terhubung");
      setConnectionSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "bank":
        return Building2;
      case "ewallet":
        return Smartphone;
      case "cash":
        return Banknote;
      case "investasi":
        return LineChart;
      default:
        return Wallet;
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <TopHeader
        title="Cek Data Database"
        subtitle="Verifikasi koneksi Supabase & Skema"
      />

      <div className="space-y-4 p-4">
        {/* Banner Status Koneksi */}
        <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <CardTitle className="text-sm font-bold">
                  Status Supabase
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Endpoint:</span>
              <code className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-teal-700 dark:text-teal-300 truncate">
                yupcalxuirodvfwovtzu.supabase.co
              </code>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Status:</span>
              {connectionSuccess ? (
                <Badge className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" /> Terhubung
                </Badge>
              ) : errorStatus ? (
                <Badge variant="destructive" className="rounded-lg gap-1 text-[11px]">
                  <AlertCircle className="h-3 w-3" /> Gagal
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-lg text-[11px]">
                  Memeriksa...
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border/40 pt-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">User Auth:</span>
              {userEmail ? (
                <span className="font-medium text-foreground truncate">
                  {userEmail} ({userId?.slice(0, 8)}...)
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <ShieldAlert className="h-3 w-3" /> Belum Login (Row Level Security aktif)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 1. VIEW wallet_balances */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Daftar Dompet (wallet_balances)
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              {wallets.length} dompet
            </span>
          </div>

          {wallets.length > 0 ? (
            <div className="grid gap-2">
              {wallets.map((w) => {
                const Icon = getWalletIcon(w.type);
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {w.type} • Awal: {formatRupiah(w.initial_balance)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">
                        {formatRupiah(w.balance)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        Saldo Terhitung
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {userEmail
                ? "Belum ada dompet di database. Buat dompet pertamamu!"
                : "Tidak ada data dompet terlihat. Login terlebih dahulu agar data akunmu tampil sesuai RLS."}
            </div>
          )}
        </section>

        {/* 2. VIEW goal_progress */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Daftar Tabungan (goal_progress)
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              {goals.length} target
            </span>
          </div>

          {goals.length > 0 ? (
            <div className="grid gap-2.5">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold leading-tight">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Status: <span className="capitalize">{g.status}</span>
                        {g.deadline ? ` • Tenggat: ${formatTanggal(g.deadline)}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {Math.round(g.percent || 0)}%
                    </Badge>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 dark:bg-teal-500"
                      style={{ width: `${Math.min(g.percent || 0, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Terkumpul: {formatRupiah(g.saved || 0)}</span>
                    <span>Target: {formatRupiah(g.target_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {userEmail
                ? "Belum ada target tabungan di database."
                : "Tidak ada target terlihat (login untuk melihat tabunganmu)."}
            </div>
          )}
        </section>

        {/* 3. TABEL payday_schedule */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              3 Jadwal Gajian Berikutnya (payday_schedule)
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              {paydays.length} jadwal
            </span>
          </div>

          {paydays.length > 0 ? (
            <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card shadow-sm">
              {paydays.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold leading-tight">
                      {formatTanggal(p.date)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.note || "Gajian Rutin"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600 dark:text-teal-400">
                      {formatRupiah(p.expected_amount)}
                    </p>
                    {p.actual_amount !== null && (
                      <span className="text-[10px] text-muted-foreground">
                        Realisasi: {formatRupiah(p.actual_amount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {userEmail
                ? "Belum ada jadwal gajian mendatang yang tercatat."
                : "Tidak ada jadwal gajian terlihat (login untuk melihat jadwalmu)."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
