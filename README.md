<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
  <img src=".github/assets/banner-light.svg" width="830" alt="Skills by Ahmad Fiaz Jan">
</picture>

# Skills

Agent skills I use to build and ship my own products.

A skill is a folder of plain instructions that a coding agent follows, step by step. These use the open [Agent Skills](https://agentskills.io) format, so they work in Claude Code, Codex, GitHub Copilot, Gemini CLI, Cursor and other agents that read it, on Windows, macOS and Linux.

## Skills

### Product

| Skill | What it does |
|---|---|
| [add-rybbit-analytics](docs/add-rybbit-analytics.md) | Sets up self-hosted [Rybbit](https://rybbit.com) analytics on your website: a consent pop-up, session replay that starts after a visitor agrees (in the default Hybrid mode), masked form fields, and a privacy policy that matches what the code does. It can also set up the server. |

I run this setup on my own sites: [cascadeforjira.com](https://cascadeforjira.com), [rowbalance.com](https://rowbalance.com), [taxwizard.pk](https://taxwizard.pk) and [ahmadfiaz.me](https://ahmadfiaz.me).

## Install

Each category is its own plugin, so you only get the skills you want.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude plugin marketplace add ahmedfiazjan/skills
claude plugin install ahmadfiazjan-product@ahmadfiazjan
```

You get updates when a new version is released.

</details>

<details>
<summary><strong>Codex</strong></summary>

```bash
codex plugin marketplace add ahmedfiazjan/skills
codex plugin add ahmadfiazjan-product@ahmadfiazjan
```

</details>

<details>
<summary><strong>Copilot, Gemini CLI, Cursor or any other agent</strong></summary>

```bash
npx skills add ahmedfiazjan/skills --skill add-rybbit-analytics
```

This copies the skill into your project. Run the same command again to update it. It needs Node.js.

</details>

The repo lives under my GitHub username, `ahmedfiazjan`. The plugins use the spelling of my name, `ahmadfiazjan`. Both are correct.

## How these skills behave

- **You can read everything.** Each skill is Markdown. Read its `SKILL.md` before you install it.
- **Asks before changes.** Each skill tells the agent to ask before it changes a server, a database or a live site.
- **Secrets stay with you.** Each skill tells the agent to have you type passwords and keys yourself.
- **Nothing is sent to me.** Installing a skill sends nothing to me. This one adds analytics to your site, which is its job.

These are instructions the skills give to the agent, not guarantees. Agents make mistakes, so read what yours asks to run.

Found a problem or want a skill? [Open an issue](https://github.com/ahmedfiazjan/skills/issues).

## License

[MIT](LICENSE). Made by [Ahmad Fiaz Jan](https://ahmadfiaz.me) · [hello@ahmadfiaz.me](mailto:hello@ahmadfiaz.me)
