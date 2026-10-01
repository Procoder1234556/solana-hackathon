import { expect, test } from "@playwright/test";

test("landing page states the product's privacy boundary", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Share income, not wallet history." })).toBeVisible();
  await expect(page.getByText("not anonymous")).toBeVisible();
});
