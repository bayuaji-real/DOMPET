import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { FEATURE_ITEMS } from "@/lib/nav-items";

/** Container menu fitur tambahan, gaya Livin': ikon bulat + label dalam satu kartu. */
export function FeatureMenu() {
  return (
    <section aria-labelledby="menu-fitur" className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <h2 id="menu-fitur" className="text-sm font-extrabold text-foreground">
          Menu
        </h2>
      </div>
      <div className="grid grid-cols-4 gap-y-4">
        {FEATURE_ITEMS.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="flex flex-col items-center gap-1.5 rounded-xl py-1 text-center transition-transform active:scale-95"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.tone}`}>
                <Icon className="h-5.5 w-5.5" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-foreground">{f.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
