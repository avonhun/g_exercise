import { test, expect } from "@playwright/test";
test("mobile activity, building, crafting, correction, saves and console", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Greenhaven Valley" }),
  ).toBeVisible();
  await expect(page.getByText("Stillwater Brook")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/village-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByLabel("What did you do?").selectOption("walk");
  await page
    .getByLabel("Minutes (0 for meal or completed-session logs)")
    .fill("10");
  await page.getByRole("button", { name: "Let it grow" }).click();
  await expect(page.getByRole("status")).toContainText("5 wood");
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Build sawmill" }).click();
  await expect(page.getByRole("status")).toContainText("Sawmill is now");
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Workshops", exact: true }).click();
  await page.getByRole("button", { name: "Queue a batch" }).first().click();
  await expect(page.getByText("480 min remaining")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Workshops", exact: true }).click();
  await expect(page.getByText("480 min remaining")).toBeVisible();
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your journal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("corrected");
  await expect(
    page.getByText("Dog walk / short walk · 1", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Open settings" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export world", exact: true }).click();
  expect((await dl).suggestedFilename()).toBe("living-world-backup.json");
  await page.getByRole("button", { name: "Enter developer console" }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem("living-world.save"),
  );
  await page.getByRole("button", { name: "Run on a copy" }).click();
  await expect(
    page.getByText("Live save unchanged.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("living-world.save")),
  ).toBe(before);
  await page.getByRole("button", { name: "Validate rules" }).click();
  await expect(page.getByRole("status")).toContainText("Rules valid");
  expect(errors).toEqual([]);
});
test("production shell survives a reload without a network connection", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Greenhaven Valley" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByLabel("What did you do?").selectOption("pushups");
  await page.getByRole("button", { name: "Let it grow" }).click();
  await expect(page.getByRole("status")).toContainText("3 ore");
});
test("desktop layout and save import validation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/village-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open settings" }).click();
  const original = await page.evaluate(() =>
    localStorage.getItem("living-world.save"),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schema":99}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Unsupported or damaged save",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("living-world.save")),
  ).toBe(original);
});

test("all built places use complete artwork and keyboard navigation", async ({
  page,
}) => {
  const { fresh } = await import("../src/engine");
  const s = fresh(Date.now());
  s.buildings = ["hall", "sawmill", "blacksmith", "kitchen", "farm", "hall2"];
  await page.addInitScript(
    (save) => localStorage.setItem("living-world.save", JSON.stringify(save)),
    s,
  );
  await page.goto("/");
  const map = page.getByRole("region", { name: "Greenhaven settlement map" });
  await expect(map.getByRole("button")).toHaveCount(5);
  await expect
    .poll(() =>
      map
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (img) =>
              (img as HTMLImageElement).complete &&
              (img as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/village-developed.png",
    fullPage: true,
  });
  await map.getByRole("button", { name: "Visit Blacksmith" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Village workshops" }),
  ).toBeVisible();
});
test("keyboard logger closes and restores focus", async ({ page }) => {
  await page.goto("/");
  const launch = page.getByRole("button", { name: "Record an accomplishment" });
  await launch.click();
  await expect(page.getByLabel("What did you do?")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(launch).toBeFocused();
});
test("stale tab cannot overwrite a newer world", async ({ page, context }) => {
  await page.goto("/");
  const second = await context.newPage();
  await second.goto("/");
  await second
    .getByRole("button", { name: "Record an accomplishment" })
    .click();
  await second.getByRole("button", { name: "Let it grow" }).click();
  await expect(second.getByRole("status")).toContainText("5 wood");
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByRole("button", { name: "Let it grow" }).click();
  await expect(page.getByRole("status")).toContainText("another tab");
  const current = await second.evaluate(() =>
    JSON.parse(localStorage.getItem("living-world.save")!),
  );
  expect(current.logs).toHaveLength(1);
});
