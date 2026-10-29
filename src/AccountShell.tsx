import { useEffect, useRef, useState, type ReactNode } from "react";
import { fresh, migrate, type Save } from "./engine";
import {
  useWorldScope,
  guestWorld,
  load,
  persist,
  KEY,
  download,
} from "./store";
interface Player {
  id: string;
  username: string;
}
interface Cloud {
  revision: number;
  save: Save | null;
}
async function api<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/account?action=" + action, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(
      "Account service is unavailable. You can still play as a guest.",
    );
  }
  if (!response.ok)
    throw Object.assign(Error(data.error || "Account request failed"), {
      status: response.status,
    });
  return data;
}
export function AccountShell({
  renderGame,
}: {
  renderGame: (control: ReactNode, key: string) => ReactNode;
}) {
  const [player, setPlayer] = useState<Player | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [panel, setPanel] = useState(false);
  const [register, setRegister] = useState(false);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sync, setSync] = useState("On-device guest world");
  const [pending, setPending] = useState<Player | null>(null);
  const [conflict, setConflict] = useState<Cloud | null>(null);
  const [generation, setGeneration] = useState(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const authEpoch = useRef(0);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".account-modal");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      dialog?.querySelector<HTMLElement>("input") ||
      dialog?.querySelector<HTMLElement>("button")
    )?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) setPanel(false);
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      }
      if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [panel]);
  function activate(p: Player | null) {
    setExpired(false);
    playerRef.current = p;
    setPlayer(p);
    setGeneration((g) => g + 1);
  }
  function install(p: Player, save: Save, revision: number) {
    useWorldScope(p.id);
    load();
    persist(save);
    localStorage.setItem(KEY + ".revision", String(revision));
    localStorage.removeItem(KEY + ".dirty");
    activate(p);
    setPending(null);
    setPanel(false);
    setError("");
    setSync("World saved on this device");
  }
  async function enter(p: Player, epoch = authEpoch.current) {
    const cloud = await api<Cloud>("world");
    if (epoch !== authEpoch.current || !mounted.current) return;
    const key = "living-world.save.account." + p.id;
    const dirty = localStorage.getItem(key + ".dirty");
    const revision = Number(localStorage.getItem(key + ".revision") || 0);
    const cached = localStorage.getItem(key);
    if (!cloud.save && !(dirty && cached)) {
      setPending(p);
      setPanel(true);
      return;
    }
    if (dirty && cached) {
      if (revision !== cloud.revision) {
        useWorldScope(p.id);
        load();
        activate(p);
        setConflict(cloud);
        setPanel(true);
        setSync("Sync conflict: both worlds are preserved");
        return;
      }
      useWorldScope(p.id);
      load();
      activate(p);
      setPanel(false);
      setSync("Unsynced changes on this device");
      return;
    }
    install(p, migrate(cloud.save), cloud.revision);
    setSync("Cloud world loaded");
  }
  useEffect(() => {
    mounted.current = true;
    const epoch = authEpoch.current;
    api<{ player: Player | null }>("session")
      .then((r) => {
        if (r.player && mounted.current && epoch === authEpoch.current)
          return enter(r.player, epoch);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, []);
  async function upload() {
    const p = playerRef.current;
    if (!p || inFlight.current || conflict) return;
    inFlight.current = true;
    const key = "living-world.save.account." + p.id;
    const text = localStorage.getItem(key);
    if (!text) {
      inFlight.current = false;
      return;
    }
    try {
      setSync("Saving to your account…");
      const revision = Number(localStorage.getItem(key + ".revision") || 0);
      const result = await api<{ revision: number }>("world", {
        revision,
        save: JSON.parse(text),
      });
      localStorage.setItem(key + ".revision", String(result.revision));
      if (localStorage.getItem(key) === text)
        localStorage.removeItem(key + ".dirty");
      if (playerRef.current?.id === p.id) setSync("Saved to your account");
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) {
        setExpired(true);
        setRegister(false);
        setPanel(true);
      }
      if (status === 409) {
        try {
          setConflict(await api<Cloud>("world"));
          setPanel(true);
        } catch {}
      }
      if (playerRef.current?.id === p.id)
        setSync(
          status === 401
            ? "Session expired. Export your world, then sign in again."
            : status === 409
              ? "Sync paused: another device has a newer world"
              : "Offline or unavailable: changes remain on this device",
        );
    } finally {
      inFlight.current = false;
    }
  }
  useEffect(() => {
    if (!player) return;
    const timer = setInterval(() => {
      if (
        localStorage.getItem(
          "living-world.save.account." + player.id + ".dirty",
        )
      )
        void upload();
    }, 10000);
    const online = () => void upload();
    window.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [player, conflict]);
  async function signOut() {
    authEpoch.current++;
    setBusy(true);
    setError("");
    try {
      if (localStorage.getItem(KEY + ".dirty")) await upload();
      if (localStorage.getItem(KEY + ".dirty"))
        throw Error(
          "Your changes have not synced yet. Export this world or resolve the conflict before signing out.",
        );
      await api("logout", {});
      useWorldScope();
      activate(null);
      setConflict(null);
      setPending(null);
      setPanel(false);
      setSync("On-device guest world");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const control = (
    <button
      className="account-button"
      onClick={() => {
        setError("");
        setPanel(true);
      }}
      aria-label="Open account"
    >
      {player ? player.username : "Sign in"}
    </button>
  );
  return (
    <>
      {renderGame(control, (player?.id || "guest") + ":" + generation)}
      <div className="sync-indicator" aria-live="polite">
        {sync}
      </div>
      {panel && (
        <div className="modal-backdrop">
          <section
            className="modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
          >
            <button
              className="close"
              aria-label="Close account"
              disabled={busy}
              onClick={() => setPanel(false)}
            >
              ×
            </button>
            <span className="eyebrow">YOUR OWN CORNER OF THE WORLD</span>
            <h2 id="account-title">
              {pending
                ? "Choose your beginning"
                : player && !expired
                  ? "Your account"
                  : register
                    ? "Put down roots"
                    : "Welcome back"}
            </h2>
            {error && (
              <p role="alert" className="account-error">
                {error}
              </p>
            )}
            {pending ? (
              <>
                <p>
                  This account has no world yet. Start fresh, or bring the guest
                  world from this device. Other players’ worlds are never
                  imported automatically.
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => install(pending, fresh(Date.now()), 0)}
                >
                  Start a new world
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    try {
                      const s = guestWorld();
                      if (!s) throw Error("No guest world was found");
                      install(pending, s, 0);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Bring my guest world
                </button>
                <p className="subtle">
                  Your original guest save stays on this device as a separate
                  copy.
                </p>
              </>
            ) : player && !expired ? (
              <>
                <p>
                  Signed in as <strong>{player.username}</strong>. Your worlds
                  are private. Signing out returns to this device’s separate
                  guest world.
                </p>
                <p className="log-rule">{sync}</p>
                {conflict && (
                  <div className="warning">
                    <strong>Two versions of your world exist.</strong>
                    <p>
                      Export this device’s copy before loading the newer cloud
                      world. No automatic merge will spend or award resources
                      twice.
                    </p>
                    <button
                      onClick={() =>
                        download(
                          localStorage.getItem(KEY) || "{}",
                          "living-world-unsynced.json",
                        )
                      }
                    >
                      Export device world
                    </button>
                    <button
                      onClick={() => {
                        if (conflict.save) {
                          install(
                            player,
                            migrate(conflict.save),
                            conflict.revision,
                          );
                          setConflict(null);
                          setSync("Cloud world loaded");
                        }
                      }}
                    >
                      Load cloud world
                    </button>
                  </div>
                )}
                <div className="button-group">
                  <button
                    disabled={busy || !!conflict}
                    onClick={() => void upload()}
                  >
                    Sync now
                  </button>
                  <button
                    disabled={busy || !!conflict}
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                </div>
                <details>
                  <summary>Change password</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const data = new FormData(form);
                      authEpoch.current++;
                      setBusy(true);
                      try {
                        await api("password", {
                          currentPassword: data.get("current"),
                          newPassword: data.get("next"),
                        });
                        form.reset();
                        setError(
                          "Password changed. Other sessions were signed out.",
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Current password
                      <input
                        name="current"
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={12}
                        maxLength={128}
                      />
                    </label>
                    <label>
                      New password
                      <input
                        name="next"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                      />
                    </label>
                    <button disabled={busy}>Change password</button>
                  </form>
                </details>
              </>
            ) : (
              <>
                <div className="account-tabs">
                  <button
                    aria-pressed={!register}
                    onClick={() => {
                      setRegister(false);
                      setError("");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    aria-pressed={register}
                    disabled={expired}
                    onClick={() => {
                      setRegister(true);
                      setError("");
                    }}
                  >
                    Create account
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    authEpoch.current++;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await api<{ player: Player }>(
                        register ? "register" : "login",
                        {
                          username: data.get("username"),
                          password: data.get("password"),
                        },
                      );
                      form.reset();
                      await enter(result.player);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Username
                    <input
                      name="username"
                      defaultValue={expired ? player?.username : undefined}
                      readOnly={expired}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      pattern="[a-zA-Z0-9_]{3,30}"
                      minLength={3}
                      maxLength={30}
                      required
                      placeholder="Choose a name for the village ledger"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                      minLength={12}
                      maxLength={128}
                      required
                    />
                  </label>
                  {register && (
                    <p className="subtle">
                      Use at least 12 characters. Keep your password in a
                      password manager; email password recovery is not available
                      yet.
                    </p>
                  )}
                  <button className="primary" disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : register
                        ? "Create my account"
                        : "Sign in to my world"}
                  </button>
                </form>
                <p className="subtle">
                  An essential cookie keeps you signed in for up to 30 days. No
                  advertising cookies. Account worlds—including activity and
                  meal logs—are stored privately on the server and cached on
                  your device. Guest play remains available without an account.
                </p>
                <button disabled={busy} onClick={() => setPanel(false)}>
                  Continue as guest
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
