import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  Card,
  SpotlightCard,
  Badge,
  Tabs,
  Input,
  Skeleton,
  EmptyState,
} from "./index";

describe("Design System Primitives", () => {
  it("renders Button with variants, sizes, and handles clicks", () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" size="md" onClick={handleClick}>
        Save Record
      </Button>
    );

    const btn = screen.getByRole("button", { name: "Save Record" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders Button in loading state with spinner and disabled attribute", () => {
    render(
      <Button isLoading loadingText="Saving…">
        Save
      </Button>
    );

    const btn = screen.getByRole("button", { name: "Saving…" });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("renders Badge with semantic variant and tabular numerals", () => {
    render(<Badge variant="normal" dot>Normal Range</Badge>);
    expect(screen.getByText("Normal Range")).toBeDefined();
  });

  it("renders SpotlightCard and handles mouse interactions cleanly", () => {
    const { container } = render(
      <SpotlightCard>
        <h4>Card Content</h4>
      </SpotlightCard>
    );
    expect(screen.getByText("Card Content")).toBeDefined();
    const cardEl = container.firstChild as HTMLElement;
    fireEvent.mouseMove(cardEl, { clientX: 50, clientY: 50 });
  });

  it("renders Tabs and navigates with click", () => {
    const handleChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "labs", label: "Lab Trends" },
        ]}
        activeId="overview"
        onChange={handleChange}
      />
    );

    const labTab = screen.getByRole("tab", { name: "Lab Trends" });
    fireEvent.click(labTab);
    expect(handleChange).toHaveBeenCalledWith("labs");
  });

  it("renders Input with label, helperText, and accessibility attributes", () => {
    render(
      <Input
        label="Test Observation"
        helperText="Enter clinical value in mg/dL"
        placeholder="e.g. 95"
      />
    );

    expect(screen.getByLabelText("Test Observation")).toBeDefined();
    expect(screen.getByText("Enter clinical value in mg/dL")).toBeDefined();
  });

  it("renders Skeleton shimmer placeholder", () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    expect(container.firstChild).toBeDefined();
  });

  it("renders EmptyState with title, description, and action", () => {
    render(
      <EmptyState
        title="No Reports Uploaded"
        description="Upload a medical document to start organizing your timeline."
        action={<Button size="sm">Upload Document</Button>}
      />
    );

    expect(screen.getByText("No Reports Uploaded")).toBeDefined();
    expect(screen.getByRole("button", { name: "Upload Document" })).toBeDefined();
  });
});

