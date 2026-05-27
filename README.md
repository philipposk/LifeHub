# LifeHub

> Your day, in one calm place. A local-first personal dashboard that catches every loose end — tasks, notes, photos, voice memos, links, habits, calendar events, emails — and turns them into something searchable, organisable, and actually useful.

**Local dev:** [http://localhost:5175](http://localhost:5175) · *(no public deployment yet)*

---

## What it does (in plain English)

LifeHub is the dashboard you open in the morning and don't close until evening.

- **Today** — one screen showing what's on your plate: focus tasks, your calendar peek, today's habit progress, recent notes, anything sitting in your inbox, a 3-bullet AI summary of unread email, in-flight agent runs.
- **Quick capture** — one always-visible textbox. Type, paste a URL, drop a photo, hit the mic. LifeHub figures out whether what you just dumped is a task, a note, a link, a receipt, a voice memo, or something to triage later. It stops you from losing things.
- **Inbox** — a single place to clear: captures you made, unread emails, photos to OCR. Each row has Promote → Task / Promote → Note / Done. Inbox-zero, but for your whole life, not just email.
- **Habits** — colour-graded weekly cells. Click to mark today. Streak counter on Today.
- **Calendar** — full weekly grid (Mon–Sun, 6am–10pm). Import any `.ics` file in Settings. Drop-in for Apple Calendar, Google Calendar, Fastmail, anything that exports iCal.
- **Vault** — an opinionated Markdown store at `~/SecondBrain/vault`. Folders for Projects, Prompts, Code, Research, Agents, Templates, SOPs, Datasets, Ideas. Type `/vault prompt RAG eval v2` in Quick capture → file appears on disk with proper YAML frontmatter.
- **Assets** — runs a one-time scan over `Devoloper Projects/*` and indexes every `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, prompt file, and AppBlueprints YAML across your laptop. Then `/assets` becomes a searchable card view of every personal-dev artifact you own.

## Why a person actually wants this

Most "productivity apps" force you to learn their schema. LifeHub is the opposite: it watches what you actually do — jot things, take photos, paste links, record voice while walking — and silently routes each scrap to the right place.

- **You stop losing things.** Voice memo about a cabin trip → searchable text in Inbox. Photo of a receipt → OCR'd amount + line items. URL pasted at midnight → unfurled with title and snippet, sitting in Saved.
- **You stop tab-switching.** Triage Gmail without opening Gmail. Send a prompt to AI OS without leaving Today. See the AppBlueprints MCP catalog inside the same window you write notes in.
- **You stop being held hostage by the cloud.** Everything lives in your browser's IndexedDB first. Sync to Supabase is opt-in, and is just a paste of a URL + anon key in Settings — no signup screen, no marketing emails. Works on a plane.
- **You stop re-inventing your workflow.** Designed to be the thin layer above all the *other* tools you already use (Gmail, AI OS, AppMaker, AppBlueprints, Cosmo) — a single triage surface so you can clear your day from one screen.

## Features

### Dashboard
- **Today** — focus tasks, calendar peek, habit week strip, recent notes, inbox preview, email digest, agent runs card, MCP pick of the day.
- **Tasks** — 4 sections (Today / This week / Next week / Someday), inline add, All/Today/Open/Done filters, area chips.
- **Notes** — pinned + tag-filtered grid, Markdown body.
- **Calendar** — weekly grid with positioned events, `.ics` import via Settings.
- **Inbox** — captures + unread emails together, one-click Promote → Task / Note.
- **Captures** — photo thumbnails (Tesseract OCR), audio playback for voice memos, text + link tiles.
- **Habits** — click any cell to cycle value 0–3, real streak counter.
- **Areas** — rename + recolour the Work/Home/Health/Focus chips.
- **Saved** — every URL you've pasted, as clickable tiles with unfurled titles.
- **Tags** — auto-collected `#tag` cloud across notes + captures.

### Capture pipeline
- **Text classifier** — regex-first, OpenAI-augmented if you paste an API key.
- **Photo OCR** — `tesseract.js` runs in browser worker, stores blob + extracted text.
- **Voice** — `MediaRecorder` + Web Speech API live transcript; Whisper takes over if OpenAI key set.
- **Link unfurl** — server-side OG/Twitter/HTML parser with 6 s timeout.
- **Slash commands** — `/agent <prompt>` (AI OS), `/app <idea>` (AppMaker), `/vault <type> <title>` (Markdown vault).

### Integrations (all opt-in, each gated by Settings toggle)
- **Gmail** — OAuth, fetch unread + starred, AI digest, Promote → Task/Note.
- **IMAP** — stub here, full client in the sibling [`Triage`](../Triage) app.
- **AI OS** — start workflows, 5 s polling, accounting card.
- **AppMaker** — `/app …` slash command turns into a generated app preview.
- **AppBlueprints** — reads its `data/mcps/*.json` into a searchable MCP catalog.
- **Cosmo** — read-only mirror of your profile + recent content. Auto-links by email when you sign into Supabase.

### Platform
- **Local-first** — Dexie/IndexedDB. Zero config, works offline, works on a plane.
- **Optional Supabase sync** — paste URL + anon key, schema bootstrap in [`supabase-schema.sql`](./supabase-schema.sql), generic outbox table.
- **Command palette** — ⌘K (or just `/`) fuzzy search across tasks + notes + captures.
- **Hotkeys** — `N` jumps to Tasks, `/` opens palette.
- **Tweaks panel** — bottom-right floating button. Accent, dark/light, density.

## Quickstart

```bash
git clone https://github.com/philipposk/LifeHub.git
cd LifeHub
npm install
npm run dev   # http://localhost:5175
```

First load seeds a `local-guest` user + sample data so the UI is non-empty.

### Optional setup

| What | Where | What you need |
|---|---|---|
| Sync to other devices | Settings → Sync | Supabase project URL + anon key + run [`supabase-schema.sql`](./supabase-schema.sql) once |
| AI capture classifier + email digest + Whisper voice | Settings → AI | OpenAI API key |
| Gmail triage | `/integrations/email` | Google Cloud OAuth client (Web app) + redirect `http://localhost:5175/integrations/email/callback` + enable Gmail API on the project |
| Calendar import | Settings → Calendar | `.ics` file from any provider |
| AI OS workflows | Settings → AI OS | Base URL + API key |
| AppMaker prompts | Settings → AppMaker | Base URL |
| Cosmo profile mirror | `/integrations/cosmo` | Base URL |
| MCP catalog | `/integrations/mcps` | Path to AppBlueprints `data/mcps` dir |
| Vault + Assets indexer | env | `VAULT_ROOT`, `INDEX_DIR`, `PROJECT_ROOTS` (defaults to `~/SecondBrain/...`) |

See [`.env.local.example`](./.env.local.example) for every supported env var.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Dexie 4** + `dexie-react-hooks` for browser-local store + live queries
- **Supabase** SDK for optional sync
- **OpenAI** SDK for classify + digest + Whisper
- **Tesseract.js** for OCR
- **Fuse.js** for fuzzy search
- **better-sqlite3** + FTS5 for the cross-project Assets indexer
- **zod** + **gray-matter** for the Vault frontmatter contract

## Related apps in this constellation

LifeHub is designed to be the calm dashboard layer over a small fleet of focused apps. The full mail-reader, with threads, bodies, attachments, IMAP IDLE, and SMTP send, is the [`Triage`](../Triage) app — see its [`PLAN.md`](../Triage/PLAN.md) for the architecture.

## License

MIT — see [LICENSE](./LICENSE).
