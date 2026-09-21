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
  it("renders all 5 tabs with correct labels", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Chat/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Us" })).toBeInTheDocument();
  });

  it("does not render the old Admin tab", () => {
    renderNav();
    expect(screen.queryByRole("button", { name: /^Admin/ })).not.toBeInTheDocument();
  });

  it("navigates to the correct path for each tab", () => {
    renderNav("/us");
    const cases: Array<[RegExp | string, string]> = [
      ["Today", "/"],
      [/^Chat/, "/chat"],
      ["Tasks", "/tasks"],
      ["Diary", "/diary"],
      ["Us", "/us"],
    ];
    for (const [name, path] of cases) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByTestId("location").textContent).toBe(path);
    }
  });

  it("marks the active tab with aria-current", () => {
    renderNav("/diary");
    expect(screen.getByRole("button", { name: "Diary" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("shows the unread count in the Chat tab's accessible name", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Chat, 3 unread" })).toBeInTheDocument();
  });
});
