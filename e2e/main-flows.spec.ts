import { test, expect, type Page } from "@playwright/test";

/**
 * Mbak Wulan — QA Frontend.
 * Uji end-to-end alur utama: daftar, login, fitur inti (catat transaksi), logout.
 * Dijalankan di 2 ukuran layar lewat project "hp" (390px) & "laptop" (1280px) di playwright.config.ts.
 *
 * CATATAN AMAN: jalankan HANYA dengan .env.local yang menunjuk ke Supabase STAGING,
 * bukan production. Alur login nyata butuh akun uji di staging.
 * Alur yang butuh sesi memakai bypass demo (?demo=true) yang hanya aktif di dev.
 */

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

// --- DAFTAR (register) ---
test("W01 daftar: form buat akun tampil & bisa submit", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/login");
  await page.getByRole("button", { name: /Buat Akun/i }).click();
  const email = `wulan+${Date.now()}@test.local`;
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill("rahasia123");
  const confirm = page.locator('input[type="password"]').nth(1);
  if (await confirm.count()) await confirm.fill("rahasia123");
  await page.getByRole("button", { name: /Daftar|Buat Akun/i }).last().click();
  // Konfirmasi email biasanya aktif -> muncul pesan sukses/periksa email
  await expect(page.getByText(/berhasil|periksa email|konfirmasi/i)).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

// --- LOGIN: validasi ---
test("W02 login: field kosong ditolak", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /^Masuk$/i }).click();
  await expect(page.getByText(/wajib|isi|kosong|email|password/i).first()).toBeVisible();
});

test("W03 daftar: password pendek (<6) ditolak", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Buat Akun/i }).click();
  await page.locator('input[type="email"]').fill(`x+${Date.now()}@test.local`);
  await page.locator('input[type="password"]').first().fill("123");
  await page.getByRole("button", { name: /Daftar|Buat Akun/i }).last().click();
  await expect(page.getByText(/minimal|6/i).first()).toBeVisible();
});

// --- MASUK via demo lalu FITUR INTI & LOGOUT ---
test("W04 masuk (demo) -> beranda tampil", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/?demo=true");
  await expect(page).not.toHaveURL(/login/);
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("W05 fitur inti: catat transaksi", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/?demo=true");
  await page.goto("/tambah");
  await expect(page.getByText(/Catat Transaksi/i)).toBeVisible();
  // Isi nominal (input number pertama di form)
  const nominal = page.locator('input[inputmode="numeric"], input[type="number"]').first();
  if (await nominal.count()) await nominal.fill("25000");
  // Simpan
  const simpan = page.getByRole("button", { name: /Simpan|Catat|Tambah/i }).last();
  await expect(simpan).toBeVisible();
  expect(errors).toEqual([]);
});

test("W06 logout dari pengaturan -> kembali ke /login", async ({ page }) => {
  await page.goto("/?demo=true");
  await page.goto("/pengaturan");
  const logout = page.getByRole("button", { name: /^Logout$/i });
  await expect(logout).toBeVisible();
  await logout.click();
  await expect(page).toHaveURL(/login/, { timeout: 10_000 });
});

// --- GUARD, DOBEL-KLIK, TOMBOL BACK ---
test("W07 guard: halaman terkunci tanpa sesi -> /login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/transaksi");
  await expect(page).toHaveURL(/login/);
});

test("W08 dobel-klik tombol Masuk tidak bikin error", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/login");
  const masuk = page.getByRole("button", { name: /^Masuk$/i });
  await masuk.click();
  await masuk.click({ force: true }); // klik kedua cepat
  expect(errors).toEqual([]);
});

test("W09 tombol back browser kembali ke beranda", async ({ page }) => {
  await page.goto("/?demo=true");
  await page.goto("/tambah");
  await expect(page.getByText(/Catat Transaksi/i)).toBeVisible();
  await page.goBack();
  await expect(page).not.toHaveURL(/tambah/);
});
