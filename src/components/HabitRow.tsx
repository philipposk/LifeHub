"use client";
import { HABIT_ICON, IconCheck } from "./icons";
import { HabitRow as HabitModel, HabitLogRow } from "@/lib/db/schema";
import { logHabitCell } from "@/lib/db/hooks";

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateNDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function HabitRow({ habit, logs }: { habit: HabitModel; logs: HabitLogRow[] }) {
  const Icon = HABIT_ICON[habit.icon] || IconCheck;
  const today = todayStr();
  // 9-day strip ending today
  const dates = Array.from({ length: 9 }, (_, i) => dateNDaysAgo(8 - i));
  const logByDate = Object.fromEntries(logs.map(l => [l.date, l.value]));

  const cycle = async (date: string) => {
    const cur = (logByDate[date] ?? 0) as 0 | 1 | 2 | 3;
    const next = (((cur + 1) % 4) as 0 | 1 | 2 | 3);
    await logHabitCell(habit.id, date, next);
  };

  return (
    <div className="habit-row">
      <div className="habit-name">
        <div className="ico"><Icon /></div>
        {habit.name}
      </div>
      <div className="habit-cells">
        {dates.map((d) => {
          const v = (logByDate[d] ?? 0) as number;
          return (
            <div
              key={d}
              className={"habit-cell" + (v ? " f" + v : "") + (d === today ? " today" : "")}
              title={d}
              onClick={() => cycle(d)}
            />
          );
        })}
      </div>
    </div>
  );
}
