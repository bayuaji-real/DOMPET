"use client";

import { GuidedChat } from "@/components/ai/guided-chat";
import { FINANCIAL_FREEDOM } from "@/lib/konsultan/guided";

export default function Page() {
  return <GuidedChat flow={FINANCIAL_FREEDOM} />;
}
