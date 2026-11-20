import puppeteer from "puppeteer-core";
import path from "path";

const ARTIFACT_DIR = "/Users/bayuaji/.gemini/antigravity/brain/7ebc2a15-e278-4824-93ec-22ac279f0e11";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto("http://localhost:3000/?demo=true", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2000));

  // Scroll to show Tagihan Hari Ini card
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("h2, h3, div, span")).find(e => e.innerText?.includes("Tagihan Hari Ini"));
    if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase7_tagihan_hari_ini.png"),
    fullPage: false,
  });
  console.log("Saved phase7_tagihan_hari_ini.png");

  // Now test Mode Gajian "Bagi Sekarang"
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 500));

  // Click "Bagi Sekarang" button
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText?.includes("Bagi Sekarang"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase7_gajian_selesai.png"),
    fullPage: false,
  });
  console.log("Saved phase7_gajian_selesai.png");

  await browser.close();
}

main();
