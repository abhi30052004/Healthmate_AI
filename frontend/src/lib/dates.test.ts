import { describe, it, expect } from "vitest";
import { toDateInput, toTimeInput, localDateTimeToIso, parseDateOnly, formatDate, daysFromToday, nextSlot } from "./dates";

describe("date helpers (local timezone, never UTC-shifted)", () => {
  it("toDateInput/toTimeInput use local components and zero-pad", () => {
    const d = new Date(2026, 0, 5, 7, 3);
    expect(toDateInput(d)).toBe("2026-01-05");
    expect(toTimeInput(d)).toBe("07:03");
  });

  it("a late-evening local time stays on the same calendar date", () => {
    expect(toDateInput(new Date(2026, 5, 30, 23, 59))).toBe("2026-06-30");
  });

  it("parseDateOnly avoids the UTC off-by-one", () => {
    const d = parseDateOnly("2026-03-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 1]);
  });

  it("localDateTimeToIso round-trips to the same local wall-clock time", () => {
    const iso = localDateTimeToIso("2026-11-14", "11:30");
    const back = new Date(iso);
    expect([back.getFullYear(), back.getMonth() + 1, back.getDate(), back.getHours(), back.getMinutes()]).toEqual([2026, 11, 14, 11, 30]);
    expect(iso.endsWith("Z")).toBe(true);
  });

  it("formatDate handles date-only strings, ISO strings and empties", () => {
    expect(formatDate("2026-10-14")).toMatch(/14/);
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("not a date");
  });

  it("daysFromToday counts whole calendar days", () => {
    expect(daysFromToday(toDateInput(new Date()))).toBe(0);
    expect(daysFromToday(toDateInput(new Date(Date.now() + 2 * 86_400_000)))).toBe(2);
    expect(daysFromToday(toDateInput(new Date(Date.now() - 86_400_000)))).toBe(-1);
  });

  it("nextSlot is in the future and on a 5-minute boundary", () => {
    const { date, time } = nextSlot(60);
    expect(new Date(localDateTimeToIso(date, time)).getTime()).toBeGreaterThan(Date.now());
    expect(Number(time.split(":")[1]) % 5).toBe(0);
  });
});
