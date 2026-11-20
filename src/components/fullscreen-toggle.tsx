"use client";

import * as React from "react";
import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFullscreen } from "@/lib/use-fullscreen";

export function FullscreenToggle() {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  if (!isSupported) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
      onClick={toggleFullscreen}
      title={isFullscreen ? "Keluar layar penuh" : "Mode layar penuh (sembunyikan notifikasi & navigasi)"}
      aria-label="Layar penuh"
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4 text-teal-400" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </Button>
  );
}
