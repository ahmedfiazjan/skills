# Prove the privacy promises on a throwaway site

Do this before replay goes live on the real site. You need a temporary Rybbit site with `sessionReplay` on, and a local build pointed at it. Do not reuse the real site's ID: a local preview sends real events to whatever site ID it uses, with hostname `localhost`.

Ask the user before creating the test site and before deleting it.

## Set up

1. Create a second site in Rybbit (dashboard or MCP `create_site`). Name it so nobody mistakes it for the real one. Note its numeric ID as `TEST_ID`.
2. Set its switches like the real site, but with `sessionReplay` on. Do not add `localhost` to `excludedHostnames`: with it, local tests send 200 responses and store nothing.
3. Point the local build at `TEST_ID` and run it.
4. Use a clean browser profile, or clear site data before each scenario. A browser tool from your agent works; so do the browser's DevTools.

Pick a typed test value that appears nowhere on the page, for example `zz-typed-4821`, and a control phrase that does appear on the page.

## The six scenarios

| # | Scenario | Do | Expect |
|---|---|---|---|
| 1 | Undecided | Load the page, make no choice | Pop-up shows. This script and Rybbit have written no storage keys. No request for `replay.js` |
| 2 | Decline | Click Decline | Storage holds only the choice key, set to `declined`. No `replay.js`. No `rybbit-visitor-id` |
| 3 | Reload | Reload after declining | No pop-up. Same state as scenario 2 |
| 4 | Accept mid-visit | Clear storage, reload, click Accept, type the test value into a form field, click around for a minute | `replay.js` requested after Accept. Requests that carry replay data go to the analytics origin |
| 5 | Next page | Go to another page of the site | Recording continues in the same session. No pop-up |
| 6 | Withdraw | Note the time. Click "Privacy choices", click Decline, then type and click around for a minute | No new replay requests after the noted time. Choice is `declined`. `rybbit-visitor-id` is gone |

In the console, list the storage keys with `Object.keys(localStorage)`. The site may have its own keys. Look only for the choice key (`storageKey`) and `rybbit-visitor-id`.

Do not use `window.rrweb` as evidence either way. It stays defined after the recorder has loaded, even once recording has stopped. Use the Network tab instead: filter by the analytics host and compare the request list before and after each step. Page views and events can still go out after a decline, because a declined visit is still counted. Requests that carry replay data must not.

## Done when all four hold

1. Until a choice is made, this script and Rybbit have written no keys: neither the choice key nor `rybbit-visitor-id` is there (scenario 1).
2. No replay requests are made unless the visitor accepted (scenarios 1 to 3), and they stop after a withdrawal (scenario 6).
3. Replay rows exist only for the accepted session, and none are newer than the withdrawal (scenarios 4 to 6).
4. The typed value is absent from stored replay data, and the control phrase is found.

Conditions 3 and 4 read stored data, so they apply to your own VPS. On Rybbit Cloud, use the Cloud check below instead.

## Check the stored data (own VPS)

Run on the server, in the ClickHouse container. The service name is in your `docker-compose.yml`, usually `clickhouse`. If it asks for a password, ask the user to run the command and paste the output.

```bash
docker compose exec clickhouse clickhouse-client -d analytics --query \
  "SELECT count() FROM session_replay_events WHERE position(event_data, 'zz-typed-4821') > 0"
docker compose exec clickhouse clickhouse-client -d analytics --query \
  "SELECT count() FROM session_replay_events WHERE position(event_data, 'A PHRASE FROM THE PAGE') > 0"
```

The first query must return `0`. The second must return more than `0`. If the second is also `0`, the check proves nothing: pick a phrase that really is on the page. The `run_query` tool of the Rybbit MCP cannot see replay tables.

Also confirm that rows exist for `TEST_ID` only for the accepted session, and check masked results the same way: type or compute a value that the page shows as text, then search for it. It must not be found.

For withdrawal, use `DESCRIBE TABLE session_replay_events` to find the site and timestamp columns, then count rows for `TEST_ID` newer than the time you noted in scenario 6. The count must be `0`.

The Replay page hides sessions shorter than 30 seconds by default, and with none left it hides the Min Duration box too. An empty page can still hold recordings: look in `session_replay_metadata_v2`.

## Check on Rybbit Cloud

Cloud has no database access, so the checks above that read stored data cannot run. Use this acceptance check instead:

1. **Network tab.** Repeat scenarios 1 to 6 with the Network tab open, filtered by `app.rybbit.io`. Declined and undecided visits make no replay requests. After Accept they start. After a withdrawal they stop.
2. **Dashboard.** A declined visit shows up as a counted visit and has no replay on the Replay page. An accepted visit has one.
3. **Watch the replay.** Open the accepted session. Typed text and the masked elements must show as hidden.

This cannot prove that typed text or personal data is absent from what Rybbit stores. You only see what the viewer shows, for the sessions and elements you tried. Say so to the user, and do not claim more in the privacy policy than you tested. Retention and storage location are the provider's terms.

## Clean up

Ask the user first. Delete only rows for `TEST_ID`, and show the ID to the user before running anything. Use `DESCRIBE TABLE` to confirm the site column name, then:

```bash
docker compose exec clickhouse clickhouse-client -d analytics --query "ALTER TABLE events DELETE WHERE site_id = TEST_ID"
```

Repeat for each `session_replay*` table (`SHOW TABLES LIKE 'session_replay%'`). Then delete the test site in the dashboard.

## After shipping

On the real domain, with replay switched on, visit once and decline. Confirm:

- events carry the real hostname,
- the `ip` column is empty,
- the declined visit started no recording.
