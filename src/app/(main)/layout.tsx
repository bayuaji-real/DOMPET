import * as React from "react";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { ToastHost } from "@/components/toast-host";
import { PinLock } from "@/components/pin-lock";
import { MountGate } from "@/components/layout/mount-gate";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col pb-[5.25rem]"><MountGate>{children}</MountGate></div>
      <React.Suspense fallback={null}>
        <BottomNav />
      </React.Suspense>
      <ToastHost />
      <PinLock />
    </MobileFrame>
  );
}
