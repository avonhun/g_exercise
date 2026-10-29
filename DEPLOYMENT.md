# Production deployment handoff

Target: **https://world.bballstatistics.com**. This file is not evidence of deployment.

Use a **new** Vercel project, suggested name `world-pwa`, in `alexs-projects-ac5c43c1` (team ID `team_QzGkdXUx4UOtfTiQTdKSU0fA`). Import GitHub repository **avonhun/g_exercise**, production branch **main**. Framework Vite, root repository directory, install `npm ci`, build `npm run build`, output `dist`. `vercel.json` supplies cache and security headers. No runtime environment variables or application secrets are required.

Do not reuse `nba-stats-site` or `point-check-v2`, or alter their domains. Do not put game files into the basketball project's deployment directory.

After the deployment is READY, attach **world.bballstatistics.com** to the new project. Use the **exact DNS target returned by Vercel** to create only the new `world` record in Cloudflare. Nameservers are `george.ns.cloudflare.com` and `adel.ns.cloudflare.com`, account ID `05474e1bf2cb59828cfdef0029db6a95` (non-secret). The handoff reported NXDOMAIN before deployment. Preserve every existing record and nameserver. Do not use Codex's internal browser for Cloudflare; the handoff reports crashes. Use authorized API tooling or the normal Cloudflare dashboard manually.

The user's request authorizes deployment of this game to that subdomain. A handoff does not provide credentials. The cloud task has no Vercel/Cloudflare connector, and VERCEL_TOKEN / CLOUDFLARE_API_TOKEN were absent. A secure VERCEL_TOKEN requirement is saved in cloud environment settings if deployment is to resume here. Never place deployment tokens in Vite variables, source files, static output, or chat. The existing other chat's Vercel connector is an alternative; it can import the repository remotely without accessing this cloud filesystem.

Before declaring success:

1. Verify deployment READY, the correct project/team, the connected commit, and the custom domain's TLS certificate.
2. Fetch the custom-domain HTML, manifest, both PNG icons, service worker and every hashed asset; expect successful statuses and correct MIME types.
3. Verify cache/security headers, no JavaScript console errors, and absence of outgoing personal activity/food records.
4. On an actual iPhone in Safari: log a real or explicitly disposable test activity, add to Home Screen, close/reopen, turn off networking and confirm the app, artwork and local save load offline. Export a backup before using real records.
5. Deploy a subsequent version; close all app tabs and reopen to verify the waiting worker adopts the new complete shell while preserving the existing world.

No client route rewrite is needed: navigation is in-page state. Keep the origin stable: browser saves do not automatically move between a Vercel preview URL and the custom domain. Use export/import if moving a world.

## Verified here

The 0.2 art edition passes 36 unit/storage tests, 6 Chromium browser tests, and TypeScript/Vite production build. Browser checks include offline reload/logging and all building images. Actual DNS, HTTPS production deployment and iPhone Home Screen behavior remain unverified until the steps above succeed.
