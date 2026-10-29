import { test, expect } from "@playwright/test";
test("guest-only production starts without a database and never requests accounts", async ({
  page,
  request,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/account")) calls.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Greenhaven Valley" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open account" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Sign in", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Record an accomplishment" }).click();
  await page.getByRole("button", { name: "Let it grow" }).click();
  await expect(page.getByRole("status")).toContainText("Work queued");
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("living-world.save")!).logs.length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByText(
      "Your world and activity history are saved only in this browser",
      { exact: false },
    ),
  ).toBeVisible();
  expect(calls).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
  const health = await request.get("/healthz");
  expect(health.status()).toBe(200);
  expect(await health.text()).toBe("ok");
  for (const action of ["session", "world"]) {
    const r = await request.get("/api/account?action=" + action);
    expect(r.status()).toBe(404);
    expect(r.headers()["set-cookie"]).toBeUndefined();
  }
  const registration = await request.post("/api/account?action=register", {
    headers: { Origin: "http://127.0.0.1:4173" },
    data: { username: "paused", password: "a long test password" },
  });
  expect(registration.status()).toBe(404);
});
