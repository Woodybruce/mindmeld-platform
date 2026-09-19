import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TasksPage from "./TasksPage";
import { fetchTasks, createTask, completeTask } from "@/lib/household";
import type { HouseholdTask } from "@/lib/household";

vi.mock("@/lib/household", () => ({
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  completeTask: vi.fn(),
}));

vi.mock("@/hooks/useUnreadMessages", () => ({
  useUnreadMessages: () => 0,
}));

vi.mock("@/components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));

const mockedFetchTasks = vi.mocked(fetchTasks);
const mockedCreateTask = vi.mocked(createTask);
const mockedCompleteTask = vi.mocked(completeTask);

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

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists open and done tasks", async () => {
    mockedFetchTasks.mockResolvedValue([
      makeTask({ id: "1", title: "Buy milk", status: "todo" }),
      makeTask({ id: "2", title: "Book flights", status: "done" }),
    ]);

    renderPage();

    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Book flights")).toBeInTheDocument();
  });

  it("adds a task", async () => {
    mockedFetchTasks.mockResolvedValue([]);
    mockedCreateTask.mockResolvedValue(makeTask({ id: "3", title: "Walk the dog" }));

    renderPage();

    expect(await screen.findByText("No open tasks.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New task title"), {
      target: { value: "Walk the dog" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledWith("Walk the dog"));
  });

  it("completes a task", async () => {
    mockedFetchTasks.mockResolvedValue([makeTask({ id: "1", title: "Buy milk" })]);
    mockedCompleteTask.mockResolvedValue(makeTask({ id: "1", title: "Buy milk", status: "done" }));

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: 'Mark "Buy milk" done' }));

    await waitFor(() => expect(mockedCompleteTask).toHaveBeenCalledWith("1"));
  });
});
