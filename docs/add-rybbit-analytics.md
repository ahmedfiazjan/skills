# add-rybbit-analytics

Add self-hosted web analytics to a site, with a consent pop-up, session replay that records only people who accept (in Hybrid mode), and a privacy policy that says what the code does.

## Who it is for

Developers who want to measure their own site without sending visitor data to a third party. It uses [Rybbit](https://rybbit.com), an open-source analytics tool.

## What you get

- **Three modes, in plain words.** Hybrid counts everyone daily with no lasting ID, and adds a lasting ID and replay for visitors who accept. Daily only has no pop-up, no lasting browser ID and no replay. Full records everyone, for personal sites only.
- **Replay after Accept, in Hybrid mode.** In Hybrid mode the recorder is not downloaded until the visitor accepts. Full mode records without a prompt.
- **Masking.** Typed values are hidden. Computed results, such as a calculator's answer, can be hidden too.
- **A matching privacy policy.** The pop-up and the policy are checked against what the code does, including that people who decline are still counted.
- **A tested setup.** It tests on a throwaway site first, with six consent scenarios. On your own server it queries the stored replay data for typed text. Rybbit Cloud has no database access, so there it can only check what the replay viewer shows.
- **A server, if you want one.** On your own Linux VPS it sets up a firewall, a locked sign-up, replay retention, nightly backups of accounts and events (not session replays) with a restore test, and alerts.

## What it touches

- Your repository: one script file, a few lines to load it, the privacy policy, and an `analytics-notes.md` file.
- Your server, over SSH, if you self-host.

The skill tells your agent to ask before each change to a server, database or live site, and to have you type every password and key yourself. These are instructions, not guarantees, so read what your agent asks to run.

## Before you start

- A coding agent with shell access.
- The OpenSSH client, built into Windows 10 and later, macOS and Linux. Needed to set up a server.
- Docker on the server, if you self-host.
- Node.js, only for the `npx` install route.

## Install

Claude Code:

```bash
claude plugin marketplace add ahmedfiazjan/skills
claude plugin install ahmadfiazjan-product@ahmadfiazjan
```

Codex:

```bash
codex plugin marketplace add ahmedfiazjan/skills
codex plugin add ahmadfiazjan-product@ahmadfiazjan
```

Any other agent (needs Node.js):

```bash
npx skills add ahmedfiazjan/skills --skill add-rybbit-analytics
```

## Use it

Ask your agent: "add analytics to this site", "set up Rybbit", or "add privacy-friendly analytics with session replay". On the first run it asks where Rybbit runs (your own VPS, a one-click host such as Railway, or Rybbit Cloud), your framework, and where the privacy policy lives.

It works with plain HTML, React and Next.js, and Astro. Other frameworks need only a few lines. It works from Windows, macOS and Linux.

## Limits

- This is not legal advice. Check with a lawyer for your situation.
- Self-hosted Rybbit lacks Search Console, Web Vitals, the Bots page and password reset.
- Full mode records visitors who never agreed to it. Use it only where you accept that risk.
- Rybbit changes. The skill was checked on Rybbit v2.9.2. Re-check the gotchas file on newer versions.
