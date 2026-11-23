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
      <div className="flex-1 flex flex-col pb-[5.25rem]">{children}</div>
      <BottomNav />
    </MobileFrame>
  );
}
