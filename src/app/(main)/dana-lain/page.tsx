"use client";

import { GuidedChat } from "@/components/ai/guided-chat";
import { DANA_LAIN } from "@/lib/konsultan/guided";

export default function Page() {
  return <GuidedChat flow={DANA_LAIN} />;
}
