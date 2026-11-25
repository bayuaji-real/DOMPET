"use client";

import * as React from "react";
import { Bubble, nowLabel } from "@/components/ai/ai-chat";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

/** Penjelasan skor dari Ruby, bergaya chat. Teksnya disusun kode dari angka yang sama dengan skor: tanpa AI, tanpa token, selalu konsisten. */
export function RubyAdvice({ text }: { text: string }) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [openedAt] = React.useState(() => nowLabel());
  React.useEffect(() => { getUserProfile().then(setProfile).catch(() => {}); }, []);
  return (
    <div className="space-y-2 py-2">
      <Bubble msg={{ role: "model", text, time: openedAt }} first profile={profile} />
      <p className="px-1 text-[10px] leading-tight text-muted-foreground">Penjelasan dihitung dari angka di atas, bukan dari AI. Bukan nasihat keuangan profesional.</p>
    </div>
  );
}
