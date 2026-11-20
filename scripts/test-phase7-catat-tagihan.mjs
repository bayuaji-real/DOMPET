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

  // Find and click "✓ Catat" button in Tagihan card
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const catatBtn = buttons.find(b => b.innerText?.includes("Catat"));
    if (catatBtn) {
      catatBtn.click();
      return true;
    }
    return false;
  });
  console.log("Clicked Catat button:", clicked);
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "phase7_tagihan_dicatat.png"),
    fullPage: false,
  });
  console.log("Saved phase7_tagihan_dicatat.png");

  await browser.close();
}

main();
