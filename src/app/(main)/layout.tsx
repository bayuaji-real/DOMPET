import * as React from "react";
import { MobileFrame } from "@/components/layout/mobile-frame";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileFrame>
      <div className="flex-1 pb-28 flex flex-col">{children}</div>
      <BottomNav />
    </MobileFrame>
  );
}
