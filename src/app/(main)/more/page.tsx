"use client";

import Link from "next/link";
import * as React from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { getMyAdminRole } from "@/lib/data/admin";
import { MORE_GROUPS } from "@/lib/nav-items";
import { ProBadge } from "@/components/plan/pro-badge";
import { SettingsView } from "@/components/settings/settings-view";

function FeatureGroups({ second }: { second?: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => { getMyAdminRole().then((r) => setIsAdmin(r !== null)); }, []);
  return (
    <>
      {isAdmin && (
        <Link href="/admin" className="flex items-center justify-between rounded-3xl border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/15 text-red-600"><ShieldAlert className="h-[18px] w-[18px]" /></div>
            <div><p className="text-xs font-bold">Admin</p><p className="text-[10px] text-muted-foreground">Pengguna, paket, pemakaian API, data pasar</p></div></div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}
      {MORE_GROUPS.map((group, idx) => (
        <React.Fragment key={group.title}>
        <section aria-label={group.title} className="space-y-1.5">
          <h2 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group.title}</h2>
          <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group flex items-center justify-between p-3.5 transition-colors hover:bg-muted/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">{item.label}{item.pro && <ProBadge />}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
        {idx === MORE_GROUPS.length - 1 && second}
        </React.Fragment>
      ))}
    </>
  );
}

// More = fitur tambahan + semua opsi Pengaturan (menu Pengaturan terpisah sudah tidak ada).
export default function MorePage() {
  return <SettingsView top={({ second }) => <FeatureGroups second={second} />} />;
}
