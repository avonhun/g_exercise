/// <reference types="vite/client" />
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  activityNames,
  afford,
  applyRules,
  build,
  calendar,
  count,
  consecutive,
  explore,
  fulfill,
  fresh,
  log,
  migrate,
  orders,
  queue,
  requirements,
  resources,
  reverse,
  simulate,
  tick,
  trade,
  validateRules,
  type Activity,
  type Bag,
  type Save,
} from "./engine";
import {
  backup,
  download,
  load,
  persist,
  recovery,
  restore,
  migrationBackup,
  KEY,
} from "./store";
import { World, Portrait } from "./World";
import { Icon } from "./Icon";
import { ResourceName, ResourceAmounts } from "./Resources";
import { WorkPanel } from "./WorkPanel";
import { fraction, durationLabel } from "./work";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-600.css";
import "./style.css";
import { AccountShell } from "./AccountShell";
function bag(b: Bag) {
  return Object.entries(b)
    .filter(([, v]) => v)
    .map(([k, v]) => `${Math.round(v! * 10) / 10} ${k}`)
    .join(" · ");
}
function App({ accountControl }: { accountControl: React.ReactNode }) {
  const [worldKey] = useState(() => KEY);
  const [initial] = useState(load);
  const [save, setSave] = useState(initial.save);
  const [tab, setTab] = useState("village");
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(initial.error || "");
  const [saved, setSaved] = useState("");
  const [logger, setLogger] = useState(false);
  const [type, setType] = useState<Activity>("walk");
  const [at, setAt] = useState(localTime());
  const [amount, setAmount] = useState("10");
  const [notes, setNotes] = useState("");
  const [dev, setDev] = useState(false);
  const [editor, setEditor] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [simulation, setSimulation] = useState("");
  const [days, setDays] = useState(30);
  const [scenario, setScenario] = useState("rest");
  const [selected, setSelected] = useState("");
  const [resetPhrase, setResetPhrase] = useState("");
  useEffect(() => {
    if (!logger) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".modal");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.querySelector<HTMLElement>("select")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogger(false);
      if (event.key !== "Tab" || !modal) return;
      const targets = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      const first = targets[0],
        last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [logger]);
  function openLogger() {
    setAt(localTime());
    setLogger(true);
  }
  function commit(fn: (s: Save) => void) {
    if (storageError) {
      setMessage("Resolve the save recovery warning first.");
      return;
    }
    try {
      const s = structuredClone(save);
      tick(s, Date.now());
      fn(s);
      persist(s, worldKey);
      setSave(s);
      setSaved(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    if (storageError) return;
    const advance = (foreground: boolean) => {
      setSave((prev) => {
        try {
          const s = structuredClone(prev);
          tick(s, Date.now(), {
            active: foreground && Date.now() - s.clock <= 30000,
          });
          persist(s, worldKey);
          return s;
        } catch (e) {
          setStorageError(
            (e as Error).message ||
              "Could not save this world. Export before closing.",
          );
          return prev;
        }
      });
    };
    const id = setInterval(() => {
      if (document.visibilityState === "visible") advance(true);
    }, 15000);
    const visibility = () => {
      if (document.visibilityState === "visible") advance(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [storageError]);
  useEffect(() => {
    if (!storageError) {
      try {
        const s = structuredClone(initial.save);
        tick(s, Date.now());
        persist(s, worldKey);
        setSave(s);
        setSaved("just now");
      } catch {
        setStorageError(
          "Could not save to this browser. Export before closing.",
        );
      }
    }
  }, []);
  function action(fn: (s: Save) => void, text: string) {
    commit((s) => {
      fn(s);
      setMessage(text);
    });
  }
  function exportSave() {
    download(JSON.stringify(save, null, 2), "living-world-backup.json");
  }
  function importSave(file: File) {
    file.text().then((text) => {
      try {
        const s = migrate(JSON.parse(text));
        backup();
        persist(s, worldKey);
        setSave(s);
        setStorageError("");
        setMessage(
          "World restored. Your previous save is retained as the local backup.",
        );
      } catch (e) {
        setMessage((e as Error).message);
      }
    });
  }
  const activeJobs = save.jobs.filter((j) => !j.done);
  const visibleBuildings = Object.entries(save.rules.buildings).filter(
    ([id]) =>
      id !== "hall2" ||
      save.buildings.includes("blacksmith") ||
      save.buildings.includes("kitchen"),
  );
  return (
    <>
      <header className="topbar">
        <a
          href="#village"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setTab("village");
          }}
        >
          <span className="brand-icon">
            <Icon name="crest" />
          </span>
          <span>The Living World</span>
        </a>
        <div className="header-controls">
          {accountControl}
          <button
            className="round"
            aria-label="Open settings"
            onClick={() => setTab("settings")}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <main>
        <section className="chapter">
          <h1>Greenhaven Valley</h1>
          <div className="weather">
            <Icon name="sun" /> <span>Clear skies</span>
          </div>
        </section>
        {storageError && (
          <div className="warning">
            {storageError}
            <button onClick={recovery}>Export recovery data</button>
            <button onClick={() => location.reload()}>
              Reload latest world
            </button>
            <label className="button">
              Import backup
              <input
                type="file"
                accept="application/json"
                onChange={(e) =>
                  e.target.files?.[0] && importSave(e.target.files[0])
                }
              />
            </label>
          </div>
        )}
        <div className="resource-bar" aria-label="Inventory">
          {resources
            .filter((r) =>
              ["wood", "stone", "ore", "momentum", "food", "herbs"].includes(r),
            )
            .map((r) => (
              <div key={r}>
                <ResourceName name={r} />
                <span className="resource-count">
                  {Math.floor(save.inventory[r])}
                </span>
              </div>
            ))}
        </div>
        {tab === "village" && (
          <>
            <div className="village-layout">
              <section className="map-panel">
                <World
                  save={save}
                  onSelect={(id) => {
                    setSelected(id);
                    setTab("workshops");
                  }}
                />
                <div className="map-footer">
                  <span>
                    {save.buildings.filter((id) => id !== "hall2").length}{" "}
                    {save.buildings.filter((id) => id !== "hall2").length === 1
                      ? "building"
                      : "buildings"}
                  </span>
                  <button className="primary" onClick={openLogger}>
                    Record an accomplishment
                  </button>
                </div>
              </section>
              <aside className="village-sidebar">
                <WorkPanel save={save} />
                <section className="story-card">
                  <div className="character">
                    <Portrait />
                    <div>
                      <h2>Mara</h2>
                      <span>Village keeper</span>
                    </div>
                  </div>
                  <blockquote>
                    “A village grows much like a good habit. A little care, a
                    little patience—and one day, you look up to find something
                    wonderful.”
                  </blockquote>
                  <p>
                    Your walks, shared meals, and hard-earned workouts give this
                    place its life.
                  </p>
                </section>
                <section className="section-heading">
                  <h2>Construction</h2>
                </section>
                <div className="objective-grid">
                  {visibleBuildings
                    .filter(([id]) => !save.buildings.includes(id))
                    .slice(0, 3)
                    .map(([id, b]) => (
                      <article className="objective" key={id}>
                        <h3>{b.name}</h3>
                        <p>
                          {id === "sawmill"
                            ? "Turns wood into planks."
                            : id === "farm"
                              ? "Produces a small daily food supply."
                              : id === "blacksmith"
                                ? "Turns ore into metal fittings."
                                : "Adds new options to the village."}
                        </p>
                        <div className="requirements">
                          {requirements(save, id).length
                            ? requirements(save, id).join(" · ")
                            : "Accomplishments earned"}
                        </div>
                        <small>
                          {b.hours}h to build ·{" "}
                          <ResourceAmounts amounts={b.cost} />
                        </small>
                        {save.construction
                          .filter((j) => j.building === id && !j.done)
                          .map((j) => (
                            <div className="construction-status" key={j.id}>
                              <progress
                                aria-label={b.name + " construction progress"}
                                value={fraction(j, save.workClock)}
                                max={1}
                              />
                              <span>
                                {j.start > save.workClock
                                  ? "Queued · starts in " +
                                    durationLabel(j.start - save.workClock)
                                  : "Building · " +
                                    durationLabel(j.end - save.workClock) +
                                    " remaining"}
                              </span>
                            </div>
                          ))}
                        <button
                          aria-label={"Build " + b.name.toLowerCase()}
                          onClick={() =>
                            action(
                              (s) => build(s, id, Date.now()),
                              b.name +
                                " construction queued. Materials reserved.",
                            )
                          }
                          disabled={
                            requirements(save, id).length > 0 ||
                            !afford(save, b.cost) ||
                            save.construction.some(
                              (j) => j.building === id && !j.done,
                            )
                          }
                        >
                          {save.construction.some(
                            (j) => j.building === id && !j.done,
                          )
                            ? save.construction.some(
                                (j) =>
                                  j.building === id &&
                                  !j.done &&
                                  j.start <= save.workClock,
                              )
                              ? "Building"
                              : "Queued"
                            : "Build"}
                        </button>
                      </article>
                    ))}
                </div>
              </aside>
            </div>
            {save.buildings.includes("hall2") && !save.discoveries.length && (
              <article className="discovery">
                <span>AN UNFAMILIAR PATH</span>
                <h2>Beyond the willow bend</h2>
                <p>
                  A trail has appeared on Mara’s old map. Prepare a small
                  expedition and see where it leads.
                </p>
                <small>10 rations · 10 planks · 10 momentum</small>
                <button
                  onClick={() =>
                    action(
                      (s) => explore(s, Date.now()),
                      "You found Stillwater Brook. The valley has more stories to tell.",
                    )
                  }
                >
                  Follow the trail
                </button>
              </article>
            )}
            {save.discoveries.includes("brook") && (
              <article className="discovery">
                <span>A PLACE YOU DISCOVERED</span>
                <h2>Stillwater Brook</h2>
                <p>
                  Silver water, wild herbs, and the remains of an old
                  waystation. A place for a future connection, supplied by
                  Greenhaven’s timber and kitchens.
                </p>
                <small>
                  Charted permanently · Regional logistics planned for a later
                  release
                </small>
              </article>
            )}
          </>
        )}
        {tab === "workshops" && (
          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE WORK OF MANY HANDS</span>
                <h2>Village workshops</h2>
              </div>
            </div>
            <p className="subtle">
              Inputs are reserved when queued. Each workshop holds three jobs,
              worked in order. You can close the app.
            </p>
            <div className="objective-grid">
              {Object.entries(save.rules.recipes).map(([id, r]) => (
                <article
                  className={
                    "objective " + (selected === r.building ? "highlight" : "")
                  }
                  key={id}
                >
                  <span className="eyebrow">
                    {r.building === "hall"
                      ? "Gathering hall"
                      : save.rules.buildings[r.building]?.name}
                  </span>
                  <h3>{r.name}</h3>
                  <p>
                    <ResourceAmounts amounts={r.input} />
                    <br />
                    <Icon name="down" className="craft-arrow" />
                    <br />
                    <ResourceAmounts amounts={r.output} />
                  </p>
                  <small>{r.hours} hours per batch</small>
                  <button
                    disabled={!save.buildings.includes(r.building)}
                    onClick={() =>
                      action(
                        (s) => queue(s, id, crypto.randomUUID(), Date.now()),
                        "Your workshop has a new task.",
                      )
                    }
                  >
                    {save.buildings.includes(r.building)
                      ? "Queue a batch"
                      : "Build workshop first"}
                  </button>
                </article>
              ))}
            </div>
            <h2>On the workbench</h2>
            {!activeJobs.length && (
              <p className="empty">
                The workbenches are quiet. Queue a batch above when you’re
                ready.
              </p>
            )}
            {activeJobs.map((j) => (
              <div className="row" key={j.id}>
                <span>
                  {save.rules.recipes[j.recipe]?.name}
                  <small>{bag(j.output)}</small>
                </span>
                <span>
                  {Math.max(1, Math.ceil((j.end - save.workClock) / 60000))} min
                  remaining
                </span>
              </div>
            ))}
            <div className="section-heading">
              <h2>Village construction</h2>
            </div>
            {visibleBuildings.map(([id, b]) => (
              <div className="row" key={id}>
                <div>
                  <strong>{b.name}</strong>
                  <small>
                    {save.buildings.includes(id)
                      ? "Built · permanent"
                      : save.construction.some(
                            (j) => j.building === id && !j.done,
                          )
                        ? "Under construction · " +
                          durationLabel(
                            save.construction.find(
                              (j) => j.building === id && !j.done,
                            )!.end - save.workClock,
                          ) +
                          " remaining"
                        : requirements(save, id).join(" · ") ||
                          "Credentials complete"}
                    <br />
                    {!save.buildings.includes(id) && (
                      <ResourceAmounts amounts={b.cost} />
                    )}
                  </small>
                </div>
                {!save.buildings.includes(id) && (
                  <button
                    onClick={() =>
                      action(
                        (s) => build(s, id, Date.now()),
                        b.name + " construction queued. Materials reserved.",
                      )
                    }
                    disabled={
                      requirements(save, id).length > 0 ||
                      !afford(save, b.cost) ||
                      save.construction.some(
                        (j) => j.building === id && !j.done,
                      )
                    }
                  >
                    {save.construction.some((j) => j.building === id && !j.done)
                      ? save.construction.some(
                          (j) =>
                            j.building === id &&
                            !j.done &&
                            j.start <= save.workClock,
                        )
                        ? "Building"
                        : "Queued"
                      : "Build"}
                  </button>
                )}
              </div>
            ))}
          </section>
        )}
        {tab === "journal" && (
          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE THINGS THAT TAKE ROOT</span>
                <h2>Your journal</h2>
              </div>
              <button className="primary" onClick={() => openLogger()}>
                Record an accomplishment
              </button>
            </div>
            <p className="subtle">
              No missed-day penalties. Every earned credential stays with you.
            </p>
            <div className="habit-grid">
              {(
                [
                  "gym",
                  "hike",
                  "soccer",
                  "meal",
                  "walk",
                  "pushups",
                ] as Activity[]
              ).map((a) => (
                <article className="habit" key={a}>
                  <span>{activityNames[a]}</span>
                  <strong>{count(save, a)}</strong>
                  <small>
                    qualifying logs
                    {a === "gym"
                      ? ` · best ${consecutive(save, "gym")} consecutive weeks`
                      : ""}
                  </small>
                </article>
              ))}
            </div>
            <h2>Permanent milestones</h2>
            <div className="badges">
              {Object.keys(save.credentials).length ? (
                Object.keys(save.credentials).map((k) => (
                  <span key={k}>
                    <Icon name="crest" />{" "}
                    {activityNames[k.split(":")[0] as Activity]} ·{" "}
                    {k.split(":")[1] === "weeks3" ? "3 weeks" : k.split(":")[1]}
                  </span>
                ))
              ) : (
                <p className="subtle">
                  Your first real accomplishment will put down roots here.
                </p>
              )}
            </div>
            <h2>Recent entries</h2>
            <p className="subtle">
              Mistake? Reverse an entry, then log its replacement. Spent rewards
              are reconciled against future earnings; earned milestones stay
              permanent.
            </p>
            {[...save.logs]
              .reverse()
              .slice(0, 40)
              .map((l) => (
                <div className="row" key={l.id}>
                  <div>
                    <strong>
                      {activityNames[l.type]} {l.voided ? "· corrected" : ""}
                    </strong>
                    <small>
                      {new Date(l.at).toLocaleString()} · {l.amount}{" "}
                      {l.type === "pushups" ? "reps" : "minutes"}
                      <br />
                      {l.voided
                        ? "Reward reversed"
                        : l.qualified
                          ? (l.delivery === "gather"
                              ? "Gathering job: "
                              : "Legacy reward: ") + bag(l.reward)
                          : "Recorded without reward: threshold or daily cap"}
                      {l.notes && (
                        <>
                          <br />
                          {l.notes}
                        </>
                      )}
                    </small>
                  </div>
                  {!l.voided && (
                    <button
                      onClick={() =>
                        action(
                          (s) => reverse(s, l.id, Date.now()),
                          "Entry corrected. Historical credentials preserved.",
                        )
                      }
                    >
                      Reverse
                    </button>
                  )}
                </div>
              ))}
          </section>
        )}
        {tab === "requests" && (
          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">A VILLAGE IS ITS PEOPLE</span>
                <h2>The noticeboard</h2>
              </div>
            </div>
            <div className="objective-grid">
              {orders.map((o) => (
                <article className="objective" key={o.id}>
                  <span className="eyebrow">VILLAGE COMMISSION</span>
                  <h3>{o.name}</h3>
                  <p>{o.text}</p>
                  <small>
                    Deliver <ResourceAmounts amounts={o.cost} />
                    <br />
                    Receive <ResourceAmounts amounts={o.reward} />
                  </small>
                  <button
                    disabled={save.orders.includes(o.id)}
                    onClick={() =>
                      action(
                        (s) => fulfill(s, o.id, Date.now()),
                        "A little kindness goes a long way.",
                      )
                    }
                  >
                    {save.orders.includes(o.id)
                      ? "Delivered"
                      : "Deliver supplies"}
                  </button>
                </article>
              ))}
              <article className="objective">
                <span className="eyebrow">THE PASSING MERCHANT</span>
                <h3>A small exchange</h3>
                <p>
                  A few scraps of ore, for a fair price. Trading brings
                  supplies, never fitness credentials.
                </p>
                <small>8 gold → 8 ore · once per local day</small>
                <button
                  disabled={save.orders.includes(
                    "trade:" + calendar(Date.now()).day,
                  )}
                  onClick={() =>
                    action((s) => trade(s, Date.now()), "Trade complete.")
                  }
                >
                  Trade with merchant
                </button>
              </article>
            </div>
          </section>
        )}
        {tab === "stores" && (
          <section>
            <div className="section-heading">
              <div>
                <span className="eyebrow">SET ASIDE FOR TOMORROW</span>
                <h2>The storehouse</h2>
              </div>
            </div>
            <div className="habit-grid">
              {resources.map((r) => (
                <article className="habit" key={r}>
                  <span>
                    <Icon name={r} /> {r}
                  </span>
                  <strong>{Math.floor(save.inventory[r] * 10) / 10}</strong>
                  {!!save.debt[r] && (
                    <small>Correction debt: {save.debt[r]}</small>
                  )}
                </article>
              ))}
            </div>
            <h2>Slow, steady growth</h2>
            <p>
              Village workers gather {bag(save.rules.passive)} per day
              {!save.buildings.includes("farm")
                ? " (food begins after the garden is built)"
                : ""}
              . Offline accrual is capped at {save.rules.offlineHours} hours per
              absence. Nothing decays when life gets busy.
            </p>
            <p className="subtle">
              Momentum and strength accomplishments come from you. Passive
              supplies cannot open major progression gates.
            </p>
          </section>
        )}
        {tab === "settings" && (
          <section className="settings">
            <span className="eyebrow">YOUR WORLD, IN YOUR HANDS</span>
            <h2>Save & settings</h2>
            <p>
              Guest worlds stay in this browser. Signed-in worlds also sync
              privately to your account. Browser data can be cleared or evicted:
              keep a downloaded backup. Your account world includes your
              activity and meal logs. We use an essential sign-in cookie, with
              no advertising or analytics cookies.
            </p>
            <div className="button-group">
              <button onClick={exportSave}>Export world</button>
              {migrationBackup() && (
                <button
                  onClick={() =>
                    download(
                      migrationBackup()!,
                      "living-world-before-timed-work.json",
                    )
                  }
                >
                  Export pre-update backup
                </button>
              )}
              <button
                onClick={() => {
                  try {
                    backup();
                    setMessage(
                      "Local backup made. Download an export for a separate copy.",
                    );
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Make local backup
              </button>
              <label className="button">
                Import world
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) =>
                    e.target.files?.[0] && importSave(e.target.files[0])
                  }
                />
              </label>
              <button
                onClick={() => {
                  try {
                    const s = restore();
                    backup();
                    persist(s, worldKey);
                    setSave(s);
                    setStorageError("");
                    setMessage("Backup restored.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Restore local backup
              </button>
            </div>
            <p className="subtle">
              On iPhone: open in Safari, then Share → Add to Home Screen. The
              first visit needs a connection; the installed shell is cached for
              offline use.
            </p>
            <h2>Personal goals</h2>
            <p>
              For the next hall, choose three gym sessions (or three consecutive
              gym weeks), or a deliberate home-strength consistency alternative.
              This changes future requirements without deleting achievements.
            </p>
            <select
              aria-label="Strength goal"
              value={save.rules.strengthMode}
              onChange={(e) => {
                const mode = e.target.value as "gym" | "home";
                commit((s) => {
                  backup();
                  applyRules(s, {
                    ...s.rules,
                    strengthMode: mode,
                    strengthCount: mode === "home" ? 21 : 3,
                    buildings: {
                      ...s.rules.buildings,
                      blacksmith: {
                        ...s.rules.buildings.blacksmith,
                        goals: mode === "home" ? { pushups: 7 } : { gym: 1 },
                      },
                    },
                  });
                });
              }}
            >
              <option value="gym">Gym attendance</option>
              <option value="home">Home strength · 21 qualifying days</option>
            </select>
            <p className="subtle">
              Short walks have their own path. They don’t silently become hikes.
              Home strength substitutes only when you deliberately select it
              here.
            </p>
            <h2>Workshop behind the curtain</h2>
            <p>
              Developer tools affect this device only. They include balance
              rules, diagnostics, and optional spoilers. This gate prevents
              accidental edits; it is not account authentication.
            </p>
            <button
              onClick={() => {
                if (dev) {
                  setDev(false);
                } else {
                  setDev(true);
                  setEditor(JSON.stringify(save.rules, null, 2));
                }
              }}
            >
              {dev ? "Close developer tools" : "Enter developer console"}
            </button>
            {dev && (
              <div className="dev">
                <h2>Rules · version {save.rules.version}</h2>
                <p>
                  Full numeric configuration: activity thresholds/rewards/caps,
                  meal definition, passive rates, recipes, building costs and
                  dependencies. Future events only. A local backup is made
                  before applying changes.
                </p>
                <textarea
                  aria-label="Game rules JSON"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  rows={24}
                />
                <div className="button-group">
                  <button
                    onClick={() => {
                      try {
                        const r = JSON.parse(editor);
                        const errors = validateRules(r);
                        setMessage(
                          errors.length
                            ? errors.join("; ")
                            : "Rules valid. No missing or circular building dependencies detected.",
                        );
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    Validate rules
                  </button>
                  <button
                    onClick={() =>
                      commit((s) => {
                        const r = JSON.parse(editor);
                        backup();
                        applyRules(s, r);
                        setMessage(
                          "Rules updated for future events. Existing achievements and payouts retained.",
                        );
                      })
                    }
                  >
                    Back up & apply
                  </button>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={spoilers}
                    onChange={(e) => setSpoilers(e.target.checked)}
                  />{" "}
                  Reveal developer spoilers
                </label>
                {spoilers && (
                  <pre>
                    {JSON.stringify(
                      {
                        buildings: save.rules.buildings,
                        discovery: {
                          id: "brook",
                          requires: "hall2 + expedition supplies",
                          future:
                            "An interconnected regional outpost; logistics not yet implemented.",
                        },
                      },
                      null,
                      2,
                    )}
                  </pre>
                )}
                <h2>Dry-run economy</h2>
                <select
                  aria-label="Simulation days"
                  value={days}
                  onChange={(e) => setDays(+e.target.value)}
                >
                  {[30, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {n} days
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Simulation scenario"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="rest">No logs / missed workouts</option>
                  <option value="nutrition">One balanced meal daily</option>
                  <option value="routine">Gym & soccer weekly</option>
                </select>
                <button
                  onClick={() => {
                    const result = simulate(save, days, scenario);
                    setSimulation(
                      `Projected inventory: ${bag(result.inventory)}\nGym logs: ${count(result, "gym")} · Meal logs: ${count(result, "meal")}\nBuildings are not auto-built. This assumes daily collection, not one continuous absence. Live save unchanged.`,
                    );
                  }}
                >
                  Run on a copy
                </button>
                {simulation && <pre>{simulation}</pre>}
                <h2>Local diagnostics</h2>
                <p>
                  {save.logs.length} activity events · {save.ledger.length}{" "}
                  transactions · {save.jobs.filter((j) => j.done).length}{" "}
                  completed jobs
                </p>
                <details>
                  <summary>Resource ledger</summary>
                  <pre>
                    {save.ledger
                      .slice(-40)
                      .map(
                        (t) =>
                          `${new Date(t.at).toLocaleString()} | ${t.source} | ${bag(t.delta)}`,
                      )
                      .join("\n")}
                  </pre>
                </details>
                <details>
                  <summary>Rule / correction history</summary>
                  <pre>{save.audit.join("\n") || "No adjustments yet."}</pre>
                </details>
                <details>
                  <summary>Saved rule revisions</summary>
                  <pre>{JSON.stringify(save.ruleHistory, null, 2)}</pre>
                </details>
                <h2>Start a separate beginning</h2>
                <p>
                  This replaces the active world. First a downloaded export and
                  a local backup preserve it. Type NEW WORLD to enable the
                  action.
                </p>
                <input
                  aria-label="Reset confirmation"
                  value={resetPhrase}
                  onChange={(e) => setResetPhrase(e.target.value)}
                  placeholder="NEW WORLD"
                />
                <button
                  disabled={resetPhrase !== "NEW WORLD"}
                  onClick={() => {
                    try {
                      exportSave();
                      backup();
                      const next = fresh(Date.now());
                      persist(next, worldKey);
                      setSave(next);
                      setResetPhrase("");
                      setEditor(JSON.stringify(next.rules, null, 2));
                      setMessage(
                        "A new beginning. Your previous world is in the local backup and downloaded export.",
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  Archive & start a new world
                </button>
              </div>
            )}
          </section>
        )}
        <footer>
          <span>Progress takes root. It never disappears.</span>
          <small>
            {storageError
              ? "Save needs attention"
              : `On-device save · ${saved || "active"}`}{" "}
            · v0.4
          </small>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {[
          ["village", "village", "Village"],
          ["workshops", "workshops", "Workshops"],
          ["requests", "requests", "Requests"],
          ["journal", "journal", "Journal"],
          ["stores", "stores", "Stores"],
        ].map(([id, icon, name]) => (
          <button
            key={id}
            aria-label={name}
            aria-current={tab === id ? "page" : undefined}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon name={icon} />
            {name}
          </button>
        ))}
      </nav>
      {message && (
        <div className="toast" role="status" onClick={() => setMessage("")}>
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {logger && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-title"
          >
            <button
              className="close"
              aria-label="Close logger"
              onClick={() => setLogger(false)}
            >
              ×
            </button>
            <span className="eyebrow">SOMETHING GOOD, MADE REAL</span>
            <h2 id="log-title">A little effort. Lasting roots.</h2>
            <p>
              Log something you actually completed. Rest days never cost you
              progress.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commit((s) => {
                  const id = crypto.randomUUID();
                  log(
                    s,
                    {
                      id,
                      type,
                      at: new Date(at).getTime(),
                      amount: +amount,
                      notes,
                    },
                    Date.now(),
                  );
                  const l = s.logs.find((l) => l.id === id)!;
                  setMessage(
                    l.qualified
                      ? `Work queued: ${bag(l.reward)} to gather. Accomplishment credited now.`
                      : "Saved without rewards: below the qualifying amount or above the daily cap.",
                  );
                  setLogger(false);
                  setNotes("");
                });
              }}
            >
              <label>
                What did you do?
                <select
                  value={type}
                  onChange={(e) => {
                    const a = e.target.value as Activity;
                    setType(a);
                    setAmount(
                      String(
                        a === "pushups"
                          ? 5
                          : save.rules.activities[a].minimum || 0,
                      ),
                    );
                  }}
                >
                  {Object.entries(activityNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                When?
                <input
                  type="datetime-local"
                  required
                  value={at}
                  onChange={(e) => setAt(e.target.value)}
                />
              </label>
              <label>
                {type === "pushups"
                  ? "Repetitions"
                  : "Minutes (0 for meal or completed-session logs)"}
                <input
                  type="number"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Notes (optional)
                <input
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="A moment to remember…"
                />
              </label>
              <p className="log-rule">
                {["meal", "plants", "snack"].includes(type)
                  ? save.rules.mealDefinition
                  : `Qualifying minimum: ${save.rules.activities[type].minimum} ${type === "pushups" ? "reps" : "minutes"}.`}
                <br />
                Rewards up to {save.rules.activities[type].cap} times per local
                day. {bag(save.rules.activities[type].reward)} gathered over{" "}
                {save.rules.activities[type].gatherHours} hours, starting when
                logged. Each resource has its own queue.
              </p>
              <button className="primary" type="submit">
                Let it grow <Icon name="arrow" className="action-arrow" />
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function localTime() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AccountShell
      renderGame={(control, key) => <App key={key} accountControl={control} />}
    />
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
