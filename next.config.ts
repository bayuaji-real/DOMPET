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
          // #6 CSP mode Report-Only dulu: tidak memblokir, hanya melapor. Perketat jadi "Content-Security-Policy" setelah diuji di ruang latihan.
          { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
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
