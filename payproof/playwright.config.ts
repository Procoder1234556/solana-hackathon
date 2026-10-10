import { defineConfig, devices } from "@playwright/test";

const port = 3000;

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60000,
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  webServer: {
    command: `npm run start -- -p ${port}`,
    port,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
