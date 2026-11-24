"use client";

import { GuidedChat } from "@/components/ai/guided-chat";
import { MONEY_PLANNER } from "@/lib/konsultan/guided";

export default function Page() {
  return <GuidedChat flow={MONEY_PLANNER} />;
}
