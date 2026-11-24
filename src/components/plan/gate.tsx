"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TopHeader } from "@/components/layout/top-header";
import { useEntitlement } from "@/hooks/use-entitlement";
import { FEATURE_LABEL, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/plans";

/**
 * Tampilkan anak jika paket cukup. Kalau tidak: `redirect` langsung membawa pengguna ke halaman Paket (keputusan Owner,
 * tanpa kartu penghalang); tanpa `redirect` tampil ajakan ramah di tempat (dipakai bila halaman punya bagian gratis).
 */
export function Gate({ feature, children, redirect = false }: { feature: FeatureKey; children: React.ReactNode; redirect?: boolean }) {
  const { can, loading } = useEntitlement();
  const router = useRouter();
  const locked = !loading && !can(feature);
  React.useEffect(() => { if (redirect && locked) router.replace("/paket"); }, [redirect, locked, router]);
  if (loading || (redirect && locked)) return <div className="h-24 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
  if (can(feature)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
      <span className="text-3xl" aria-hidden>👑</span>
      <div>
        <p className="font-semibold">{FEATURE_LABEL[feature]}</p>
        <p className="mt-1 text-sm text-muted-foreground">Tersedia di paket {PLAN_LABEL[FEATURE_MIN_PLAN[feature]]}. Kamu bisa coba Pro gratis 7 hari.</p>
      </div>
      <Button render={<Link href="/paket" />}>Lihat paket</Button>
    </div>
  );
}

/** Gerbang satu halaman penuh: paket kurang = langsung ke halaman Paket. Isi (dan pengambilan datanya) hanya jalan kalau paket cukup. */
export function PageGate({ feature, title, children }: { feature: FeatureKey; title: string; children: React.ReactNode }) {
  const { can, loading } = useEntitlement();
  const router = useRouter();
  const locked = !loading && !can(feature);
  React.useEffect(() => { if (locked) router.replace("/paket"); }, [locked, router]);
  if (!loading && !locked) return <>{children}</>;
  return (
    <div className="pb-24">
      <TopHeader title={title} />
      <div className="px-4 pt-2"><div className="h-24 animate-pulse rounded-3xl bg-muted" aria-busy="true" /></div>
    </div>
  );
}
