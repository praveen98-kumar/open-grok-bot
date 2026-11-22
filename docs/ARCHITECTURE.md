# Open Grok Bot: Architecture

A self-hosted, open source take on xAI's **Grok Bot** (the "AI teammates on a cloud
computer" product, `@bot` on X). Everything runs on one Linux VPS you own. You use it
from a browser on your desktop or phone.

## 1. What Grok Bot is (what we're cloning)

Taken from xAI's docs (docs.x.ai/grok-bot) as of Nov 2026:

| Grok Bot feature | What it does | Our v1? |
|---|---|---|
| **Bots** | Durable named agents. Each has its own chat, memory, and screen. Role is set by chatting, not by a settings form. | Yes |
| **Primary Bot** | Your main contact. Checks in on its own and hands work to other Bots. | Yes |
| **Computer** | One persistent Linux machine shared by all Bots: browser, terminal, files. Durable files live in `/workspace`. Logins are shared. | Yes (Docker container) |
| **Watch / Take over** | Live view of the Bot's screen. You take control for SSO, passkeys, CAPTCHAs. | Yes (noVNC) |
| **Memory** | Per-Bot: preferences, rules, dated work log. Shared: your name, time zone. Bots decide what to keep. | Yes |
| **Vault + Secure Forms** | Logins, cards, API keys. The model never sees the values. | Yes |
| **Apps / MCP** | Connectors (Gmail, Drive, Slack…) plus any MCP server by URL or command. | MCP yes; OAuth apps v2 |
| **Skills** | Reusable instructions (`SKILL.md` + scripts), called with `/`. | Yes |
| **Routines** | Run a skill on a schedule or on an event (webhook, Slack, GitHub, email). Min 5 min apart. | Cron + webhook in v1 |
| **Auto Review + approvals** | Every action is checked. "Ask first" rules show an approval card: Allow once / Always allow / Deny. Chat cards wait forever; background cards expire in 30 min. | Yes |
| **Drafts** | Outgoing email/Slack are drafts until you approve. | Yes (via approvals) |
| **Group chats** | 2 to 6 Bots plus you. `@bot`, `@everyone`. | Yes |
| **Handoffs** | Bots DM each other and share files. | Yes |
| **Files, Library, Pages** | Outputs show as cards. Library lists what a Bot made. Pages are interactive HTML reports. | Yes |
| **Channels** | Desktop, mobile, Slack, X Chat, `@bot` mentions on X. | Web first, then Telegram, X, Slack |
| **Voice** | Dictation, voice calls, voice memos. | v2 |
| **Teach a task** | Record a browser demo, get a draft skill. | v3 |
| **Templates / marketplace** | Share a Bot's config as a copy. | v2 (export/import JSON) |

What we drop: teams/enterprise, billing, usage pools. It's single-user and self-hosted.
Your cost is the VPS plus LLM tokens.

## 2. Key decisions

1. **One language: TypeScript, everywhere.** Server, agent runtime, UI, and shared types
   in one monorepo. The MCP SDK, Playwright, and every LLM SDK are first-class in TS.
2. **The UI is a web app served from the VPS.** Open it in any browser, and install it
   as a PWA on desktop and phone. No Electron. You can wrap it in Tauri later if you
   really want a native window.
3. **Harness agnostic. We don't write our own agent loop.** The brain of a Bot is an
   existing agent harness: Claude Code first, then Codex, then others. Each one plugs in
   through one small adapter (`packages/harness`). See §6.
4. **The model is chosen per Bot, as harness + model.** For example `claude-code` +
   `opus`, or `codex` + `gpt-5`. The harness handles its own provider and auth.
5. **The "computer" is one long-lived Docker container.** Ubuntu, Xvfb, a light window
   manager, Chromium, a terminal, and a `/workspace` volume. It mirrors Grok Bot's
   model: one machine, shared logins, not a security boundary between Bots.
6. **Postgres is the only stateful service.** It holds data, job queue, cron, and
   realtime fan-out (LISTEN/NOTIFY). No Redis.
