import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "accounts.spec.ts",
  webServer: {
    command: "npx --no-install tsx server/start.ts",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    env: {
      ENABLE_ACCOUNTS: "true",
      LOCAL_DATABASE_PATH: `/tmp/living-world-test-${Date.now()}.sqlite`,
      APP_ORIGIN: "http://127.0.0.1:4173",
      PORT: "4173",
      NODE_ENV: "development",
    },
  },
});
