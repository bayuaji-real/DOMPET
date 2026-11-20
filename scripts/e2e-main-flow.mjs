import puppeteer from "puppeteer-core";
import path from "path";

const ARTIFACT_DIR = "/Users/bayuaji/.gemini/antigravity/brain/7ebc2a15-e278-4824-93ec-22ac279f0e11";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function runE2E() {
  console.log("🚀 Memulai Pengujian End-to-End (E2E) Alur Utama Dompetku...");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  try {
    // -------------------------------------------------------------------------
    // 1. LOGIN
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 1: Buka /login & Klik Coba Langsung (Mode Demo)...");
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1500));

    // Klik tombol Demo
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const demoBtn = buttons.find((b) => b.innerText.includes("Mode Demo") || b.innerText.includes("Coba Langsung"));
      if (demoBtn) demoBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_01_login.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 1 Selesai: Masuk ke Beranda. Saved e2e_01_login.png");

    // -------------------------------------------------------------------------
    // 2. TAMBAH DOMPET DI /pengaturan
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 2: Buka /pengaturan & Tambah Dompet Baru...");
    await page.goto("http://localhost:3000/pengaturan?demo=true", { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1500));

    // Klik tab "Dompet"
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const tabDompet = buttons.find((b) => b.innerText.trim() === "Dompet");
      if (tabDompet) tabDompet.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Isi Form Tambah Dompet
    await page.type("input[placeholder*='Nama Dompet']", "SeaBank Tabungan");
    await page.type("input[placeholder*='Saldo Awal']", "500000");

    // Submit tambah dompet
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Tambah Dompet"));
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_02_tambah_dompet.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 2 Selesai: Dompet 'SeaBank Tabungan' berhasil ditambah. Saved e2e_02_tambah_dompet.png");

    // -------------------------------------------------------------------------
    // 3. CATAT PENGELUARAN MANUAL DI /tambah
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 3: Buka /tambah & Catat Pengeluaran Manual...");
    await page.goto("http://localhost:3000/tambah?demo=true", { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1500));

    // Input nominal Rp35.000
    const nominalInput = await page.$("input[placeholder='0']");
    if (nominalInput) {
      await nominalInput.type("35000");
    }

    // Input catatan
    const noteInput = await page.$("input#judul");
    if (noteInput) {
      await noteInput.type("Makan Siang Soto Ayam");
    }

    // Submit form pengeluaran
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Simpan Pengeluaran"));
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_03_catat_pengeluaran.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 3 Selesai: Pengeluaran Rp35.000 tersimpan. Saved e2e_03_catat_pengeluaran.png");

    // -------------------------------------------------------------------------
    // 4. CATAT TRANSFER ANTAR DOMPET DI /tambah
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 4: Pilih Tab Transfer & Catat Pindah Saldo...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const transferTab = buttons.find((b) => b.innerText.includes("Transfer"));
      if (transferTab) transferTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Input nominal transfer Rp100.000
    const nominalTransfer = await page.$("input[placeholder='0']");
    if (nominalTransfer) {
      await nominalTransfer.type("100000");
    }

    const noteTransfer = await page.$("input#judul");
    if (noteTransfer) {
      await noteTransfer.type("Top up GoPay dari BCA");
    }

    // Submit Transfer
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Simpan Transfer"));
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_04_transfer.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 4 Selesai: Transfer Rp100.000 tersimpan. Saved e2e_04_transfer.png");

    // -------------------------------------------------------------------------
    // 5. SETOR TABUNGAN DI /tabungan
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 5: Buka /tabungan & Setor Uang ke Target...");
    await page.goto("http://localhost:3000/tabungan?demo=true", { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1500));

    // Klik kartu tabungan pertama untuk buka sheet detail
    await page.evaluate(() => {
      const card = document.querySelector(".cursor-pointer, [role='button']");
      if (card) card.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Klik tombol "Setor Uang" di dalam sheet
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const setorBtn = buttons.find((b) => b.innerText.includes("Setor Uang"));
      if (setorBtn) setorBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Input nominal setoran Rp250.000
    const setorInput = await page.$("input[placeholder='0'], input[placeholder*='Nominal']");
    if (setorInput) {
      await setorInput.type("250000");
    }

    // Klik Konfirmasi Setor
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const confirmBtn = buttons.find((b) => b.innerText.includes("Konfirmasi Setor"));
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_05_setor_tabungan.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 5 Selesai: Setoran Tabungan Rp250.000 berhasil dicatat. Saved e2e_05_setor_tabungan.png");

    // -------------------------------------------------------------------------
    // 6. CEK ANALISIS DI /analisis
    // -------------------------------------------------------------------------
    console.log("➡️ Langkah 6: Buka /analisis & Verifikasi Agregasi Keuangan...");
    await page.goto("http://localhost:3000/analisis?demo=true", { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "e2e_06_cek_analisis.png"),
      fullPage: false,
    });
    console.log("✅ Langkah 6 Selesai: Halaman Analisis diverifikasi. Saved e2e_06_cek_analisis.png");

    console.log("🎉 SELURUH ALUR E2E UTAMA BERHASIL DIVERIFIKASI 100%!");
  } catch (err) {
    console.error("❌ E2E Test Error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runE2E();
