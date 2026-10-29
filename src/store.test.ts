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
it("isolates player saves and keeps the original guest world", async () => {
  const store = await import("./store");
  const guest = store.load().save;
  store.persist(guest);
  store.useWorldScope("alice");
  const a = store.load().save;
  a.discoveries = ["brook"];
  store.persist(a);
  store.useWorldScope("bob");
  expect(store.load().save.discoveries).toEqual([]);
  store.useWorldScope("alice");
  expect(store.load().save.discoveries).toEqual(["brook"]);
  store.useWorldScope();
  expect(store.load().save).toEqual(guest);
});
it("archives an old snapshot once before migrating the active world", async () => {
  const store = await import("./store");
  const old = JSON.parse(JSON.stringify(fresh(Date.now())));
  old.schema = 2;
  delete old.workClock;
  delete old.gathering;
  delete old.construction;
  const raw = JSON.stringify(old);
  data.set(store.KEY, raw);
  const result = store.load();
  expect(result.error).toBeUndefined();
  expect(result.save.schema).toBe(3);
  expect(data.get(store.KEY + ".pre-v3")).toBe(raw);
  store.persist(result.save);
  store.load();
  expect(data.get(store.KEY + ".pre-v3")).toBe(raw);
});
it("rejects a late timer write after the active account changes", async () => {
  const store = await import("./store");
  store.useWorldScope("alice");
  const a = store.load().save,
    key = store.KEY;
  store.useWorldScope("bob");
  expect(() => store.persist(a, key)).toThrow("no longer active");
  expect(data.get(store.KEY)).toBeUndefined();
});
