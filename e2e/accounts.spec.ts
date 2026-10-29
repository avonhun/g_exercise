import { test, expect } from "@playwright/test";
const username = "keeper_" + Date.now();
const password = "a very long test password";
test("real registration, cookie session, private sync, guest migration and cross-device login", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByRole("button", { name: "Let it grow" }).click();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Open account" }).click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.screenshot({
    path: "test-results/account-create-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.getByRole("button", { name: "Bring my guest world" }).click();
  await page.getByRole("button", { name: "Open account" }).click();
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(
    page.getByText("Saved to your account", { exact: true }).first(),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  expect(
    cookies.some(
      (c) =>
        c.name === "living_world_dev" && c.httpOnly && c.sameSite === "Lax",
    ),
  ).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "living_world",
  );
  const second = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const other = await second.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Open account" }).click();
  await other.getByLabel("Username", { exact: true }).fill(username);
  await other.getByLabel("Password", { exact: true }).fill(password);
  await other.getByRole("button", { name: "Sign in to my world" }).click();
  await expect(other.getByRole("button", { name: "Open account" })).toHaveText(
    username,
  );
  await expect
    .poll(() =>
      other.evaluate(() =>
        Object.keys(localStorage)
          .filter((k) => /^living-world.save.account.[^.]+$/.test(k))
          .map((k) => JSON.parse(localStorage.getItem(k)!))
          .some((s) => s.logs.length === 1 && s.gathering.length === 2),
      ),
    )
    .toBe(true);
  // Expiring the server session must present a usable reauthentication form,
  // while retaining this device's world.
  await page.request.post("/api/account?action=logout", {
    headers: { Origin: "http://127.0.0.1:4173" },
    data: {},
  });
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to my world" }).click();
  await page.getByRole("button", { name: "Open account" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open account" })).toHaveText(
    "Sign in",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("living-world.save")!).logs.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Open account" }).click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(username + "_two");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.getByRole("button", { name: "Start a new world" }).click();
  await page.getByRole("button", { name: "Open account" }).click();
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(
    page.getByText("Saved to your account", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const account = Object.keys(localStorage).filter((k) =>
        /^living-world.save.account.[^.]+$/.test(k),
      );
      return account
        .map((k) => JSON.parse(localStorage.getItem(k)!).logs.length)
        .sort();
    }),
  ).toEqual([0, 1]);
  await second.close();
  expect(errors).toEqual([]);
});
test("account endpoint rejects cross-origin writes and is never cached", async ({
  request,
}) => {
  const response = await request.post("/api/account?action=register", {
    headers: { Origin: "https://evil.example" },
    data: { username: "csrf", password },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const session = await request.get("/api/account?action=session");
  expect(session.headers()["vary"]).toBe("Cookie");
});
