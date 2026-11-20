import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "/Users/bayuaji/.gemini/antigravity/brain/7ebc2a15-e278-4824-93ec-22ac279f0e11";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  console.log("Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  // Set viewport to standard mobile device (iPhone 14 style)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  try {
    // -------------------------------------------------------------------------
    // TEST A & E: Beranda - Mode Gajian & Sembunyikan Saldo
    // -------------------------------------------------------------------------
    console.log("Navigating to Beranda (http://localhost:3000/?demo=true)...");
    await page.goto("http://localhost:3000/?demo=true", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture Beranda default with Gajian card and Recurring card visible
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_beranda_full.png"),
      fullPage: false,
    });
    console.log("Saved phase7_beranda_full.png");

    // Test E: Sembunyikan Saldo (klik tombol mata)
    // Find the eye button by looking for SVG with lucide-eye or clicking the eye toggle next to Saldo Total
    const hideToggle = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      // The eye button is next to "Saldo Total"
      const eye = buttons.find(b => b.innerHTML.includes("lucide-eye") || b.getAttribute("aria-label")?.includes("saldo"));
      if (eye) {
        eye.click();
        return true;
      }
      return false;
    });
    console.log("Clicked eye toggle:", hideToggle);
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_saldo_hidden.png"),
      fullPage: false,
    });
    console.log("Saved phase7_saldo_hidden.png");

    // Klik lagi untuk menampilkan kembali
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const eye = buttons.find(b => b.innerHTML.includes("lucide-eye-off") || b.innerHTML.includes("lucide-eye"));
      if (eye) eye.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Test A: Cek dan interaksi kartu Gajian Hari Ini
    const paydayCardExists = await page.evaluate(() => {
      return document.body.innerText.includes("Gajian Hari Ini");
    });
    console.log("Payday card present:", paydayCardExists);

    // Test B: Cek kartu Tagihan Hari Ini
    const recurringCardExists = await page.evaluate(() => {
      return document.body.innerText.includes("Tagihan Hari Ini") || document.body.innerText.includes("Claude Pro");
    });
    console.log("Recurring card present:", recurringCardExists);

    // -------------------------------------------------------------------------
    // TEST C: Halaman Analisis - Rekomendasi Keuangan & Anggaran per Kategori
    // -------------------------------------------------------------------------
    console.log("Navigating to Analisis (http://localhost:3000/analisis?demo=true)...");
    await page.goto("http://localhost:3000/analisis?demo=true", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Verify "Rekomendasi Keuangan" is displayed instead of "Wawasan Kami"
    const analysisText = await page.evaluate(() => {
      return {
        hasRekomendasi: document.body.innerText.includes("Rekomendasi Keuangan"),
        hasWawasan: document.body.innerText.includes("Wawasan Kami"),
        hasBudget: document.body.innerText.includes("Anggaran per Kategori"),
      };
    });
    console.log("Analisis checks:", analysisText);

    // Scroll to Budget section and take screenshot
    await page.evaluate(() => {
      const budgetSection = Array.from(document.querySelectorAll("h2, h3, div")).find(el => el.innerText?.includes("Anggaran per Kategori"));
      if (budgetSection) budgetSection.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_analisis_budget.png"),
      fullPage: false,
    });
    console.log("Saved phase7_analisis_budget.png");

    // Scroll back up to show Rekomendasi Keuangan
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_analisis_top.png"),
      fullPage: false,
    });
    console.log("Saved phase7_analisis_top.png");

    // -------------------------------------------------------------------------
    // TEST D & F: Halaman Pengaturan (Semua Tab)
    // -------------------------------------------------------------------------
    console.log("Navigating to Pengaturan (http://localhost:3000/pengaturan?demo=true)...");
    await page.goto("http://localhost:3000/pengaturan?demo=true", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Tab 1: Umum & Gaji
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_pengaturan_umum.png"),
      fullPage: false,
    });
    console.log("Saved phase7_pengaturan_umum.png");

    // Tab 2: Kategori
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const tabKategori = tabs.find(b => b.innerText?.includes("Kategori"));
      if (tabKategori) tabKategori.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_pengaturan_kategori.png"),
      fullPage: false,
    });
    console.log("Saved phase7_pengaturan_kategori.png");

    // Tab 3: Langganan Rutin
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const tabRutin = tabs.find(b => b.innerText?.includes("Langganan Rutin"));
      if (tabRutin) tabRutin.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_pengaturan_langganan.png"),
      fullPage: false,
    });
    console.log("Saved phase7_pengaturan_langganan.png");

    // Tab 4: Export & Backup
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("button"));
      const tabExport = tabs.find(b => b.innerText?.includes("Export & Backup"));
      if (tabExport) tabExport.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "phase7_pengaturan_export.png"),
      fullPage: false,
    });
    console.log("Saved phase7_pengaturan_export.png");

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed. Test finished.");
  }
}

main();
