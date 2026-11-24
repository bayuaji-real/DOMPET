"use client";
import * as React from "react";
import { getEntitlement } from "@/lib/data/entitlement";
import { parseEntitlement, canUse, type Entitlement, type FeatureKey } from "@/lib/plans";

/** Status paket pengguna. loading=true selama dicek, jangan tampilkan gembok dulu supaya layar tidak berkedip. */
export function useEntitlement() {
  const [ent, setEnt] = React.useState<Entitlement>(() => parseEntitlement(null));
  const [loading, setLoading] = React.useState(true);
  const reload = React.useCallback(async () => {
    try { setEnt(await getEntitlement()); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void reload(); }, [reload]);
  return { ent, loading, reload, can: (f: FeatureKey) => canUse(ent.plan, f) };
}
