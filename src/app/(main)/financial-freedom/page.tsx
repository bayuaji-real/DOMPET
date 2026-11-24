"use client";

import { PageGate } from "@/components/plan/gate";
import { GuidedChat } from "@/components/ai/guided-chat";
import { FINANCIAL_FREEDOM } from "@/lib/konsultan/guided";

export default function Page() {
  return <PageGate feature="financial_freedom" title="Financial Freedom"><GuidedChat flow={FINANCIAL_FREEDOM} /></PageGate>;
}
