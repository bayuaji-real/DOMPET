import { defineConfig } from "@playwright/test";
import { assertSafeE2eEnv } from "./scripts/seed-guard";

// Mode staging (npm run test:e2e:staging): tolak bila target bukan project staging.
const isStaging = !!process.env.E2E_STAGING;
if (isStaging) assertSafeE2eEnv(process.env);

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  // Dua ukuran layar wajib (Aturan Mbak Wulan): HP 390px & laptop 1280px
  projects: [
    { name: "hp", use: { viewport: { width: 390, height: 844 } } },
    { name: "laptop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  // Pakai `npm run test:e2e:staging` (memuat .env.staging.local, .env.local tidak diubah).
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    // Mode staging: jangan pakai server lama yang mungkin memuat .env.local.
    reuseExistingServer: !isStaging,
    timeout: 120_000,
  },
});
