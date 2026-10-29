import { afterEach, it, expect, vi } from "vitest";
import { accountsEnabled } from "./features";
afterEach(() => vi.unstubAllEnvs());
it("leaves accounts disabled unless explicitly enabled", () => {
  vi.stubEnv("ENABLE_ACCOUNTS", "");
  expect(accountsEnabled()).toBe(false);
  vi.stubEnv("ENABLE_ACCOUNTS", "false");
  expect(accountsEnabled()).toBe(false);
  vi.stubEnv("ENABLE_ACCOUNTS", "true");
  expect(accountsEnabled()).toBe(true);
});
