import { expect, test } from "@playwright/test";

test("contractor can view disclosure form with field options and expiry choices", async ({ page }) => {
  const dummyReceiptId = "11111111-2222-3333-4444-555555555555";
  await page.goto(`/contractor/receipts/${dummyReceiptId}/share`);

  await expect(page.getByRole("heading", { name: "Share a disclosure link" })).toBeVisible();
  await expect(page.getByText("Select only the fields you want to share.")).toBeVisible();
  await expect(page.getByText("Amount", { exact: true })).toBeVisible();
  await expect(page.getByText("Payment period", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Link expiry")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create disclosure link" })).toBeVisible();
});

test("verifier page displays not found state cleanly for unknown token", async ({ page }) => {
  await page.goto("/verify/0000000000000000000000000000000000000000000000000000000000000000");

  await expect(page.getByRole("heading", { name: "Payment disclosure" })).toBeVisible();
  await expect(page.getByText("Not found")).toBeVisible();
  await expect(page.getByText("This disclosure does not exist or has been deleted.")).toBeVisible();
});

test("verifier page never exposes private financial fields on unverified token", async ({ page }) => {
  await page.goto("/verify/unverified-token-sample-value-32-chars-long");

  await expect(page.getByRole("heading", { name: "Payment disclosure" })).toBeVisible();
  await expect(page.getByText("Not found")).toBeVisible();
  // Ensure sensitive payment values are never exposed
  await expect(page.getByText("Authorized payment fields")).not.toBeVisible();
  await expect(page.getByText("Disclosed payment fields")).not.toBeVisible();
});
