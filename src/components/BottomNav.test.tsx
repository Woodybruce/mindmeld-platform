import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";

vi.mock("@/hooks/useUnreadMessages", () => ({
  useUnreadMessages: () => 3,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderNav = (initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
      <LocationProbe />
    </MemoryRouter>
  );

describe("BottomNav", () => {
  it("renders all 4 tabs with correct labels", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Chat/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Us" })).toBeInTheDocument();
  });

  it("does not render Tasks or Diary tabs (still reachable via /tasks and /diary)", () => {
    renderNav();
    expect(screen.queryByRole("button", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Diary" })).not.toBeInTheDocument();
  });

  it("navigates to the correct path for each tab", () => {
    renderNav("/us");
    const cases: Array<[RegExp | string, string]> = [
      ["Today", "/"],
      [/^Chat/, "/chat"],
      ["Family", "/family"],
      ["Us", "/us"],
    ];
    for (const [name, path] of cases) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByTestId("location").textContent).toBe(path);
    }
  });

  it("marks the active tab with aria-current", () => {
    renderNav("/family");
    expect(screen.getByRole("button", { name: "Family" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("shows the unread count in the Chat tab's accessible name", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Chat, 3 unread" })).toBeInTheDocument();
  });
});
