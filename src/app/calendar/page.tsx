"use client";
import { useMemo, useState } from "react";
import { useEventsRange } from "@/lib/db/hooks";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const ROW_PX = 40;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // ISO weeks start Mon (1). JS getDay() Sun=0..Sat=6.
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CalendarPage() {
  const [anchor, setAnchor] = useState<Date>(new Date());
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const events = useEventsRange(weekStart.getTime(), weekEnd.getTime()) || [];
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

  const fmtRange = (a: Date, b: Date) => {
    const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const last = new Date(b); last.setDate(last.getDate() - 1);
    return `${a.toLocaleDateString(undefined, o)} – ${last.toLocaleDateString(undefined, o)}`;
  };

  const shift = (days: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + days);
    setAnchor(d);
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Calendar</div>
          <div className="view-sub">{fmtRange(weekStart, weekEnd)} · {events.length} event{events.length === 1 ? "" : "s"}</div>
        </div>
        <div className="cal-week-nav">
          <button className="tool-btn" onClick={() => shift(-7)}>‹ Prev</button>
          <button className="tool-btn" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="tool-btn" onClick={() => shift(7)}>Next ›</button>
        </div>
      </div>

      <div className="cal-week">
        <div className="cal-corner"></div>
        {days.map((d, i) => (
          <div key={i} className={"cal-dayhead" + (sameDay(d, today) ? " today" : "")}>
            <div className="dow">{DOW[i]}</div>
            <div className="num">{d.getDate()}</div>
          </div>
        ))}

        <div className="cal-timecol">
          {hours.map(h => <div key={h} className="cal-hourcell" style={{ borderBottom: "none" }}>{h}:00</div>)}
        </div>

        {days.map((d, i) => {
          const dayEvents = events.filter(e => {
            const start = new Date(e.start);
            return sameDay(start, d);
          });
          return (
            <div key={i} className="cal-hourcol" style={{ minHeight: ROW_PX * hours.length }}>
              {hours.map(h => <div key={h} className="cal-hourcell" />)}
              {dayEvents.map(e => {
                const s = new Date(e.start), en = new Date(e.end);
                const top = Math.max(0, (s.getHours() - FIRST_HOUR + s.getMinutes() / 60) * ROW_PX);
                const height = Math.max(20, ((en.getTime() - s.getTime()) / 3_600_000) * ROW_PX);
                return (
                  <div
                    key={e.id}
                    className="cal-evt"
                    style={{ top, height }}
                    title={`${e.title}\n${s.toLocaleTimeString()} – ${en.toLocaleTimeString()}\n${e.sub || ""}`}
                  >
                    <b>{e.title}</b>
                    {e.sub && height > 36 && <span style={{ color: "var(--muted)" }}>{e.sub}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
