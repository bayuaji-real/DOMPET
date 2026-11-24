import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dompetku - Keuangan Pribadi",
    short_name: "Dompetku",
    description: "Catatan keuangan pribadi simpel dan cerdas untuk HP",
    start_url: "/",
    display: "fullscreen",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      // Ikon peluncur (HP memotong bentuknya sendiri): kotak penuh berwarna, hanya satu ukuran (512).
      { src: "/icons/icon-maskable-light-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Layar pembuka Android memilih ikon "any" yang ukurannya paling dekat: logo transparan berpinggiran
      // lega (splash-logo), supaya tampil sebagai logo tanpa kotak. Jangan menambah ikon maskable di ukuran 192/384.
      { src: "/icons/splash-logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/splash-logo-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      // Ikon "any" 512 sama besar dengan ikon maskable 512 supaya Android tidak memilih kotak teal untuk layar pembuka.
      { src: "/icons/splash-logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
