import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // kamera (foto struk) dan mikrofon (catat suara) hanya untuk situs ini
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          // #6 Paksa HTTPS (HSTS)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // CSP yang sudah aman diberlakukan (tidak menyentuh skrip/gaya): anti-clickjacking, anti-pembajakan base/form, tanpa plugin.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co" },
          // Putaran serang 24 Nov: isolasi jendela lintas situs
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // #6 CSP mode Report-Only dulu: tidak memblokir, hanya melapor. Perketat jadi "Content-Security-Policy" setelah diuji di ruang latihan.
          { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://www.google.com https://*.gstatic.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
