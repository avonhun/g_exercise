# 0.2 project review

Reviewed the engine, activity and nutrition paths, unlock rules, workshop queues, save/load/import/backup, developer tools, world rendering, PWA worker/build, and deployment configuration against both specifications and the user's small-activity requirement.

## Corrected

- Garden construction previously applied its new passive rate to pending time before the garden existed. Settle pending production before changing infrastructure.
- An earned gym streak could bypass an explicitly selected home-strength goal. Streak equivalence now applies only to the gym path.
- Backdating used creation time instead of current time; old worlds could accept arbitrarily old records. Use the current rolling one-year limit.
- Active recipe changes could regroup queues; capture workshop identity and prevent active workshop moves. Completed historical jobs no longer require a current recipe definition to import.
- Save import validation now rejects duplicate IDs, invalid debts/resource bags, malformed fields and inconsistent production timestamps. Rule validation returns errors for malformed structures.
- Stale tabs previously could silently overwrite newer saves. Compare the stored snapshot before every write and refuse conflicting writes; retain exports and recovery paths.
- Network-first shell responses could mix new HTML with an old worker's asset cache. Use a complete cache-first build shell, include every hashed art asset, and avoid caching arbitrary endpoints.
- Logger now contains keyboard focus, supports Escape, restores launcher focus, and prevents background scrolling. All built map locations are real accessible buttons.
- Added a separate Vercel deployment configuration; no coupling to existing basketball projects.

## Artwork

Replaced prototype SVG scenery and portrait with an original generated landscape, six coherent building sprites (including the visible hall upgrade), matching icons and painted character art. Retained source masters and a deterministic Sharp export pipeline. Reviewed initial/developed mobile and desktop renders. The optimized images total about 1.2 MB and are offline-cached.

## Remaining limits

This is a tested starter game, not a completed years-long campaign. Finite NPC commissions, limited goal types and a narrow regional foundation still need playtesting/content expansion. Generated art has received browser visual review, not real-iPhone or independent art QA. No account/sync backend exists. Manual logs are honor-based; device-clock changes cannot be fully verified offline. localStorage limits are surfaced but moving the store to IndexedDB is advisable before multi-year histories become large. Importing/restoring is deliberate whole-world replacement with a backup; activity correction retains credentials and uses resource debt for already-spent rewards. Long-term economic balance and motivation require actual play, not only test counts.

Production publication is blocked until an authorized Vercel/DNS connection is available here or the connected deployment chat imports the repository. See DEPLOYMENT.md for the exact non-secret handoff.
