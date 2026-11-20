import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dompetku - Keuangan Pribadi",
    short_name: "Dompetku",
    description: "Catatan keuangan pribadi simpel dan cerdas untuk HP",
    start_url: "/",
    display: "fullscreen",
    background_color: "#0f172a",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      // Ikon peluncur (HP memotong bentuknya sendiri): kotak penuh berwarna
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Layar pembuka (splash) memakai ikon "any": logo transparan tanpa kotak
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
