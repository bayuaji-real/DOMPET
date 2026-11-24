"use client";

import { PageGate } from "@/components/plan/gate";
import { GuidedChat } from "@/components/ai/guided-chat";
import { DANA_PENSIUN } from "@/lib/konsultan/guided";

export default function Page() {
  return <PageGate feature="dana_pensiun" title="Dana pensiunku"><GuidedChat flow={DANA_PENSIUN} /></PageGate>;
}