7. **v1 is a single server process.** API, WebSocket, agent runs, and scheduler all
   live in one Node process. Runs are durable rows, so a restart resumes or fails them
   cleanly. Split into workers only when load forces it.

## 3. System overview

```
 Your desktop / phone (browser, PWA)
            │  HTTPS + WebSocket
            ▼
 ┌──────────────────────── VPS ─────────────────────────────┐
 │  Caddy (TLS, only public port 443)                       │
 │     │                                                     │
 │     ▼                                                     │
 │  server  (Node, one process)                              │
 │   ├─ HTTP API + WebSocket events                          │
 │   ├─ Agent runtime  (drives one harness run per Bot)      │
 │   ├─ Auto Review    (checks every tool call)              │
 │   ├─ Vault          (encrypted secrets, injected late)    │
 │   ├─ Scheduler      (routines: cron + triggers)           │
 │   ├─ MCP client hub (remote + command MCP servers)        │
 │   └─ Channels       (web, Telegram, X, Slack)             │
 │     │            │                    │                   │
 │     ▼            ▼                    ▼                   │
 │  Postgres    computer container   LLM APIs (outbound)     │
 │              ├─ Xvfb + WM + Chromium (CDP :9222)          │
 │              ├─ VNC → noVNC (proxied by server, auth'd)   │
 │              ├─ harness CLIs (claude, codex, …) run here  │
 │              └─ /workspace volume                         │
 └───────────────────────────────────────────────────────────┘
```

Only Caddy is public. The computer container's VNC and CDP ports are reachable only on
the internal Docker network. The browser reaches them through the server, which checks
your session.

## 4. Repository layout

```
open-grok-bot/
├── apps/
│   ├── server/                 # Node: API, agent runtime, scheduler
│   │   └── src/
│   │       ├── main.ts         # boot: db, http, ws, scheduler, resume runs
│   │       ├── config.ts       # env parsing (zod)
│   │       ├── db/
│   │       │   ├── schema.ts   # drizzle tables (see §5)
│   │       │   └── migrations/
│   │       ├── http/           # Hono routes: auth, bots, chats, approvals, vault,
│   │       │                   #   skills, routines, apps, files, computer, webhooks
│   │       ├── events.ts       # typed event bus → WebSocket + Postgres NOTIFY
│   │       ├── agent/
│   │       │   ├── run.ts      # start a harness run, stream its events, persist steps
│   │       │   ├── prompt.ts   # system prompt: persona, memory, skills index, rules
│   │       │   ├── context.ts  # history windowing + summarization
│   │       │   └── inbox.ts    # message routing: user DM beats background work
│   │       ├── tools/          # one file per tool family (see §6)
│   │       ├── review/
│   │       │   ├── rules.ts    # built-in + user "Allow" / "Ask first" rules
│   │       │   └── review.ts   # decide: allow | ask | deny (+ optional LLM check)
│   │       ├── vault/          # encrypt/decrypt, secret refs, secure-form requests
│   │       ├── computer/
│   │       │   ├── shell.ts    # exec in container, stream output
│   │       │   ├── browser.ts  # Playwright over CDP, one tab group per Bot
│   │       │   └── vnc.ts      # authenticated WebSocket proxy to noVNC
│   │       ├── mcp/            # connect, list tools, call; per-server status
│   │       ├── skills/         # load SKILL.md folders, index, install
│   │       ├── routines/       # cron (croner), triggers, rate limits, run history
│   │       └── channels/       # web.ts, telegram.ts, x.ts, slack.ts
│   │
│   └── web/                    # React + Vite + Tailwind PWA
│       └── src/
│           ├── app/            # routes: /, /bot/:id, /group/:id, /settings/*
│           ├── components/
│           │   ├── sidebar/    # bots (primary ★), groups, new (+)
│           │   ├── chat/       # messages, step timeline, composer (@ and /)
│           │   ├── cards/      # approval, secret form, file, page, take-over
│           │   ├── computer/   # noVNC viewer, terminal (xterm.js), file browser
│           │   └── library/
│           ├── lib/ws.ts       # one WebSocket, typed events from packages/shared
│           └── lib/api.ts
│
├── packages/
│   ├── harness/                # Harness interface + adapters: claude-code.ts, codex.ts
│   └── shared/                 # zod schemas + event types used by server and web
│
├── computer/
│   ├── Dockerfile              # Ubuntu, Xvfb, openbox, Chromium, x11vnc, noVNC,
│   │                           #   git, python, node, common CLIs
│   ├── entrypoint.sh
│   └── agentd/                 # tiny exec/file daemon (optional; docker exec in v1)
│
├── deploy/
│   ├── docker-compose.yml      # caddy, server, postgres, computer
│   ├── Caddyfile
│   └── .env.example
│
├── docs/
│   ├── ARCHITECTURE.md         # this file
│   └── adr/                    # one file per decision as we go
├── tests/                      # cross-app e2e (Playwright against the web UI)
├── package.json                # pnpm workspaces
└── README.md
```

