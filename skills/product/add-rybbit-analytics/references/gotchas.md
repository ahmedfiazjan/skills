# Checked on Rybbit v2.9.2; re-check on newer versions

Each item was observed on v2.9.2. After a Rybbit upgrade, re-check the ones you rely on.

## Storage and identity

- "Cookieless" still writes `rybbit-visitor-id` to local storage on every load, only for feature flags. consent.js holds that one key back until the visitor accepts.
- Visitor codes last across days unless `saltUserIds` is on.
- Rybbit checks its opt-out only when its script loads. A "turn off statistics" button must reload the page once the script tag exists.

## Session replay

- Replay is a site-wide switch. It reaches every script that is already loaded, so deploy the consent code before switching it on.
- `data-replay-sample-rate="0"` keeps the recorder unloaded. Set it before the script loads. At 0, `startSessionReplay()` needs `/api/replay.js` loaded first.
- Masking inputs does not hide computed results shown as text, such as a calculator's answer. List them in `data-replay-mask-text-selectors` (a JSON array). Prove it with the `position(...)` query in verify-privacy.md. The Rybbit MCP `run_query` cannot see replay tables.
- Replay size varies. About 800 KB for a one-minute test session, 200 KB for 14 seconds, and about 70 KB on disk after compression in one test. Watch disk use after enabling it.
- The Replay page hides sessions under 30 seconds by default, and with none left it hides the Min Duration box too. An empty page can still hold recordings: check `session_replay_metadata_v2`.
- Replay retention is a ClickHouse TTL you set yourself. Recheck it after every upgrade.

## Tracking switches

- Copy tracking stores the copied text, and form tracking records input activity. Turn them on only if the policy covers them.
- For products that handle sensitive data, such as financial documents, turn `trackErrors` off (it stores the error message and stack) and `trackButtonClicks` off (it stores button text). Exclude payment and sign-in URL parameters such as session IDs.
- `excludedQueryParams` drops the whole event, not only the parameter, so those page loads go uncounted.
- With `excludedHostnames: ["localhost"]`, local tests send 200 responses but store nothing. Check what is stored on the live domain after deploy.
- Local previews send real events to the site ID they use, with hostname `localhost`. Use a throwaway site and delete its rows afterwards.

## Setup

- The site can be created with the official Rybbit MCP `create_site` (owner key) instead of the dashboard.
- Dashboard icons come from `icons.duckduckgo.com/ip3/<domain>.ico`, with no upload. Give the site a real `/favicon.ico` and a plain `<link rel="icon" href="/favicon.ico" sizes="32x32">` before launch. DuckDuckGo ignores SVG and `alternate icon`, and caches a miss for days. Cache-busting does not help.
- Sites that already use Google Analytics: wrap `gtag` so each `gtag('event', ...)` also calls `rybbit.event`, queued until the script loads. No per-event edits needed.
- Self-hosted Rybbit lacks Search Console, Web Vitals, the Bots page and password reset.

## The consent dialog

- A native `<dialog>` opened with `showModal()` closes on Escape even when you prevent the cancel event. Reopen it in the close handler if you need a forced choice. A global `margin: 0` reset breaks its centring.
