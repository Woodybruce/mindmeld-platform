import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ButlerInboxCard from "./ButlerInboxCard";
import { fetchPendingProposals, acceptProposal, dismissProposal } from "@/lib/butler";
import type { ButlerProposal } from "@/lib/butler";

vi.mock("@/lib/butler", () => ({
  fetchPendingProposals: vi.fn(),
  acceptProposal: vi.fn(),
  dismissProposal: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPendingProposals);
const mockedAccept = vi.mocked(acceptProposal);
const mockedDismiss = vi.mocked(dismissProposal);

const makeProposal = (overrides: Partial<ButlerProposal>): ButlerProposal => ({
  id: "prop-1",
  householdId: "hh-1",
  source: "email",
  sender: "School Office <office@school.example>",
  subject: "Trip consent form",
  receivedAt: "2026-09-20T08:00:00.000Z",
  payload: {
    summary: "Consent form due Friday.",
    actions: [{ type: "create_task", title: "Sign consent form", dueDate: "2026-09-25" }],
  },
  status: "pending",
  ...overrides,
});

const renderCard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ButlerInboxCard />
    </QueryClientProvider>
  );
};

describe("ButlerInboxCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pending proposals with sender, subject, summary and actions", async () => {
    mockedFetch.mockResolvedValue([
      makeProposal({ id: "1", subject: "Trip consent form" }),
      makeProposal({
        id: "2",
        sender: "Amazon <auto@amazon.example>",
        subject: "Delivery update",
        payload: {
          summary: "Parcel arriving Tuesday.",
          actions: [{ type: "create_event", title: "Parcel delivery", startsAt: "2026-09-22T09:00:00.000Z" }],
        },
      }),
    ]);

    renderCard();

    expect(await screen.findByText("Butler inbox")).toBeInTheDocument();
    expect(screen.getByText("Trip consent form")).toBeInTheDocument();
    expect(screen.getByText("Delivery update")).toBeInTheDocument();
    expect(screen.getByText("Consent form due Friday.")).toBeInTheDocument();
    expect(screen.getByText("Parcel arriving Tuesday.")).toBeInTheDocument();
    expect(screen.getByText("Sign consent form")).toBeInTheDocument();
    expect(screen.getByText("Parcel delivery")).toBeInTheDocument();
  });

  it("accepts a proposal and removes it from the list", async () => {
    const proposals = [makeProposal({ id: "1" }), makeProposal({ id: "2", subject: "Second email" })];
    mockedFetch.mockResolvedValue(proposals);
    mockedAccept.mockImplementation(async () => {
      mockedFetch.mockResolvedValue(proposals.filter((p) => p.id !== "1"));
      return makeProposal({ id: "1", status: "accepted" });
    });

    renderCard();

    fireEvent.click(await screen.findByRole("button", { name: 'Accept proposal "Trip consent form"' }));

    await waitFor(() => expect(mockedAccept).toHaveBeenCalledWith("1"));
    await waitFor(() =>
      expect(screen.queryByText("Trip consent form")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Second email")).toBeInTheDocument();
  });

  it("dismisses a proposal", async () => {
    mockedFetch.mockResolvedValue([makeProposal({ id: "1" })]);
    mockedDismiss.mockResolvedValue(makeProposal({ id: "1", status: "dismissed" }));

    renderCard();

    fireEvent.click(await screen.findByRole("button", { name: 'Dismiss proposal "Trip consent form"' }));

    await waitFor(() => expect(mockedDismiss).toHaveBeenCalledWith("1"));
  });

  it("renders nothing when there are no pending proposals", async () => {
    mockedFetch.mockResolvedValue([]);

    const { container } = renderCard();

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
