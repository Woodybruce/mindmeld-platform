import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "./HomePage";
import { completeTask, fetchEvents, fetchTasks } from "@/lib/household";
import type { HouseholdEvent, HouseholdTask } from "@/lib/household";
import { fetchChannels, fetchLatestButlerMessage } from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";

vi.mock("@/lib/household", () => ({
  fetchEvents: vi.fn(),
  fetchTasks: vi.fn(),
  completeTask: vi.fn(),
}));

vi.mock("@/lib/chat", () => ({
  fetchChannels: vi.fn(),
  fetchLatestButlerMessage: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/hooks/useUnreadMessages", () => ({
  useUnreadMessages: () => 0,
}));

vi.mock("@/components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));

vi.mock("@/components/ButlerInboxCard", () => ({
  default: () => <div data-testid="butler-inbox" />,
}));

const mockedFetchEvents = vi.mocked(fetchEvents);
const mockedFetchTasks = vi.mocked(fetchTasks);
const mockedCompleteTask = vi.mocked(completeTask);
const mockedFetchChannels = vi.mocked(fetchChannels);
const mockedBriefing = vi.mocked(fetchLatestButlerMessage);

const CHANNELS = {
  channels: [{ id: "ch-1", householdId: "hh-1", type: "household" as const, createdAt: "" }],
  members: [
    { id: "m1", householdId: "hh-1", userId: "u1", displayName: "Alex", role: "adult", createdAt: "" },
  ],
};

const makeEvent = (overrides: Partial<HouseholdEvent>): HouseholdEvent => ({
  id: "evt-1",
  householdId: "hh-1",
  title: "Event",
  startsAt: "2026-09-21T09:00:00.000Z",
  endsAt: "2026-09-21T10:00:00.000Z",
  category: "household",
  dependentId: null,
  source: "manual",
  createdAt: "2026-09-20T10:00:00.000Z",
  ...overrides,
});

const makeTask = (overrides: Partial<HouseholdTask>): HouseholdTask => ({
  id: "task-1",
  householdId: "hh-1",
  title: "Task",
  notes: null,
  assigneeUserId: null,
  dependentId: null,
  dueDate: null,
  recurrence: null,
  priority: "medium",
  source: "manual",
  status: "todo",
  createdAt: "2026-09-18T10:00:00.000Z",
  ...overrides,
});

const makeButlerMessage = (body: string): ChatMessage => ({
  id: "msg-1",
  channelId: "ch-1",
  senderUserId: null,
  body,
  replyToId: null,
  messageType: "text",
  imageUrl: null,
  readBy: [],
  createdAt: "2026-09-21T07:00:00.000Z",
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("HomePage (Today dashboard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Monday 21 September 2026, 10:00 local.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));
    mockedFetchChannels.mockResolvedValue(CHANNELS);
    mockedBriefing.mockResolvedValue(null);
    mockedFetchEvents.mockResolvedValue([]);
    mockedFetchTasks.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("greets the user by household display name with today's date", async () => {
    renderPage();
    expect(await screen.findByText("Good morning, Alex")).toBeInTheDocument();
    expect(screen.getByText("Monday 21 September")).toBeInTheDocument();
  });

  it("renders today's events time-ordered with category badges", async () => {
    mockedFetchEvents.mockResolvedValue([
      makeEvent({ id: "e1", title: "School run", category: "school", startsAt: "2026-09-21T08:00:00.000Z" }),
      makeEvent({ id: "e2", title: "Date night", category: "us", startsAt: "2026-09-21T19:00:00.000Z" }),
    ]);

    renderPage();

    expect(await screen.findByText("School run")).toBeInTheDocument();
    expect(screen.getByText("Date night")).toBeInTheDocument();
    expect(screen.getByText("school")).toBeInTheDocument();
    expect(screen.getByText("us")).toBeInTheDocument();
  });

  it("renders overdue and due-today tasks and completes one on tap", async () => {
    mockedFetchTasks.mockResolvedValue([
      makeTask({ id: "t1", title: "Pay trip money", dueDate: "2026-09-19" }),
      makeTask({ id: "t2", title: "Pack PE kit", dueDate: "2026-09-21" }),
      makeTask({ id: "t3", title: "Later thing", dueDate: "2026-09-30" }),
      makeTask({ id: "t4", title: "Already done", dueDate: "2026-09-21", status: "done" }),
    ]);
    mockedCompleteTask.mockResolvedValue(makeTask({ id: "t2", status: "done" }));

    renderPage();

    expect(await screen.findByText("Pay trip money")).toBeInTheDocument();
    expect(screen.getByText(/Overdue · 19 Sep/)).toBeInTheDocument();
    expect(screen.getByText("Pack PE kit")).toBeInTheDocument();
    // Not due today / already done tasks are not shown.
    expect(screen.queryByText("Later thing")).not.toBeInTheDocument();
    expect(screen.queryByText("Already done")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: 'Mark "Pack PE kit" done' }));
    await waitFor(() => expect(mockedCompleteTask).toHaveBeenCalledWith("t2"));
  });

  it("renders the latest butler briefing and links to chat", async () => {
    mockedBriefing.mockResolvedValue(makeButlerMessage("Morning! Football at 4pm, bins out tonight."));

    renderPage();

    const card = await screen.findByText("Morning! Football at 4pm, bins out tonight.");
    expect(card.closest("a")).toHaveAttribute("href", "/chat");
  });

  it("shows warm empty states linking to the butler", async () => {
    renderPage();

    expect(await screen.findByText(/Nothing on today — ask the butler to plan something/)).toBeInTheDocument();
    expect(screen.getByText(/No briefing yet — ask the butler what's on today/)).toBeInTheDocument();
    expect(screen.getByText(/All clear — nothing due today/)).toBeInTheDocument();
  });
});
