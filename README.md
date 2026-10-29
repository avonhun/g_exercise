# The Living World

**Current working changes add accounts and Render hosting; these are not deployed.** See [ACCOUNTS_AND_RENDER.md](ACCOUNTS_AND_RENDER.md) for the functional preview, privacy/storage model, missing account-recovery features, and production prerequisites. The local-only statements below describe guest mode and the already released static version.

An iPhone-first, local-first civilization game. Your real activities earn supplies and permanent accomplishments; workshops and villagers keep working between workouts. No account, backend, paid APIs, analytics endpoints, or monetization.

## Run

Node 24+, npm 11.

```sh
cd /workspace/g_exercise
npm ci --cache /workspace/.npm-cache
npm test
npm run build
npm run dev -- --port 5173
```

`npm run preview -- --port 4173` serves the production build with its offline worker. Development does not register a worker. The default npm cache is unwritable in this cloud environment, so use the explicit cache above. An existing checkout is sufficient; do not create a worktree for ordinary tasks.

## Playable now

- Detailed pixel-art landscape, six coordinated building sprites and a storybook portrait; five navigation views and mobile layouts.
- Manual, dated gym, soccer, hike, cardio, cycling, short walk, pushup, meal, plants, and mindful snack logs. Duration/repetitions, notes, daily reward caps, stable event IDs, corrections, and visible history.
- Small walks and nightly pushups count as useful habits. They do not automatically count as gym/hike credentials. Explicit home-strength goal selection offers a longer consistency alternative.
- Sawmill, forge, garden, kitchen, hall upgrade; four recipes with serial three-job workshop queues; capped passive gathering; offline job completion.
- Two finite commissions and a bounded merchant exchange; real accomplishment gates cannot be purchased with supplies.
- An earned exploration encounter, concealed until its prerequisite is met. This is the regional expansion foundation, not a simulated second settlement.
- Versioned local saves, exported backups, restore/import, correction debts, resource ledger, rule audit, permanent milestones, and v1-to-v2 migration.
- Gated local developer console: editable rule JSON, validation, explicit spoiler inspection, local diagnostics, and 30/60/90-day isolated economy projections. Rule changes apply prospectively.
- Manifest, PNG icons, and production asset precache for offline use after first successful load.

## Important boundaries

The console is a local accidental-edit gate, not authentication. There are no remote admin actions. Personal records never leave the browser unless you export them. Use downloaded backups: browser storage is not guaranteed permanent. Import replaces the active world after preserving a local backup; restore swaps it with that backup. A corrupt initial save is preserved and normal writes remain blocked until a valid import.

Manual logs are honor-based. Daily caps apply to the occurrence date, in the device's local calendar when entered. Retroactive entries are allowed for up to a year. Activity correction reverses available resource rewards; already spent rewards become resource-specific debt repaid from future earnings. Earned credentials stay permanent and the correction is audited. No punitive debt is created by missing workouts. No activity can be verified against HealthKit in a PWA. Passive earnings are posted in hourly batches (remaining partial time is retained), keeping the ledger from growing every UI refresh. Rule changes settle pending production at the previous rate. Large multi-year histories may eventually need a move from browser localStorage to IndexedDB; storage failures are surfaced and exports remain available.

The local clock is a high-water mark: moving backward cannot create extra production; a forward jump is capped at the offline allowance. There is no trusted server clock, so deliberate device-clock manipulation cannot be fully prevented. Job outputs are captured at queue time. Changes to recipes do not rewrite existing jobs.

The starter balance is provisional. The hall is an early milestone, not a full campaign. A year's worth of content, multi-region caravans, advanced performance-goal editors, optional weight trends, native health import, rich analytics, retroactive reward recalculation, and a complete long-term content campaign are **not implemented**. The dependency checker catches missing/circular building requirements and implicit resource/workshop reachability cycles. It checks sources rather than solving exact quantities or long-term economic balance.

## Architecture

`src/engine.ts` owns deterministic state transitions and data-defined seed rules. It has no React or browser dependency. Callers pass time and stable IDs. State changes run against a cloned save in the UI; failed actions are not committed. Normalized activity records provide a future native-import boundary, without implementing a native adapter prematurely.

`src/store.ts` owns browser persistence and backup/download operations. Save schema and rule versions are independent. `migrate` validates imported snapshots and upgrades v1 to v2. Inventory changes have resource transactions; corrections mark the original record and append a reversal transaction/audit entry. Credentials are durable, independent of current log counts. This is a snapshot plus audit ledger, not a complete event-sourced database.

`src/World.tsx` composes the landscape and independent, selectable building sprites. `src/main.tsx` contains the playable UI and local console. `vite.config.ts` injects production asset URLs into the service-worker precache. See `ART_BIBLE.md` for asset constraints and `IMPLEMENTATION_PLAN.md` for scope decisions.

## Verification

```sh
npm test
npm run build
npm run test:e2e
```

E2E tests use the installed Chromium at `/usr/bin/chromium`, starting a production preview through Playwright configuration. Set `CHROMIUM_PATH` for another system browser, or install Playwright Chromium and remove the executable-path override. Actual iPhone Safari, Home Screen installation, DNS, TLS and deployment at `world.bballstatistics.com` require separate verification.

## Deployment

Serve `dist/` over HTTPS at the root of `world.bballstatistics.com`. Hosting and DNS are not configured by this repository. Use short/no-cache headers for `index.html`, `sw.js`, and the manifest; hashed `/assets/` files can be immutable. No environment secrets are required. A new worker activates after old pages close; reopen the app to adopt a new version. Do not delete browser saves when updating assets.


## Review update · art edition (0.2)

Garden construction settles production before enabling food; strength alternatives cannot use unrelated streak credentials; backdating uses the current date. Active recipes cannot change workshops mid-queue, and completed jobs remain importable after a recipe is retired. Import validation checks resource bags, debts, duplicate event IDs, timestamps and event structure. Two tabs use optimistic save comparison so stale state cannot overwrite a newer world. The logger supports Escape and keyboard focus containment.

Offline shell loading is now cache-first per build: a worker cannot mix new network HTML with old offline assets, and only known app files are cached. All art is precached. `vercel.json` sets static build output, HTTPS-host response security headers, immutable hashed assets, and no-cache service-worker/HTML behavior. No remote deployment is established merely by adding that file. See `DEPLOYMENT.md`.
