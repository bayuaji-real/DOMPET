"use client";

import { PageGate } from "@/components/plan/gate";
import { GuidedChat } from "@/components/ai/guided-chat";
import { MONEY_PLANNER } from "@/lib/konsultan/guided";

export default function Page() {
  return <PageGate feature="money_planner" title="Money planner"><GuidedChat flow={MONEY_PLANNER} /></PageGate>;
}