## 5. Data model (Postgres)

```
bots            id, name, avatar, color, is_primary, provider, model,
                persona (text, written by the bot from chat), hidden, created_at
chats           id, kind (dm | group), title
chat_members    chat_id, bot_id                    -- dm = 1 bot, group = 2..6
messages        id, chat_id, author (user | bot_id), body, attachments[],
                reply_to, created_at
runs            id, bot_id, chat_id, trigger (user | routine | handoff | channel),
                status (queued | running | waiting_approval | done | failed | cancelled),
                started_at, ended_at, error
steps           id, run_id, seq, kind (thought | tool_call | tool_result),
                tool, input_json (secrets as refs), output_json, review_verdict
approvals       id, step_id, run_id, summary, input_json, status
                (pending | allowed | denied | expired), expires_at, decided_at
rules           id, effect (allow | ask), scope (global | bot_id), text, matcher_json
memories        id, bot_id (null = shared), kind (fact | preference | rule | log),
                content, created_at, updated_at
secrets         id, name, kind (login | api_key | card | note), domain,
                ciphertext, created_at
secret_requests id, run_id, name, kind, status (pending | filled | cancelled)
skills          id, name, description, path, enabled_for (all | bot_ids[])
routines        id, bot_id, name, prompt_or_skill, schedule_cron, tz,
                trigger (cron | webhook | telegram | x_mention | ...),
                webhook_token_hash, paused, created_at
routine_runs    id, routine_id, run_id, status, error, created_at  -- keep last 20
apps            id, name, transport (http | stdio), url_or_command, headers_enc,
                status (ok | needs_auth | disconnected), enabled_for
files           id, bot_id, chat_id, path (in /workspace), mime, kind (file | page | image)
```

The `steps` table is what the UI streams. It's also your audit log.

## 6. Agent runtime

### Harnesses (`packages/harness`)

A harness is any agent CLI or SDK that can run a loop with tools. Each adapter turns a
`RunRequest` into one harness run and maps its native output to our `HarnessEvent`s.

| Harness | How we drive it | Order |
|---|---|---|
| Claude Code | Claude Agent SDK / `claude -p --output-format stream-json` | 1st |
| Codex CLI | `codex app-server` / `codex exec --json` | 2nd |
| Others (Pi, Hermes, OpenCode, …) | Same interface, one adapter each | Later |

Rules that keep every harness first-class:

1. **The harness runs inside the computer container**, with cwd `/workspace`. Its own
   shell, file, and edit tools then act on the Bot's computer for free.
2. **Our features are one MCP server.** Memory, vault, messaging, handoffs, approvals,
   browser, skills, routines, and pages are tools on our MCP server. Every harness that
   speaks MCP gets all of them, with no per-harness code.
3. **Auto Review uses the harness's native approval hook** (for example Claude Code's
   `canUseTool` / `PreToolUse`, Codex's approval requests). An adapter without a hook
   runs with native side-effect tools off, so every side effect goes through our MCP
   server, where review is always enforced.
4. **Sessions are the harness's own.** We store its session id and resume it. Our
   `steps` table is the cross-harness record the UI shows.
