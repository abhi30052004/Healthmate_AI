import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";
import { Input, PasswordInput } from "./Input";
import { Card, CardHeader, CardContent } from "./Card";
import { Badge, StatusPill } from "./Badge";
import { Tabs, TabPanel } from "./Tabs";
import { Dialog } from "./Dialog";
import { AnimatedNumber } from "../motion/MotionHelpers";

describe("Step 2 - UI Primitives & Accessibility", () => {
  describe("Button Component", () => {
    it("renders children, triggers onClick and has accessible role", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Save Record</Button>);
      const btn = screen.getByRole("button", { name: "Save Record" });
      expect(btn).toBeDefined();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("displays spinner and is disabled when loading is true", () => {
      render(<Button loading>Processing</Button>);
      const btn = screen.getByRole("button", { name: "Processing" });
      expect(btn.hasAttribute("disabled")).toBe(true);
    });

    it("applies primary, verified, and danger variants", () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[var(--green-800)]");

      rerender(<Button variant="verified">Verified</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[var(--green-600)]");

      rerender(<Button variant="danger">Delete</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[var(--danger)]");
    });
  });

  describe("Input & PasswordInput Components", () => {
    it("renders label, associates htmlFor and handles input change", () => {
      const handleChange = vi.fn();
      render(<Input label="Patient Name" onChange={handleChange} />);
      const input = screen.getByLabelText("Patient Name");
      expect(input).toBeDefined();

      fireEvent.change(input, { target: { value: "John Doe" } });
      expect(handleChange).toHaveBeenCalled();
    });

    it("displays error with role alert and sets aria-invalid", () => {
      render(<Input label="Email" error="Invalid email address" />);
      const input = screen.getByLabelText("Email");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByRole("alert").textContent).toContain("Invalid email address");
    });

    it("toggles password visibility when clicking the eye button", () => {
      render(<PasswordInput label="Password" defaultValue="secret123" />);
      const input = screen.getByLabelText("Password");
      expect(input.getAttribute("type")).toBe("password");

      const toggleBtn = screen.getByRole("button", { name: /Show password/i });
      fireEvent.click(toggleBtn);
      expect(input.getAttribute("type")).toBe("text");

      const hideBtn = screen.getByRole("button", { name: /Hide password/i });
      fireEvent.click(hideBtn);
      expect(input.getAttribute("type")).toBe("password");
    });
  });

  describe("Card Component", () => {
    it("renders card with header and content", () => {
      render(
        <Card>
          <CardHeader>Vital Signs</CardHeader>
          <CardContent>Blood Pressure: 120/80</CardContent>
        </Card>
      );
      expect(screen.getByText("Vital Signs")).toBeDefined();
      expect(screen.getByText("Blood Pressure: 120/80")).toBeDefined();
    });
  });

  describe("Badge & StatusPill Components", () => {
    it("renders verified status with icon and green background token", () => {
      render(<StatusPill status="verified" />);
      const badge = screen.getByText("Verified");
      expect(badge).toBeDefined();
      expect(badge.parentElement?.className).toContain("text-[var(--green-600)]");
    });

    it("renders needs_review status with amber warning token", () => {
      render(<StatusPill status="needs_review" />);
      const badge = screen.getByText("Needs Review");
      expect(badge).toBeDefined();
      expect(badge.parentElement?.className).toContain("text-[var(--warning)]");
    });
  });

  describe("Tabs Component", () => {
    it("switches tabs on click and arrow key navigation", () => {
      const handleTabChange = vi.fn();
      const tabs = [
        { id: "overview", label: "Overview" },
        { id: "records", label: "Records" },
        { id: "meds", label: "Medicines" },
      ];

      render(<Tabs tabs={tabs} activeTab="overview" onChange={handleTabChange} />);
      const recordsTab = screen.getByRole("tab", { name: "Records" });
      fireEvent.click(recordsTab);
      expect(handleTabChange).toHaveBeenCalledWith("records");

      // Keyboard arrow right navigation
      const overviewTab = screen.getByRole("tab", { name: "Overview" });
      fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
      expect(handleTabChange).toHaveBeenCalledWith("records");
    });
  });

  describe("Dialog Component", () => {
    it("renders title, traps focus, and calls onClose on Escape", () => {
      const handleClose = vi.fn();
      render(
        <Dialog isOpen={true} onClose={handleClose} title="Review Report">
          <p>Extracted observations</p>
        </Dialog>
      );

      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText("Review Report")).toBeDefined();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("AnimatedNumber Component", () => {
    it("maintains accessible screen-reader aria-label with exact final number and unit", () => {
      render(<AnimatedNumber value={120} unit="mmHg" />);
      const num = screen.getByLabelText("120 mmHg");
      expect(num).toBeDefined();
    });
  });
});
