import { expect, test } from "@playwright/test";

test("serves the built landing page and SPA routes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ModelWise/);
  await expect(
    page.getByRole("heading", { level: 1, name: /compare models instantly/i }),
  ).toBeVisible();

  await page.goto("/settings");
  await expect(page.locator("#root")).not.toBeEmpty();
});
