import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function watch(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

test("F01 login bersih: tanpa demo dan tanpa (PWA)", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /demo/i })).toHaveCount(0);
  await expect(page.getByText("(PWA)")).toHaveCount(0);
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations.filter((v) => v.impact === "critical")).toEqual([]);
  expect(errors).toEqual([]);
});

test("F01-E3 halaman utama tanpa sesi diarahkan ke /login", async ({ page }) => {
  await page.goto("/transaksi");
  await expect(page).toHaveURL(/login/);
});
