import { expect, test } from "@playwright/test";

test("employer can review a valid payment before wallet signing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "phantom", {
      value: { solana: { connect: async () => ({ publicKey: "11111111111111111111111111111111" }) } },
    });
  });
  await page.goto("/employer/payments/new");
  await page.getByRole("button", { name: "Connect Phantom" }).click();
  await expect(page.getByText("11111111111111111111111111111111")).toBeVisible();
  await page.getByLabel("Contractor wallet address").fill("11111111111111111111111111111111");
  await page.getByLabel("Amount").fill("125.50");
  await page.getByLabel("Token-2022 mint address").fill("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  await page.getByLabel("Payment period").fill("September 2026");
  await page.getByRole("button", { name: "Review payment" }).click();

  await expect(page.getByRole("heading", { name: "Review payment details" })).toBeVisible();
  await expect(page.getByText("wallet participation remains public")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit non-confidential Token-2022 transfer" })).toBeVisible();
});
