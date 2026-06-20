import { db, LOCAL_USER_ID, uid } from "./schema";
import { localDateKey } from "../date";

const now = () => Date.now();

const SEED_AREAS = [
  { name: "Work",   color: "#4A6FA5", cls: "work" },
  { name: "Home",   color: "#A56B4A", cls: "home" },
  { name: "Health", color: "#5C8A5C", cls: "health" },
  { name: "Focus",  color: "#5C6B4A", cls: "focus" },
];

const SEED_TASKS = [
  { text: "Review Q2 product brief",        chipLabel: "Work",   chipCls: "work",   due: "10:00", focus: true,  done: false, section: "today" },
  { text: "Pick up dry cleaning",           chipLabel: "Home",   chipCls: "home",   due: "Today",  focus: false, done: false, section: "today" },
  { text: "30-min strength session",        chipLabel: "Health", chipCls: "health", due: "6pm",    focus: false, done: true,  section: "today" },
  { text: "Reply to landlord re: renewal",  chipLabel: "Home",   chipCls: "home",   due: "Today",  focus: false, done: false, urgent: true, section: "today" },
  { text: "Draft retrospective notes",      chipLabel: "Focus",  chipCls: "focus",  due: "Thu",    focus: false, done: false, section: "today" },
  { text: "Call mom for her birthday",       chipLabel: "Home",  chipCls: "home",   due: "Wed",    focus: false, done: false, section: "this-week" },
  { text: "Submit travel reimbursement",     chipLabel: "Work",  chipCls: "work",   due: "Thu",    focus: false, done: false, section: "this-week" },
  { text: "Renew passport application",      chipLabel: "Home",  chipCls: "home",   due: "Fri",    focus: false, done: false, section: "this-week" },
  { text: "Coffee with Priya",               chipLabel: "Focus", chipCls: "focus",  due: "Fri",    focus: false, done: false, section: "this-week" },
  { text: "Annual review prep",              chipLabel: "Work",  chipCls: "work",   due: "Jun 3",  focus: false, done: false, section: "next-week" },
  { text: "Bike tune-up",                    chipLabel: "Home",  chipCls: "home",   due: "Jun 4",  focus: false, done: false, section: "next-week" },
  { text: "Dentist follow-up",               chipLabel: "Health",chipCls: "health", due: "Jun 5",  focus: false, done: false, section: "next-week" },
  { text: "Read 'A Pattern Language'",       chipLabel: "Focus", chipCls: "focus",                  focus: false, done: false, section: "someday" },
  { text: "Plant herbs on balcony",          chipLabel: "Home",  chipCls: "home",                   focus: false, done: false, section: "someday" },
  { text: "Try sourdough recipe",            chipLabel: "Home",  chipCls: "home",                   focus: false, done: false, section: "someday" },
];

const SEED_NOTES = [
  { title: "Trip ideas — late summer",        body: "Lisbon for a week then 3 nights in the Algarve. Check flights mid-June. Friend mentioned the tile museum and pastéis at Manteigaria…", tag: "travel",   time: "2h ago",    pinned: true, serif: true },
  { title: "Book notes: Slow Productivity",   body: "Three principles — do fewer things, work at a natural pace, obsess over quality. The 'reasonable workload' calculation has been useful when planning the week.", tag: "reading", time: "yesterday", pinned: false },
  { title: "Things to ask the doctor",        body: "Sleep quality has been off. Mention waking at 3am most nights. Ask about vit. D levels and whether the current dose still makes sense.", tag: "health", time: "Mon",       pinned: false },
  { title: "Apartment maintenance",           body: "Kitchen faucet drip — needs new cartridge (Moen 1225). Bathroom fan rattles at startup. Hall light flickers every few days.", tag: "home",    time: "Mon",       pinned: false },
  { title: "Recipe — miso butter pasta",      body: "Toast 3 tbsp white miso with butter, add a splash of pasta water, finish with lemon zest and chili crisp. Simple weeknight win.", tag: "cooking", time: "last week", pinned: false },
  { title: "Gift ideas",                      body: "Dad — that wool overshirt he keeps mentioning. Sis — pottery class voucher at the studio on Mission. Both birthdays in July.", tag: "personal", time: "last week", pinned: false },
];

const SEED_HABITS = [
  { name: "Read 20 min",    icon: "book",    cells: [3,2,3,3,1,2,3,0,0] },
  { name: "Move",           icon: "run",     cells: [3,3,2,3,3,3,1,3,0] },
  { name: "Hydrate",        icon: "droplet", cells: [2,3,3,2,3,3,2,2,1] },
  { name: "No screens 9pm", icon: "clock",   cells: [3,1,2,3,0,2,3,3,0] },
];

