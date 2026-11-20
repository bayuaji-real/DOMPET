import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  // Dua ukuran layar wajib (Aturan Mbak Wulan): HP 390px & laptop 1280px
  projects: [
    { name: "hp", use: { viewport: { width: 390, height: 844 } } },
    { name: "laptop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  // PENTING: arahkan .env.local ke Supabase STAGING sebelum menjalankan E2E.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
