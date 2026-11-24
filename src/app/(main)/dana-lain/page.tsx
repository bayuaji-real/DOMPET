"use client";

import { PageGate } from "@/components/plan/gate";
import { GuidedChat } from "@/components/ai/guided-chat";
import { DANA_LAIN } from "@/lib/konsultan/guided";

export default function Page() {
  return <PageGate feature="dana_lain" title="Dana lain"><GuidedChat flow={DANA_LAIN} /></PageGate>;
}