const SEED_EVENTS = [
  { title: "Morning standup", sub: "Engineering · Google Meet",  startH: 9,  startM: 0,  endH: 9,  endM: 30, attendees: ["JM","RC","AT","+3"], color: "default" },
  { title: "1:1 with Priya",  sub: "Coffee · Blue Bottle",        startH: 10, startM: 30, endH: 11, endM: 15, attendees: ["PS"],                color: "b1" },
  { title: "Design review",   sub: "Studio room A",                startH: 14, startM: 0,  endH: 15, endM: 0,  attendees: ["MN","RC","JM"],     color: "b2" },
];

const SEED_CAPTURES = [
  { kind: "text" as const, body: "Receipt — Whole Foods · $84.20 · 4 items",     tags: ["receipt"],  processed: false },
  { kind: "link" as const, body: "On craftsmanship and small studios",            tags: ["article"],  processed: false },
  { kind: "voice" as const, body: "Idea about the weekend cabin trip (0:47)",     tags: ["voice"],    processed: false },
];

export async function ensureSeeded() {
  const d = db();
  const flag = await d.settings.get("seeded");
  if (flag?.value === true) return;

  await d.transaction(
    "rw",
    [d.users, d.tasks, d.notes, d.habits, d.habitLogs, d.events, d.captures, d.areas, d.settings],
    async () => {
      await d.users.put({ id: LOCAL_USER_ID, name: "You", createdAt: now() });

      const areaIdByCls: Record<string, string> = {};
      for (const a of SEED_AREAS) {
        const id = uid();
        areaIdByCls[a.cls] = id;
        await d.areas.put({ id, userId: LOCAL_USER_ID, name: a.name, color: a.color, cls: a.cls });
      }

      for (const t of SEED_TASKS) {
        await d.tasks.put({
          id: uid(),
          userId: LOCAL_USER_ID,
          text: t.text,
          due: t.due,
          chipLabel: t.chipLabel,
          chipCls: t.chipCls,
          focus: t.focus,
          done: t.done,
          urgent: (t as any).urgent,
          areaId: areaIdByCls[t.chipCls],
          section: t.section,
          createdAt: now(),
          updatedAt: now(),
          syncState: "local",
        });
      }

      for (const n of SEED_NOTES) {
        await d.notes.put({
          id: uid(),
          userId: LOCAL_USER_ID,
          title: n.title,
          body: n.body,
          tag: n.tag,
          pinned: n.pinned,
          serif: n.serif,
          time: n.time,
          createdAt: now(),
          updatedAt: now(),
          syncState: "local",
        });
      }

      for (const h of SEED_HABITS) {
        const habitId = uid();
        await d.habits.put({
          id: habitId,
          userId: LOCAL_USER_ID,
          name: h.name,
          icon: h.icon,
          cadence: "daily",
          createdAt: now(),
        });
        // seed last 9 days of cells
        const today = new Date();
        for (let i = 0; i < h.cells.length; i++) {
          const dt = new Date(today);
          dt.setDate(today.getDate() - (h.cells.length - 1 - i));
          const dateStr = localDateKey(dt);
          await d.habitLogs.put({
            id: uid(),
            habitId,
            date: dateStr,
            value: h.cells[i] as 0 | 1 | 2 | 3,
          });
        }
      }

      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (const e of SEED_EVENTS) {
        const start = new Date(today); start.setHours(e.startH, e.startM, 0, 0);
        const end   = new Date(today); end.setHours(e.endH,   e.endM,   0, 0);
        await d.events.put({
          id: uid(),
          userId: LOCAL_USER_ID,
          source: "local",
          title: e.title,
          sub: e.sub,
          start: start.getTime(),
          end: end.getTime(),
          attendees: e.attendees,
          color: e.color,
          createdAt: now(),
        });
      }

      for (const c of SEED_CAPTURES) {
        await d.captures.put({
          id: uid(),
          userId: LOCAL_USER_ID,
          kind: c.kind,
          body: c.body,
          tags: c.tags,
          processed: c.processed,
          createdAt: now(),
        });
      }

      await d.settings.put({ key: "seeded", value: true });
      await d.settings.put({ key: "tweaks", value: { accent: "#5C6B4A", density: "regular", dark: true } });
    }
  );
}
