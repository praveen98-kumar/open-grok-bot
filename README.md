# Open Grok Bot

A self-hosted, open source take on xAI's Grok Bot: AI teammates ("Bots") that work on
their own Linux computer, with a browser, a terminal, and files. They keep memory, use
your apps, run on schedules, and ask before doing anything risky.

Run it on your own VPS. Use it from your desktop or phone in the browser.

> Status: design phase. Nothing works yet. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Working name.** "Grok" is xAI's trademark. We must rename the project before we
> wrap up and release. See [Before release: rename](#before-release-rename).

## Goals

- Multiple named Bots, each with its own chat and memory, plus a primary Bot that coordinates them
- A shared, persistent computer (browser, terminal, `/workspace`) that you can watch live and take over
- Approvals before risky actions, and a vault so the model never sees your secrets
- Skills, routines (cron and webhooks), and MCP apps
- **Harness agnostic.** The brain is any agent harness: Claude Code first, then Codex and others.
  The harness picks the model.
- One `docker compose up` on your own VPS. Open prompts, open code.

## Project structure

```
open-grok-bot/
├── apps/server/      # API, agent runtime, scheduler (Node + TypeScript)
├── apps/web/         # web UI (React PWA)
├── packages/harness/ # harness adapter interface + adapters (claude-code, codex, …)
├── packages/shared/  # types shared by server and web
├── computer/         # Docker image for the Bots' Linux computer
├── deploy/           # docker-compose, Caddy, .env.example
├── docs/             # design notes and decisions
└── tests/            # end-to-end tests
```

## Getting started

TBD.

## Before release: rename

"Open Grok Bot" is a working name only. "Grok" and "Grok Bot" belong to xAI, so we
will rename the project before the first release to avoid trademark and copyright
problems. The rename touches:

- the repo and folder name (`open-grok-bot`)
- package names in `package.json` files (`open-grok-bot`, `@open-grok-bot/*`)
- the copyright line in `LICENSE`
- this README, `docs/`, and code comments

Find every spot with `git grep -i grok`.

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
