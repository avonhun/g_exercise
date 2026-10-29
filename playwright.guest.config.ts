import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "guest.spec.ts",
  webServer: {
    command: "npx --no-install tsx server/start.ts",
    url: "http://127.0.0.1:4173/healthz",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      ENABLE_ACCOUNTS: "false",
      DATABASE_URL: "",
      LOCAL_DATABASE_PATH: "",
      APP_ORIGIN: "",
      PORT: "4173",
    },
  },
});
