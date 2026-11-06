import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateInput } from "../../lib/dates";

export interface MonthCalendarProps {
  /** Any date inside the month to display. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** YYYY-MM-DD -> number of items that day (shows a dot). */
  markers?: Record<string, number>;
  selected?: string | null;
  onSelect?: (date: string | null) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Accessible month grid (Monday first). Click a day to select, click again to clear. */
export function MonthCalendar({ month, onMonthChange, markers = {}, selected, onSelect }: MonthCalendarProps) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const first = new Date(year, mon, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const todayStr = toDateInput(new Date());

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateInput(new Date(year, mon, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-2" role="group" aria-label={`Calendar, ${label}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
          className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--bg)]"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-display font-semibold" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
          className="p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--bg)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[10px] font-semibold uppercase text-[var(--muted)]">
            {d}
          </span>
        ))}
        {cells.map((date, i) =>
          date === null ? (
            <span key={`e${i}`} />
          ) : (
            <button
              key={date}
              type="button"
              aria-label={`${new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}${markers[date] ? `, ${markers[date]} item${markers[date] > 1 ? "s" : ""}` : ""}`}
              aria-pressed={selected === date}
              onClick={() => onSelect?.(selected === date ? null : date)}
              className={`relative h-9 rounded-md text-xs tabular-nums transition-colors ${
                selected === date
                  ? "bg-[var(--green-700)] text-white font-semibold"
                  : date === todayStr
                  ? "border border-[var(--green-600)] font-semibold text-[var(--green-900)]"
                  : "hover:bg-[var(--bg)] text-[var(--text)]"
              }`}
            >
              {Number(date.slice(8))}
              {markers[date] ? (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                    selected === date ? "bg-white" : "bg-[var(--green-600)]"
                  }`}
                />
              ) : null}
            </button>
          )
        )}
      </div>
    </div>
  );
}
