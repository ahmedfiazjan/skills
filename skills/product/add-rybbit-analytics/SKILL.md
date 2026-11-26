---
name: add-rybbit-analytics
description: Add self-hosted Rybbit analytics to a website or web app, with a consent pop-up, session replay that starts only after Accept in Hybrid mode, masked form fields and a privacy policy that matches the code. Can also set up the Rybbit server on a Linux VPS. Use for "add analytics", "self-hosted analytics", "Rybbit", "privacy-friendly analytics", "session replay with consent", or "set up an analytics server".
license: MIT
compatibility: Needs a coding agent with shell access (Claude Code, Codex, Copilot CLI, Gemini CLI, Cursor) and SSH to a Linux server for self-hosting. Works from Windows, macOS or Linux.
metadata:
  author: Ahmad Fiaz Jan
  version: "1.0.0"
  tested-with: "Rybbit v2.9.2"
---

# Add Rybbit analytics to a site

Rybbit is an open-source web analytics tool. This skill connects a site to a Rybbit install, adds a consent pop-up, turns on session replay only for visitors who accept, and makes the privacy policy say what the code does.

## Rules for every step

- Ask the user before any step that changes a server, a database or a live site.
- The user types every secret (passwords, tokens, API keys) in their own terminal or browser. Never ask for one in chat, never read one back, never write one to a file you create. Generate passwords on the server and do not print them.
- Legal risk: say it plainly when it matters, and say "this is not legal advice; check with a lawyer for your situation". Do not decide what the law requires for the user.
- Local commands must work in PowerShell and in bash or zsh. Show both when they differ. Server commands are bash.

## 1. First run: ask, once

Read `analytics-notes.md` in the project root. If it exists, use its answers and skip to the step you need. If not, ask:

1. Where does Rybbit run?
   - (a) The user's own Linux VPS with Docker, from any provider.
   - (b) A one-click host such as Railway.
   - (c) Rybbit Cloud.
2. The site's framework: plain HTML/JS, React or Next.js, Astro, or other.
3. Where the site's privacy policy lives (file path or URL).

Save the answers to `analytics-notes.md`. Never put a password, token or key in it. Use this shape:

```markdown
# Analytics notes
- Hosting: own VPS | one-click host | Rybbit Cloud
- Analytics URL (API base, ends in /api):
- Framework:
- Privacy policy:
- Rybbit version:
- Replay retention (own VPS): 14 days, recheck after upgrades
- Backups and alerts (own VPS): set up yes/no, last restore test date
## Sites
- name | site ID | mode | replay on? | date set up
```

## 2. Server

Only for option (a). Follow [references/server-setup.md](references/server-setup.md). It covers SSH, hardening, DNS, install, locking signup, replay retention, backups, a proven restore and alerts. For options (b) and (c) that file has a short section on what still applies. If a server already runs, skip this step.

## 3. Read the promises

Read the site's privacy policy and any store listing before touching code. List every claim analytics could break, such as "no browser storage" or "no tracking". Done when each claim has a yes or no against the mode you plan to propose.

## 4. Choose the mode

Explain the three modes in plain words from [references/consent-modes.md](references/consent-modes.md) and let the user choose.

- **Hybrid (default):** counts everyone daily with no lasting ID. Accept adds a lasting ID and session replay. Needs a consent pop-up.
- **Daily only:** no pop-up, no replay, same-day journeys only.
- **Full:** replay and a lasting ID for everyone. Only for personal sites where the owner accepts that. No pop-up.

State which mode needs the pop-up. Record the choice.

## 5. Create the site and set the switches

Create the site in the Rybbit dashboard. If the official Rybbit MCP server is connected, `create_site` does it. Get the numeric site ID.

Set these per-site switches before the first event arrives:

| Setting | Hybrid | Daily only | Full |
|---|---|---|---|
| `saltUserIds` | on | on | off |
| `trackErrors` | on | on | on |
| `trackOutbound` | on | on | on |
| `trackButtonClicks` | on | on | on |
| `sessionReplay` | off for now | off | off for now |
| `trackCopy` | off | off | on |
| `trackFormInteractions` | off | off | on |

Done when you have read the values back (dashboard, or MCP `get_site`). `sessionReplay` is switched on in step 10, after the code is live.

If the product handles sensitive data such as financial documents, also turn `trackErrors` and `trackButtonClicks` off. See [references/gotchas.md](references/gotchas.md).

## 6. Add the code

Copy [assets/consent.js](assets/consent.js) into the project's script folder. It has no dependencies. It loads the tracker, holds back the `rybbit-visitor-id` storage key until consent, in Hybrid mode loads the replay recorder only after Accept, reopens from any element with `data-privacy-choices`, and handles withdrawal.

Wire it for the user's framework and match the site's design. See [references/frameworks.md](references/frameworks.md). Set `replayBlockSelector` to every form that takes personal data, and `replayMaskTextSelectors` to any element that shows a computed personal result.

## 7. Write the words

Update the pop-up and the privacy policy so every statement matches what the code does. Say that people who decline are still counted, daily and without a lasting ID. Use plain language. Check each claim against real stored data in step 9.

## 8. Show the user

Run the site locally and open it in a browser. Show the pop-up and the changed policy. Get approval of the design and the exact wording before anything is deployed.

## 9. Test on a throwaway site

Follow [references/verify-privacy.md](references/verify-privacy.md): create a temporary site with replay on, run the six scenarios, check the four "done when" conditions including the typed-value query, then delete the test site and its data. Ask before deleting. On Rybbit Cloud there is no database to query, so use the separate Cloud check in that file and tell the user what it cannot prove.

## 10. Ship in order

1. Deploy the code.
2. Confirm the live site serves it.
3. Only then switch `sessionReplay` on.

The replay switch reaches every script that is already loaded, so the consent safeguard must be live first.

## 11. Verify live

Visit the real domain. Confirm events arrive with the real hostname and an empty `ip`. Confirm a declined visit starts no recording. Own-VPS users can check with the queries in references/verify-privacy.md; Cloud users check in the dashboard.

## 12. Record it

Update `analytics-notes.md`: the site, its ID, its mode, whether replay is on, the Rybbit version, and the date.

## Boundaries

- If the product also ships a browser extension, keep it out of the website's analytics unless the user decides otherwise. A promise that the website receives nothing from the extension would break.
- Features missing from self-hosted Rybbit: Search Console, Web Vitals, the Bots page and password reset.
- Rybbit changes. Treat references/gotchas.md as checked on v2.9.2 and re-check on newer versions.
