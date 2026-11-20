"use client";

import * as React from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      setIsSupported(Boolean(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled));

      const handleFullscreenChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      };
    }
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const el: any = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle:", err);
    }
  };

  return { isFullscreen, isSupported, toggleFullscreen };
}
