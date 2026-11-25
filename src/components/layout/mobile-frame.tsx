import * as React from "react";

interface MobileFrameProps {
  children: React.ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-zinc-950 flex justify-center has-[[data-admin-root]]:bg-background">
      <main className="w-full max-w-[430px] min-h-screen bg-background border-x border-border/50 flex flex-col relative shadow-xl overflow-x-clip has-[[data-admin-root]]:max-w-none has-[[data-admin-root]]:border-0 has-[[data-admin-root]]:shadow-none">
        {children}
      </main>
    </div>
  );
}
