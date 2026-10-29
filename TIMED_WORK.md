# Timed gathering and construction · preview

Approved design: finite rewards collected over time; automatic serial queues; real-time progress while offline up to a configurable allowance; projects take hours or days. This version has not been deployed.

## Gathering

A qualifying log grants permanent accomplishment credit immediately and creates one job per rewarded resource. Resources are not deposited up front. Each resource has its own serial crew: logging additional activities extends that resource's queue, not its current speed. Different resource crews can work simultaneously. Jobs begin when the entry is made, not at a backdated occurrence time. Daily caps still apply to the occurrence date.

Seed durations are 2 hours for short walks/pushups/plants/snack goals; 4 hours for meals, cardio and cycling; 6 hours for soccer; 8 hours for gym and hiking. Outputs arrive in whole units as work completes, with any fractional configured remainder delivered at the end. A job's reward and duration are captured when created. Future rule changes cannot rewrite existing jobs.

The existing low-volume wood/stone commons and garden production remain separate. Slow background forester/stone/garden workers represent those sources; faster earned gathering crews appear only while an accomplishment-funded job is active. Welcome supplies, trades and commission deliveries are still immediate transactions; only activity payouts changed to gathering jobs.

## Construction

Materials are reserved and accomplishment gates checked when construction is queued. One shared crew works through building projects in order. A queued project appears as an unstaffed site; the active site has scaffolding and animated builders. The building cannot be used, produce resources, fulfill prerequisites or reveal progression until complete. An upgraded hall retains the existing hall while its upgrade is under construction.

Seed times: garden 2h, sawmill 4h, kitchen/blacksmith 8h, hall upgrade 48h. These are editable `buildings.*.hours`; activity timers are `activities.*.gatherHours` in the developer console. Captured queue timing remains unchanged by balance edits. Construction cancellation/refunds are not implemented.

## Time, corrections and saves

Save schema 3 introduces an explicit simulated work clock. Wall time never moves backward. A return from absence advances the simulation by at most `offlineHours`; remaining jobs are paused, not discarded, after that allowance. Foreground time continues to advance even when offline allowance is zero. Hidden tabs stop ticking; they cannot repeatedly claim new offline allowances. Craft queues use the same bounded work clock. Offline building completions are processed chronologically so a garden produces food only after it actually exists.

Correcting an entry settles current work, cancels its undelivered output and reverses only the resources already delivered. Previously spent output becomes resource-specific debt, as before. Earned credentials remain permanent. Cancelled work closes gaps in the resource queue without resetting other jobs' partial progress.

Schemas 1/2 migrate forward without withdrawing resources or dismantling buildings. Historical log payouts stay marked as immediate legacy rewards and are not replayed as gathering jobs. Existing craft queues remain. Browser load archives the original snapshot once under a separate pre-v3 key before the active save is rewritten; Settings can export that backup. Download a separate backup before using an updated release with a real world.

Jobs, delivered totals, progress, queue order and completion flags survive export/import and account sync. Invalid timings, missing jobs, overlap, duplicate IDs and overpayment are rejected on import. A scoped save guard also prevents an old account's timer callback from writing into a newly active account.

## Presentation and validation

`Villagers.tsx` contains original small animated SVG pixel figures with independent tool motions. Scene placement is tied to actual gathering/construction state. Scaffolding and a partially visible building show construction progress; the completed asset replaces the site on completion. Reduced-motion mode keeps static workers and progress information without tool/particle animation. These sprites have been checked in Chromium; actual iPhone rendering still needs review.

`WorkPanel.tsx` displays collected/total quantities, remaining time and queued work without exposing future content. Scene tests exercise visible/queued/finished states, real CSS animation and reduced-motion behavior. Core tests cover finite accounting, queue speed, corrections, offline bounds, chronological garden output, unchanged captured rates, migrations and ledger reconciliation. Account tests verify pending gathering jobs survive a second browser login. Exact year-scale balance still needs playtesting.
