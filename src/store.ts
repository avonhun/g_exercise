import { fresh, migrate, type Save } from "./engine";
const GUEST_KEY = "living-world.save";
export let KEY = "living-world.save";
export function useWorldScope(playerId?: string) {
  KEY = playerId ? GUEST_KEY + ".account." + playerId : GUEST_KEY;
  lastRead = undefined;
}
export function guestWorld() {
  const text = localStorage.getItem(GUEST_KEY);
  return text ? migrate(JSON.parse(text)) : null;
}
let lastRead: string | null | undefined;
export function load(): { save: Save; error?: string } {
  try {
    const text = localStorage.getItem(KEY);
    lastRead = text;
    return { save: text ? migrate(JSON.parse(text)) : fresh(Date.now()) };
  } catch {
    return {
      save: fresh(Date.now()),
      error:
        "Your existing save could not be read. It has not been overwritten. Export the recovery data before starting a new world.",
    };
  }
}
export function persist(s: Save) {
  const current = localStorage.getItem(KEY);
  if (lastRead !== undefined && current !== lastRead)
    throw Error(
      "Your world changed in another tab. Reload this page to continue with the latest save.",
    );
  const text = JSON.stringify(s);
  if (KEY !== GUEST_KEY) localStorage.setItem(KEY + ".dirty", "true");
  localStorage.setItem(KEY, text);
  lastRead = text;
}
export function backup() {
  const old = localStorage.getItem(KEY);
  if (old) localStorage.setItem(KEY + ".backup", old);
}
export function restore() {
  const old = localStorage.getItem(KEY + ".backup");
  if (!old) throw Error("No backup yet");
  return migrate(JSON.parse(old));
}
export function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function recovery() {
  download(localStorage.getItem(KEY) || "{}", "living-world-recovery.json");
}
