# LifeHub — Your Day in One Calm Place

A personal dashboard you open in the morning and keep open all day. It catches every loose end — to-dos, notes, photos, voice memos, saved links, habits, calendar events, even your email — and turns the pile into one tidy, searchable place. The idea: you stop losing things and stop jumping between ten different apps.

## What it does
- **Today screen** — one view of what's on your plate: your focus tasks, a peek at your calendar, today's habits, recent notes, and a short AI summary of your unread email.
- **Quick capture** — one box that's always there. Type a thought, paste a link, drop a photo, or hit the microphone, and LifeHub figures out whether it's a task, a note, a link, a receipt, or a voice memo.
- **Inbox** — one place to clear everything: things you jotted, unread emails, photos to read text from. Each one can become a task or a note with a click.
- **Habits** — a weekly grid you tap to mark today, with a streak counter.
- **Calendar** — a weekly schedule; you can import a calendar file from Apple, Google, or others.
- **Saved links & notes** — every link you paste is kept with its title; notes are tagged and searchable.
- **Reads receipts and photos** — snap a photo and it pulls out the text (like the amount on a receipt).
- **Voice memos** — record while walking and it turns your speech into searchable text.

## Status
Work in progress. It's a website that runs on your computer (no public address yet). Everything is saved on your own device first and works offline — even on a plane. Connecting email, AI features, or syncing to other devices is optional and you turn each on yourself.

---
### For developers
Next.js 14 (App Router) + TypeScript + Tailwind. Local-first storage via Dexie/IndexedDB with live queries; optional Supabase sync (paste URL + anon key, run `supabase-schema.sql`). Capture pipeline: regex-first text classifier (OpenAI-augmented if a key is set), Tesseract.js OCR in a browser worker, `MediaRecorder` + Web Speech API voice (Whisper if OpenAI key set), server-side link unfurl. Slash commands route to sibling apps (`/agent` → AI OS, `/app` → AppMaker, `/vault` → Markdown vault). Cross-project Assets indexer uses better-sqlite3 + FTS5. Fuzzy search via Fuse.js; vault frontmatter validated with zod + gray-matter.

```bash
npm install
npm run dev   # http://localhost:5175
```

First load seeds a `local-guest` user with sample data. Optional setup (Gmail OAuth, OpenAI key, calendar import, sync) is documented in `.env.local.example`. The full mail-reader companion app is `Postbox`. MIT licensed.
