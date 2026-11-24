"use client";

import * as React from "react";
import Link from "next/link";
import { getApiUsage, getMyAdminRole } from "@/lib/data/admin";
import { apiAlert, type Alert } from "@/lib/admin-alert";
import { formatRupiah } from "@/lib/utils";

/** Peringatan saldo API di beranda, hanya untuk admin, supaya tidak perlu membuka halaman Admin. */
export function AdminAlertBanner() {
  const [a, setA] = React.useState<Alert | null>(null);
  React.useEffect(() => {
    let live = true;
    (async () => {
      if (!(await getMyAdminRole())) return;
      const u = await getApiUsage();
      const al = apiAlert(u, (n) => formatRupiah(Math.round(n)));
      if (live && (al.tone === "warn" || al.tone === "bad")) setA(al);
    })().catch(() => {});
    return () => { live = false; };
  }, []);
  if (!a) return null;
  return (
    <Link href="/admin" role="alert" className={`block rounded-2xl p-3 text-xs ${a.tone === "bad" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>
      <b>{a.title}.</b> {a.body}
    </Link>
  );
}
