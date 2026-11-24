"use client";
import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlement } from "@/hooks/use-entitlement";
import { FEATURE_LABEL, FEATURE_MIN_PLAN, PLAN_LABEL, type FeatureKey } from "@/lib/plans";

/** Tampilkan anak jika paket cukup; kalau tidak, tampilkan ajakan ramah ke halaman Paket. */
export function Gate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { can, loading } = useEntitlement();
  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-muted" aria-busy="true" />;
  if (can(feature)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
      <Lock className="size-6 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-semibold">{FEATURE_LABEL[feature]}</p>
        <p className="mt-1 text-sm text-muted-foreground">Tersedia di paket {PLAN_LABEL[FEATURE_MIN_PLAN[feature]]} ke atas. Kamu bisa coba gratis 7 hari.</p>
      </div>
      <Button render={<Link href="/paket" />}>Lihat paket</Button>
    </div>
  );
}
