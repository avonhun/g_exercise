import { test, expect } from "@playwright/test";
test("mobile activity, building, crafting, correction, saves and console", async ({
  page,
}) => {
  await page.clock.install();
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
  await expect(page.getByRole("status")).toContainText("construction started");
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await expect(
    page.getByRole("img", { name: "Building Sawmill", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering wood" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Visit Sawmill" })).toHaveCount(
    0,
  );
  await page.clock.fastForward(4 * 3600000 + 15000);
  await expect(
    page.getByRole("button", { name: "Visit Sawmill" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering wood" }),
  ).toHaveCount(0);
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

test("village fills phone width without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const box = await page.locator(".world-landscape").boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x)).toBeLessThan(1);
    expect(Math.abs(box!.width - width)).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Workshops", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open settings" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("consistent game typography, labelled resources and a single accomplishment action", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("button", { name: "Record an accomplishment", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Log a little good", { exact: false }),
  ).toHaveCount(0);
  await expect(page.locator(".objective-number")).toHaveCount(0);
  await expect(page.locator(".map-footer")).toContainText("1 building");
  await expect(page.locator(".chapter")).not.toContainText("SETTLEMENT");
  const resources = page.getByLabel("Inventory").locator(".resource-name");
  await expect(resources).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    const icon = await resources.nth(i).locator("svg").boundingBox();
    const word = await resources.nth(i).locator("span").boundingBox();
    expect(icon!.x + icon!.width).toBeLessThanOrEqual(word!.x);
    expect(Math.abs(icon!.y - word!.y)).toBeLessThan(5);
  }
  const fontStyles = await page
    .locator(
      ".chapter h1,.objective h3,.objective p,.requirements,.objective small",
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const s = getComputedStyle(node);
        return { family: s.fontFamily, size: s.fontSize, style: s.fontStyle };
      }),
    );
  expect(new Set(fontStyles.map((s) => s.family)).size).toBe(1);
  expect(fontStyles.every((s) => s.style === "normal")).toBe(true);
  expect(new Set(fontStyles.map((s) => s.size))).toEqual(
    new Set(["18px", "14px"]),
  );
  const article = page.locator(".objective").first();
  expect((await article.boundingBox())!.height).toBeLessThan(230);
  await page
    .getByRole("button", { name: "Record an accomplishment", exact: true })
    .click();
  await expect(
    page.getByLabel("What did you do?").locator("option[value=walk]"),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("What did you do?").locator("option[value=pushups]"),
  ).toHaveCount(1);
});

test("visible crews gather gradually, build in sequence, and rest when work finishes", async ({
  page,
}) => {
  const { fresh, log, build } = await import("../src/engine");
  const now = Date.UTC(2026, 9, 28, 12);
  const save = fresh(now);
  for (const [id, type, amount] of [
    ["scene-walk", "walk", 10],
    ["scene-gym", "gym", 0],
    ["scene-meal", "meal", 0],
  ] as const)
    log(
      save,
      { id, type, amount, at: now, notes: "Automated scene test" },
      now,
    );
  build(save, "sawmill", now);
  build(save, "farm", now);
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript((s) => {
    if (!localStorage.getItem("living-world.save"))
      localStorage.setItem("living-world.save", JSON.stringify(s));
  }, save);
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering wood" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering ore" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Building Sawmill", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Queued construction: Kitchen garden" }),
  ).toBeVisible();
  const arm = page.locator(".gather-wood .worker-arm");
  expect(await arm.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "work-swing",
  );
  expect(
    await arm.evaluate((el) =>
      el.getAnimations().some((a) => a.playState === "running"),
    ),
  ).toBe(true);
  await page.clock.fastForward(15 * 60000);
  await page.screenshot({
    path: "test-results/village-working-mobile.png",
    fullPage: true,
  });
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("living-world.save")!),
  );
  expect(stored.inventory.wood).toBeLessThan(15);
  expect(stored.inventory.ore).toBeGreaterThan(0);
  expect(stored.inventory.ore).toBeLessThan(40);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/village-working-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await arm.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.fastForward(2 * 3600000);
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering wood" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Building Sawmill", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(2 * 3600000);
  await expect(
    page.getByRole("button", { name: "Visit Sawmill" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Building Kitchen garden", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(4 * 3600000);
  await expect(
    page.getByRole("img", { name: "Townsfolk gathering ore" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Visit Kitchen garden" }),
  ).toBeVisible();
  await expect(page.locator(".construction-site")).toHaveCount(0);
});

test("hidden tabs cannot repeatedly spend the offline allowance", async ({
  page,
}) => {
  const { fresh, log } = await import("../src/engine");
  const now = Date.UTC(2026, 9, 28, 12);
  const s = fresh(now);
  s.rules.offlineHours = 1;
  log(s, { id: "absence-gym", type: "gym", at: now, amount: 0 }, now);
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript(
    (save) => localStorage.setItem("living-world.save", JSON.stringify(save)),
    s,
  );
  await page.goto("/");
  await page.evaluate(() =>
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    }),
  );
  await page.clock.fastForward(10 * 86400000);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("living-world.save")!).inventory.ore,
    ),
  ).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("living-world.save")!).inventory.ore,
      ),
    )
    .toBe(5);
});

test("unavailable build buttons explain requirements instead of swallowing taps", async ({
  page,
}) => {
  const { fresh } = await import("../src/engine");
  const save = fresh(Date.now());
  save.inventory.wood = 35;
  save.inventory.stone = 20;
  save.ledger[0].delta.wood = 35;
  save.ledger[0].delta.stone = 20;
  await page.addInitScript((s) => {
    if (!localStorage.getItem("living-world.save"))
      localStorage.setItem("living-world.save", JSON.stringify(s));
  }, save);
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Build sawmill",
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole("status")).toContainText(
    "Requires: a logged walk of at least 5 minutes",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("living-world.save")!).construction,
    ),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByRole("button", { name: "Let it grow" }).click();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await button.click();
  await expect(page.getByRole("status")).toContainText("construction started");
  await expect(
    page.getByRole("img", { name: "Building Sawmill", exact: true }),
  ).toBeVisible();
  await expect(button).toHaveText("Building");
  await expect(button).toBeDisabled();
  const result = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("living-world.save")!),
  );
  expect(result.construction).toHaveLength(1);
  expect(result.inventory.wood).toBeCloseTo(15, 2);
  expect(result.inventory.stone).toBeCloseTo(10, 2);
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Building Sawmill", exact: true }),
  ).toBeVisible();
});
test("material shortages are explained in both construction views", async ({
  page,
}) => {
  const { fresh, log } = await import("../src/engine");
  const now = Date.now();
  const save = fresh(now);
  save.rules.buildings.sawmill.cost.wood = 60;
  log(save, { id: "build-check-walk", type: "walk", at: now, amount: 10 }, now);
  await page.addInitScript((s) => {
    if (!localStorage.getItem("living-world.save"))
      localStorage.setItem("living-world.save", JSON.stringify(s));
  }, save);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Build sawmill", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Need 15 more wood");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("living-world.save")!).inventory.wood,
    ),
  ).toBe(45);
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.getByRole("button", { name: "Workshops", exact: true }).click();
  await page
    .getByRole("button", { name: "Build sawmill", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Need 15 more wood");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("living-world.save")!).construction,
    ),
  ).toHaveLength(0);
});
