import { defineConfig } from "@playwright/test";

// Supabase URL/key live in .env.local. E2E_EMAIL / E2E_PASSWORD are optional (default: sign up a fresh account). Real env vars win.
try {
  process.loadEnvFile(".env.local");
} catch {}

const AUTH = "tests/e2e/.auth/user.json";

export default defineConfig({
  testDir: "tests/e2e",
  // One shared account, so specs must not race each other (and onboarding needs the account empty).
  workers: 1,
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on",
  },
  // No webServer on purpose: start the app yourself.
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      // First-run needs an empty account, so it runs alone before everything else (mobile viewport).
      name: "onboarding",
      testMatch: /onboarding\.spec\.ts/,
      dependencies: ["setup"],
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, storageState: AUTH },
    },
    {
      name: "mobile",
      testIgnore: [/onboarding\.spec\.ts/, /palette\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ["setup", "onboarding"],
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, storageState: AUTH },
    },
    {
      name: "desktop",
      testIgnore: [/onboarding\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ["setup", "onboarding"],
      use: { viewport: { width: 1440, height: 900 }, storageState: AUTH },
    },
  ],
});
