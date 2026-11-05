import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DoctorVisitPackCard } from "./DoctorVisitPackCard";

describe("DoctorVisitPackCard Component", () => {
  it("renders doctor name, specialty, and prepared topic counts", () => {
    render(
      <DoctorVisitPackCard
        doctorName="Dr. Gregory House"
        specialty="Diagnostic Medicine"
        reasonForVisit="Unexplained symptoms consultation"
        keyObservationsCount={5}
        questionsCount={4}
        medicationsCount={2}
      />
    );

    expect(screen.getByText("Dr. Gregory House")).toBeDefined();
    expect(screen.getByText("Diagnostic Medicine")).toBeDefined();
    expect(screen.getByText("Unexplained symptoms consultation")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("triggers onOpen when Review & Edit button is clicked", () => {
    const handleOpen = vi.fn();
    render(<DoctorVisitPackCard onOpen={handleOpen} />);

    const openBtn = screen.getByRole("button", { name: /Review & Edit Pack/i });
    fireEvent.click(openBtn);

    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});

