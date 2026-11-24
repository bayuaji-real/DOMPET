"use client";

import { GuidedChat } from "@/components/ai/guided-chat";
import { DANA_PENSIUN } from "@/lib/konsultan/guided";

export default function Page() {
  return <GuidedChat flow={DANA_PENSIUN} />;
}
