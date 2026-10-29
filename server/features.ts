// Accounts stay parked until both the UI build and server are explicitly enabled.
export function accountsEnabled() {
  return process.env.ENABLE_ACCOUNTS === "true";
}
