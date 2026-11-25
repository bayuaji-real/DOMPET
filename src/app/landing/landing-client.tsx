"use client";

import * as React from "react";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingRealityCheck } from "@/components/landing/landing-reality-check";
import { LandingInteractiveDemos } from "@/components/landing/landing-interactive-demos";
import { LandingRubyChat } from "@/components/landing/landing-ruby-chat";
import { LandingFeaturesGrid } from "@/components/landing/landing-features-grid";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";

interface LandingClientProps {
  isLoggedIn?: boolean;
}

export function LandingClient({ isLoggedIn: initialIsLoggedIn = false }: LandingClientProps) {
  const [isLoggedIn, setIsLoggedIn] = React.useState(initialIsLoggedIn);

  React.useEffect(() => {
    // Beri tahu splash screen bahwa landing page sudah siap dimuat
    window.dispatchEvent(new Event("dompet_ready"));

    // Cek status sesi login pengguna di client secara non-blocking
    try {
      import("@/lib/supabase/client")
        .then(({ createClient }) => {
          createClient()
            .auth.getUser()
            .then(({ data }) => {
              if (data?.user) setIsLoggedIn(true);
            })
            .catch(() => {});
        })
        .catch(() => {});
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-200">
      <LandingNavbar isLoggedIn={isLoggedIn} />
      <main>
        <LandingHero isLoggedIn={isLoggedIn} />
        <LandingRealityCheck />
        <LandingInteractiveDemos />
        <div id="mode-gajian" className="-mt-16 pt-16" />
        <LandingRubyChat />
        <LandingFeaturesGrid />
        <LandingPricing isLoggedIn={isLoggedIn} />
        <LandingFaq />
      </main>
      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}
