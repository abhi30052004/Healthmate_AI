import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppointmentsView } from "./AppointmentsView";
import { MonthCalendar } from "../../components/ui/MonthCalendar";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";
import { toDateInput } from "../../lib/dates";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listAppointments: vi.fn(),
    listFollowUps: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    deleteAppointment: vi.fn(),
    createFollowUp: vi.fn(),
    updateFollowUp: vi.fn(),
    deleteFollowUp: vi.fn(),
    createReminder: vi.fn(),
  };
});

const soon = new Date(Date.now() + 3 * 86_400_000);
soon.setHours(11, 30, 0, 0);

const appt = (over: Partial<api.AppointmentRecord> = {}): api.AppointmentRecord => ({
  id: "a1",
  user_id: "u1",
  title: "Diabetes check-up",
  provider_name: "Dr. Mukherjee",
  appointment_type: "Follow-up",
  scheduled_at: soon.toISOString(),
  status: "scheduled",
  follow_up_tasks_count: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});
const task = (over: Partial<api.FollowUpTask> = {}): api.FollowUpTask => ({
  id: "t1",
  user_id: "u1",
  title: "Bring recent lab reports",
  status: "pending",
  priority: "medium",
  appointment_id: "a1",
  is_overdue: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listAppointments).mockResolvedValue([appt()]);
  vi.mocked(api.listFollowUps).mockResolvedValue([task()]);
});

describe("MonthCalendar", () => {
  it("marks days with items and toggles selection", () => {
    const onSelect = vi.fn();
    const day = toDateInput(new Date(2026, 10, 14));
    renderWithProviders(
      <MonthCalendar month={new Date(2026, 10, 1)} onMonthChange={() => {}} markers={{ [day]: 2 }} selected={null} onSelect={onSelect} />
    );
    const btn = screen.getByRole("button", { name: /14 November, 2 items/ });
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(day);
    expect(screen.getByRole("button", { name: /15 November$/ })).toBeDefined();
  });

  it("navigates months", () => {
    const onMonthChange = vi.fn();
    renderWithProviders(<MonthCalendar month={new Date(2026, 10, 1)} onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onMonthChange.mock.calls[0][0].getMonth()).toBe(11);
  });
});

describe("AppointmentsView (real data)", () => {
  it("lists upcoming appointments with their checklist progress", async () => {
    renderWithProviders(<AppointmentsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("Diabetes check-up")).toBeDefined();
    expect(api.listAppointments).toHaveBeenCalledWith("t", { profile_id: "prof-1" });
    expect(screen.getByText("0 of 1 done")).toBeDefined();
    expect(screen.getByRole("button", { name: "Bring recent lab reports", exact: true } as any)).toBeDefined();
  });

  it("ticking a checklist item updates the linked task", async () => {
    vi.mocked(api.updateFollowUp).mockResolvedValue(task({ status: "completed" }));
    renderWithProviders(<AppointmentsView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByText("Bring recent lab reports"));
    await waitFor(() => expect(api.updateFollowUp).toHaveBeenCalledWith("t", "t1", { status: "completed" }));
  });

  it("adds a checklist item linked to the appointment and profile", async () => {
    vi.mocked(api.createFollowUp).mockResolvedValue(task({ id: "t2", title: "Write questions" }));
    renderWithProviders(<AppointmentsView token="t" activeProfile={testProfile} />);
    const input = await screen.findByLabelText("Add checklist item for Diabetes check-up");
    fireEvent.change(input, { target: { value: "Write questions" } });
    fireEvent.click(input.closest("form")!.querySelector("button[type=submit]")!);
    await waitFor(() => expect(api.createFollowUp).toHaveBeenCalled());
    expect(vi.mocked(api.createFollowUp).mock.calls[0][1]).toMatchObject({
      title: "Write questions",
      appointment_id: "a1",
      profile_id: "prof-1",
    });
  });

  it("creating an appointment sends a timezone-aware ISO time and a reminder", async () => {
    vi.mocked(api.listAppointments).mockResolvedValue([]);
    vi.mocked(api.listFollowUps).mockResolvedValue([]);
    vi.mocked(api.createAppointment).mockResolvedValue(appt());
    vi.mocked(api.createReminder).mockResolvedValue({} as any);
    renderWithProviders(<AppointmentsView token="t" activeProfile={testProfile} />);
    fireEvent.click((await screen.findAllByRole("button", { name: /Add appointment/i }))[0]);
    const dlg = await screen.findByRole("dialog");

    fireEvent.click(within(dlg).getByRole("button", { name: /^Add appointment$/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Enter the reason/i);

    fireEvent.change(within(dlg).getByLabelText(/Reason for visit/i), { target: { value: "Check-up" } });
    fireEvent.change(within(dlg).getByLabelText(/^Date/), { target: { value: toDateInput(soon) } });
    fireEvent.change(within(dlg).getByLabelText(/^Time/), { target: { value: "11:30" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /^Add appointment$/i }));

    await waitFor(() => expect(api.createAppointment).toHaveBeenCalled());
    const body = vi.mocked(api.createAppointment).mock.calls[0][1];
    expect(body.profile_id).toBe("prof-1");
    expect(new Date(body.scheduled_at).getHours()).toBe(11);
    expect(new Date(body.scheduled_at).getMinutes()).toBe(30);
    expect(body.timezone).toBeTruthy();
    await waitFor(() => expect(api.createReminder).toHaveBeenCalled());
    expect(vi.mocked(api.createReminder).mock.calls[0][1]).toMatchObject({ category: "appointment", appointment_id: "a1", profile_id: "prof-1" });
  });

  it("shows an empty state when there are no appointments", async () => {
    vi.mocked(api.listAppointments).mockResolvedValue([]);
    renderWithProviders(<AppointmentsView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText("No upcoming appointments")).toBeDefined();
  });
});