5. **Capabilities are declared, not assumed.** Each adapter reports what it supports
   (resume, MCP, approval hook, images). The UI hides what a harness can't do.

A new user message to a busy Bot goes into its **inbox**. Where the harness supports
mid-run input, the adapter injects it. Otherwise the run is interrupted and resumed
with the message (Grok Bot's "a direct message from you takes priority over background
work").

### Tools (our MCP server)

Shell and files are fallbacks. Most harnesses bring their own.

| File | Tools | Notes |
|---|---|---|
| `shell.ts` | `run_command`, `read_output` | Inside the computer, cwd `/workspace`. Long jobs run in the background with a handle. |
| `files.ts` | `read_file`, `write_file`, `list_dir`, `share_file` | `share_file` puts a file card in chat and in the Library. |
| `browser.ts` | `open`, `snapshot`, `click`, `type`, `fill_secret`, `screenshot`, `scroll`, `wait` | Playwright over CDP. `snapshot` returns the accessibility tree with refs (cheap). Screenshots go to vision models only when needed. |
| `memory.ts` | `remember`, `forget`, `recall` | Per-Bot or shared. A dated work-log entry is written at the end of each run. |
| `vault.ts` | `request_secret`, `list_secrets` | `request_secret` shows a secure form card. The model only ever gets `{{secret:name}}` refs. |
| `messaging.ts` | `send_message`, `message_bot`, `ask_user`, `request_takeover` | `message_bot` is how handoffs work. `request_takeover` pauses and shows a "Take control" card. |
| `skills.ts` | `use_skill`, `save_skill` | The prompt lists names and descriptions only. The body loads on demand. |
| `routines.ts` | `create_routine`, `update_routine`, `test_routine` | Enforces 5-minute minimum interval and hourly run caps. |
| `pages.ts` | `publish_page` | Saves an HTML report to `/workspace/pages/`, served behind auth. |
| `mcp/*` | Every tool from every connected MCP server | Named `app__tool`. Reviewed like any other tool. |

### Auto Review (`review/`)

Every tool call passes through `review()` before it runs. The order:

1. **Built-in hard rules** (always on). Examples: never print a secret, never `rm -rf /workspace`,
   no access to the server's private network.
2. **User "Ask first" rules.** Ask first beats Allow when both match.
3. **User "Allow automatically" rules.** These are added by "Always allow" on a card.
4. **Default risk class per tool.** Reading is allowed. Anything that sends, posts,
   buys, deletes, or publishes is **ask**. Shell is allowed, except commands matching
   risky patterns.
5. **Optional LLM check** (cheap model) for prompt injection. Content from web pages,
   emails, and MCP results is data, never instructions. Only your messages are
   instructions.

Cards from chat wait forever. Cards from routines or background work expire after
30 minutes, and the action does not run.

### Memory and context

- The system prompt contains: shared facts about you, this Bot's persona and rules, the
  last N work-log entries, the skills index, and active approval rules.
- History is windowed. Older turns are summarized into the run, not thrown away.
- There's no memory screen in Grok Bot. We add a read-only one in Settings anyway,
  because self-hosters will want to see it.

## 7. The computer

One container, `computer`, built from `computer/Dockerfile`:

- **Display:** Xvfb on `:1`, openbox, x11vnc. The server proxies noVNC over an
  authenticated WebSocket. This is the "watch" and "take over" view.
- **Browser:** one Chromium with a persistent profile under `/home/bot/.chromium`, and
  remote debugging on the internal network. Every Bot drives its own tab group, so
  logins are shared, like Grok Bot.
- **Terminal:** the server runs commands with `docker exec` and streams output. The UI
  terminal panel is xterm.js on the same channel.
- **Storage:** `/workspace` and the browser profile are Docker volumes. Everything else
  is replaceable, which matches Grok Bot's "Update / Recover / Reset" model.
- **Network:** outbound internet, yes. Postgres and the server's admin port, no.
  Separate Docker network.

**Known v1 trade-off:** Grok Bot gives each Bot its own screen. We start with one shared
display and one tab group per Bot. Only one Bot at a time can do visual (screenshot or
click-by-coordinate) work. Accessibility-tree browsing works in parallel. Per-Bot
displays (`:1`, `:2`, …) come in v2.

## 8. Security on a public VPS

This box holds your logins and runs an agent with a shell. Treat it that way.

- **Auth:** single user, password plus TOTP, httpOnly session cookie. Better still, put
  the whole thing behind Tailscale and never open 443 to the world.
- **Vault:** AES-256-GCM (libsodium). The master key comes from an env file outside the
  repo. Values are only decrypted at the moment a tool needs them.
- **Webhooks** for routines use per-routine bearer tokens, stored hashed.
- **Blast radius:** the computer container runs as non-root, has no Docker socket, and
  can't reach Postgres. The server is the only thing with DB access.
- **Audit:** every step, approval, and secret use is a row you can read.

## 9. UI

Desktop layout (three panes, collapses to one on phone):

```
┌───────────┬────────────────────────────────┬──────────────────────┐
│ ★ Atlas   │  Atlas                    ⋯    │ [Computer][Files]    │
│   Scout   │                                │ [Terminal][Library]  │
│   Ledger  │  you: find 3 flats under…      │                      │
│ ───────── │  ▸ opened rightmove.co.uk      │   live noVNC view    │
│ Groups    │  ▸ searched “2 bed, E8”        │   of the computer    │
│   Launch  │  ┌ Approval ───────────────┐   │                      │
│ ───────── │  │ Send email to agent@…   │   │   [ Take control ]   │
│ + New     │  │ Allow once · Always · ✕ │   │                      │
│           │  └─────────────────────────┘   │                      │
│ ⚙ Settings│  [ Message Atlas…  @  /  📎 ]  │                      │
└───────────┴────────────────────────────────┴──────────────────────┘
```

Settings: Models and keys · Vault · Apps (MCP) · Skills · Routines · Rules · Memory ·
Computer (restart / reset) · Channels.

## 10. Channels

| Channel | How | When |
|---|---|---|
| Web/PWA | Built in | v1 |
| Telegram | Bot API long-poll. Your phone talks to the same Bots. Easiest mobile path. | v1.1 |
| X mentions | Poll `GET /2/users/:id/mentions` for your own account ($0.001 per post read on pay-per-use). A mention starts a run, like `@bot`. Replying costs $0.015 per post ($0.20 with a link). | v2 |
| Slack | Socket Mode app. Mentions and DMs become messages. Slack triggers for routines. | v2 |
| Email | An inbound address (e.g. Cloudflare Email Routing → webhook) as a routine trigger. | v2 |

## 11. Deployment

```
git clone … && cd open-grok-bot/deploy
cp .env.example .env      # domain, admin password, VAULT_KEY, LLM API keys
docker compose up -d      # caddy, server, postgres, computer
```

Minimum VPS: 4 vCPU, 8 GB RAM, 80 GB disk. Chromium plus a few Bots is the main
memory cost. LLM inference is remote, so no GPU is needed.

## 12. Build order

1. **Skeleton:** monorepo, compose, Postgres schema, login, empty three-pane UI.
2. **One Bot, one chat:** Claude Code adapter, our MCP tool server, streaming steps.
3. **The computer:** container, browser tools over CDP, noVNC panel, take over.
4. **Safety:** Auto Review, approval cards, Vault, secure forms.
5. **Memory and skills.**
6. **Multiple Bots:** primary Bot, `message_bot` handoffs, group chats.
7. **Routines:** cron, webhook triggers, run history.
8. **MCP apps.**
9. **Telegram, then X, then Slack.**
10. Voice, per-Bot displays, templates.

Each step ends with something you can use from your desktop.

## 13. Prior art to read before building

Several open source projects already target this (listed in
github.com/ZeroPointRepo/awesome-grok-bot), including two with this exact name:
`Anil-matcha/open-grok-bot` (FastAPI + Next.js) and `ishandutta2007/open-grokbot`
(docker compose, persistent sandboxes). Worth an hour to read them and steal good ideas.
