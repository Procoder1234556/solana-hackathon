import { expect, test } from "@playwright/test";

test("landing page states the product's privacy boundary", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Share income, not wallet history." })).toBeVisible();
  await expect(page.getByText("not anonymous")).toBeVisible();
});

test("navigation linkage between landing, employer, contractor vault, and verifier", async ({ page }) => {
  await page.goto("/");

  // Check link to employer
  await page.getByRole("link", { name: "Employer: Create payment proof" }).click();
  await expect(page).toHaveURL("/employer/payments/new");
  await expect(page.getByRole("heading", { name: "Pay and issue proof" })).toBeVisible();

  // Switch role to contractor vault from employer page
  await page.getByRole("link", { name: "Switch to Contractor Vault →" }).click();
  await expect(page).toHaveURL("/contractor/receipts");
  await expect(page.getByRole("heading", { name: "Your receipt vault" })).toBeVisible();

  // Switch role back to employer
  await page.getByRole("link", { name: "Switch to Employer payment creator →" }).click();
  await expect(page).toHaveURL("/employer/payments/new");

  // Return to home
  await page.getByRole("link", { name: "← PayProof" }).click();
  await expect(page).toHaveURL("/");

  // Test verifier jump box
  await page.getByLabel("Verifier? Enter disclosure token or URL to inspect:").fill("sample-token-123");
  await page.getByRole("button", { name: "Verify →" }).click();
  await expect(page).toHaveURL("/verify/sample-token-123");
  await expect(page.getByRole("heading", { name: "Payment disclosure" })).toBeVisible();

  // Verify return home link from verify page
  await page.getByRole("link", { name: "Return to PayProof home →" }).click();
  await expect(page).toHaveURL("/");
});

