# Accounts preview and Render hosting

Accounts are implemented but **not deployed**. The live site remains the previously published static Vercel app. No Render service, database, billing plan or DNS record has been created by this task.

## Paused by default

The normal game has no login button, account API calls or sign-in cookies. Guest saves and existing account caches are retained separately; pausing does not delete either. Default production startup works with no database or application-origin secret, and account endpoints return 404 without touching storage. `render.yaml` no longer requests database credentials or provisions any database. The existing Vercel static deployment is sufficient for this guest-only release, so Render/database setup can stay paused.

To resume the preserved implementation, explicitly set **both** `VITE_ENABLE_ACCOUNTS=true` for the browser build and `ENABLE_ACCOUNTS=true` for the server, then rebuild and configure the durable database/origin prerequisites described below. `npm run preview:accounts` and `npm run test:accounts` opt in automatically for isolated local checks; a normal `npm run build` turns the UI off again. `npm run test:guest` verifies real production startup and local saves with no database, no cookies, and no account requests.

## What works locally

- Username/password registration and sign-in; usernames are case-insensitive, 3–30 letters/digits/underscores. Passwords are 12–128 characters, scrypt-hashed with random salts. Passwords and raw session tokens are never saved to logs or browser storage.
- Random, revocable 30-day sessions. Production uses a host-only `__Host-` cookie with Secure, HttpOnly, SameSite=Lax and Path=/. Local HTTP preview uses a separate HttpOnly development cookie.
- Same-origin JSON-only writes, persistent authentication rate limits, session rotation, expiry/logout, and password change that revokes other sessions.
- World ownership is derived from the server session, never a supplied user ID. Cloud saves use revision compare-and-swap. A stale device must export its local changes or deliberately load the cloud version; no automatic merge can double-award supplies.
- Guest progress stays separate. A new account explicitly chooses a fresh world or a copy of this device's guest world. Switching accounts remounts the game with separate local caches. A world autosyncs about every ten seconds while signed in; errors preserve its local copy.
- All account/save API responses use `no-store, private`; the service worker excludes `/api/` entirely. There are no advertising cookies.

Signin requires a network connection. A signed-in open game can keep local progress while offline and retry after reconnecting. On a fully offline reload, guest mode is available; the account's cached world is not automatically shown without session verification. Local device caches are not an encrypted vault: do not use a shared OS/browser profile for private health history. Downloaded exports also contain personal activity records.

Password change is available; **forgot-password/email recovery, account deletion UI, and external security review are not yet implemented**. Do not market account recovery until it exists. Keep passwords in a password manager. Private exports/backups remain available.

## Preview (before deployment)

Node 24 or later:

```sh
npm ci --include=dev
npm test
npm run test:e2e
npm run test:accounts
npm run preview:accounts
```

The account preview uses a persistent SQLite file at `/tmp/living-world-preview.sqlite`, intended only for local testing. Browser tests use a separate disposable SQLite database, real HTTP requests, real password hashes and real cookies. They exercise registration, guest migration, another browser logging into the same world, a second independent account, logout and CSRF/cache protection. Cookie Secure flags are asserted in server tests; HTTP localhost cannot verify actual HTTPS transport. The Postgres network adapter still needs validation against the actual Render database.

## Render deployment after visual approval

1. In Render, use GitHub sign-in and create a **Node Web Service** for `avonhun/g_exercise`. This is not a static site. Use a separate `living-world` service; do not touch basketball services. `render.yaml` is a reviewable blueprint and disables automatic deployment. It does not automatically create a paid database.
2. Choose a durable PostgreSQL database. Prefer a Render internal connection URL in the same region. Review pricing, retention and backup policies before provisioning; no paid resources are authorized by the blueprint itself. Never store production accounts on the web service's ephemeral disk or a temporary/trial database that will expire.
3. Set Node version `24`, build command `npm ci --include=dev && npm test && npm run build`, start command `npm start`, health check `/healthz`.
4. Set `DATABASE_URL` securely in Render. Set `APP_ORIGIN` to the exact HTTPS origin used by players, with no trailing slash. During staging use `https://YOUR-SERVICE.onrender.com`; after domain cutover use `https://world.bballstatistics.com`. Set `NODE_ENV=production`. No `VITE_` secret variables are needed.
5. Startup applies idempotent account table/index creation before accepting traffic. Future destructive database migrations need a separate reviewed migration and database backup. The service fails closed if a durable database or HTTPS application origin is missing.
6. Verify `/healthz`, register two disposable test users, verify isolation, secure cookies, cloud save conflicts, logout, re-login and database survival after restarting the service. Verify real iPhone Safari and Home Screen behavior.
7. Only after the preview and backend are approved, attach `world.bballstatistics.com` to Render and change **only** Cloudflare's `world` DNS record to the exact target Render provides. Do not alter other DNS or basketball projects. Preserve the old Vercel deployment for rollback. Moving the same hostname preserves browser-local saves, but old Vercel service workers will remain until every old app tab closes; verify update adoption before real logging.

This cloud task has no Render connector or dashboard automation. Your browser's GitHub/Render login is not shared with the cloud process. An authorized Render API connection or manual dashboard setup is required to create resources; do not send credentials in chat.
