import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FamilyPage from "./FamilyPage";
import {
  createSchool,
  fetchDependents,
  fetchSchoolEvents,
  fetchSchools,
} from "@/lib/family";
import type { Dependent, School, SchoolEvent } from "@/lib/family";

vi.mock("@/lib/family", () => ({
  fetchDependents: vi.fn(),
  createDependent: vi.fn(),
  updateDependent: vi.fn(),
  deleteDependent: vi.fn(),
  fetchSchools: vi.fn(),
  createSchool: vi.fn(),
  updateSchool: vi.fn(),
  deleteSchool: vi.fn(),
  fetchSchoolEvents: vi.fn(),
  createSchoolEvent: vi.fn(),
}));

vi.mock("@/hooks/useUnreadMessages", () => ({
  useUnreadMessages: () => 0,
}));

vi.mock("@/components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));

const mockedFetchDependents = vi.mocked(fetchDependents);
const mockedFetchSchools = vi.mocked(fetchSchools);
const mockedFetchSchoolEvents = vi.mocked(fetchSchoolEvents);
const mockedCreateSchool = vi.mocked(createSchool);

const makeDependent = (overrides: Partial<Dependent>): Dependent => ({
  id: "dep-1",
  householdId: "hh-1",
  name: "Rufus",
  dateOfBirth: "2018-05-10",
  yearGroup: "Year 2",
  schoolId: null,
  notes: null,
  createdAt: "2026-09-18T10:00:00.000Z",
  ...overrides,
});

const makeSchool = (overrides: Partial<School>): School => ({
  id: "school-1",
  householdId: "hh-1",
  name: "St Mary's",
  address: null,
  website: null,
  status: "researching",
  notes: null,
  createdAt: "2026-09-18T10:00:00.000Z",
  ...overrides,
});

const makeEvent = (overrides: Partial<SchoolEvent>): SchoolEvent => ({
  id: "ev-1",
  schoolId: "school-1",
  dependentId: null,
  title: "Open morning",
  date: "2026-10-14",
  kind: "open_day",
  autoTask: false,
  createdAt: "2026-09-18T10:00:00.000Z",
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FamilyPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("FamilyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDependents.mockResolvedValue([]);
    mockedFetchSchools.mockResolvedValue([]);
    mockedFetchSchoolEvents.mockResolvedValue([]);
  });

  it("renders children with year group and age", async () => {
    mockedFetchDependents.mockResolvedValue([makeDependent({})]);

    renderPage();

    expect(await screen.findByText("Rufus")).toBeInTheDocument();
    expect(screen.getByText(/Age \d+ · Year 2/)).toBeInTheDocument();
  });

  it("renders schools grouped by pipeline status", async () => {
    mockedFetchSchools.mockResolvedValue([
      makeSchool({ id: "s1", name: "St Mary's", status: "shortlisted" }),
      makeSchool({ id: "s2", name: "Brookfield", status: "applied" }),
    ]);

    renderPage();

    expect(await screen.findByText("St Mary's")).toBeInTheDocument();
    expect(screen.getByText("Brookfield")).toBeInTheDocument();
    expect(screen.getByText("Shortlisted · 1")).toBeInTheDocument();
    expect(screen.getByText("Applied · 1")).toBeInTheDocument();
  });

  it("adds a school via the form", async () => {
    mockedCreateSchool.mockResolvedValue(makeSchool({ id: "s3", name: "Hill House" }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Add school/ }));
    fireEvent.change(screen.getByLabelText("School name"), {
      target: { value: "Hill House" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add school" }));

    await waitFor(() =>
      expect(mockedCreateSchool).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Hill House", status: "researching" })
      )
    );
  });

  it("shows a school's events when expanded", async () => {
    mockedFetchSchools.mockResolvedValue([makeSchool({})]);
    mockedFetchSchoolEvents.mockResolvedValue([
      makeEvent({ title: "Open morning", kind: "open_day" }),
      makeEvent({ id: "ev-2", title: "Application deadline", kind: "application_deadline" }),
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Expand St Mary's" }));

    expect(await screen.findByText("Open morning")).toBeInTheDocument();
    expect(screen.getByText("Application deadline")).toBeInTheDocument();
    expect(screen.getByText("Deadline")).toBeInTheDocument();
  });

  it("links to tasks and diary", async () => {
    renderPage();

    expect((await screen.findByRole("link", { name: /Tasks/ })).getAttribute("href")).toBe("/tasks");
    expect(screen.getByRole("link", { name: /Diary/ }).getAttribute("href")).toBe("/diary");
  });
});
