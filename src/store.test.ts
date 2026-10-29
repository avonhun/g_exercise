import { it, expect, vi, beforeEach } from "vitest";
import { fresh } from "./engine";
const data = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  data.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
});
it("refuses to overwrite an independently changed save", async () => {
  const store = await import("./store");
  const s = store.load().save;
  store.persist(s);
  const other = fresh(Date.now() + 1);
  data.set(store.KEY, JSON.stringify(other));
  expect(() => store.persist(s)).toThrow("another tab");
  expect(data.get(store.KEY)).toBe(JSON.stringify(other));
});
it("keeps a backup through replacement and restores it", async () => {
  const store = await import("./store");
  const s = store.load().save;
  store.persist(s);
  store.backup();
  const other = fresh(Date.now() + 1000);
  store.persist(other);
  expect(store.restore()).toEqual(s);
});
it("preserves malformed raw saves for recovery", async () => {
  const store = await import("./store");
  data.set(store.KEY, "invalid");
  expect(store.load().error).toBeTruthy();
  expect(data.get(store.KEY)).toBe("invalid");
});
