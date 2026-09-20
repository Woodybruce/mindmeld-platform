import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatPage from "./ChatPage";
import {
  fetchChannels,
  fetchMessages,
  fetchHousehold,
  sendChannelMessage,
  markChannelRead,
  uploadChatImage,
} from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";

vi.mock("@/lib/chat", () => ({
  fetchChannels: vi.fn(),
  fetchMessages: vi.fn(),
  fetchHousehold: vi.fn(),
  sendChannelMessage: vi.fn(),
  markChannelRead: vi.fn(),
  uploadChatImage: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockedChannels = vi.mocked(fetchChannels);
const mockedMessages = vi.mocked(fetchMessages);
const mockedHousehold = vi.mocked(fetchHousehold);
const mockedSend = vi.mocked(sendChannelMessage);
const mockedMarkRead = vi.mocked(markChannelRead);

const CHANNELS = {
  channels: [{ id: "ch-1", householdId: "hh-1", type: "household" as const, createdAt: "2026-09-01T00:00:00.000Z" }],
  members: [
    { id: "m1", householdId: "hh-1", userId: "u1", displayName: "Alex", role: "adult", createdAt: "" },
    { id: "m2", householdId: "hh-1", userId: "u2", displayName: "Sam", role: "adult", createdAt: "" },
  ],
};

let seq = 0;
const makeMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: `msg-${++seq}`,
  channelId: "ch-1",
  senderUserId: "u2",
  body: "hello",
  replyToId: null,
  messageType: "text",
  imageUrl: null,
  readBy: [],
  createdAt: new Date(Date.now() + seq * 60_000).toISOString(),
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seq = 0;
    mockedChannels.mockResolvedValue(CHANNELS);
    mockedHousehold.mockResolvedValue({ id: "hh-1", name: "Bruce", createdAt: "" });
    mockedMarkRead.mockResolvedValue(undefined);
  });

  it("shows the empty state when there are no messages", async () => {
    mockedMessages.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Say hi to the household 👋")).toBeInTheDocument();
    expect(screen.getByText(/Address the butler/)).toBeInTheDocument();
  });

  it("groups consecutive messages and shows the sender name above the first of a run", async () => {
    mockedMessages.mockResolvedValue([
      makeMessage({ body: "Dinner at 7?" }),
      makeMessage({ body: "I can pick up wine" }),
      makeMessage({ senderUserId: "u1", body: "Perfect" }),
    ]);
    renderPage();

    expect(await screen.findByText("Dinner at 7?")).toBeInTheDocument();
    const senderLabels = screen
      .getAllByTestId("sender-name")
      .filter((el) => el.textContent === "Sam");
    expect(senderLabels).toHaveLength(1);

    // Timestamp only on the last of the partner's run.
    const times = screen.getAllByTestId("message-time");
    expect(times).toHaveLength(2);

    // Incoming unread messages get marked read.
    await waitFor(() => expect(mockedMarkRead).toHaveBeenCalledWith("ch-1"));
  });

  it("renders butler messages with the Butler label", async () => {
    mockedMessages.mockResolvedValue([
      makeMessage({ senderUserId: null, body: "Morning! One task today." }),
    ]);
    renderPage();

    expect(await screen.findByText("Morning! One task today.")).toBeInTheDocument();
    const labels = screen.getAllByTestId("sender-name").map((el) => el.textContent);
    expect(labels).toContain("Butler");
  });

  it("ticks go from sent (✓) to read (✓✓) when readBy covers the partner", async () => {
    mockedMessages.mockResolvedValue([
      makeMessage({ senderUserId: "u1", body: "On my way", readBy: [] }),
    ]);
    renderPage();
    expect(await screen.findByLabelText("Sent")).toBeInTheDocument();

    mockedMessages.mockResolvedValue([
      makeMessage({ senderUserId: "u1", body: "On my way", readBy: ["u2"] }),
    ]);
    renderPage();
    expect(await screen.findByLabelText("Read")).toBeInTheDocument();
  });

  it("reply flow sets a quoted preview and sends replyToId", async () => {
    const original = makeMessage({ id: "msg-original", body: "Dinner at 7?" });
    mockedMessages.mockResolvedValue([original]);
    mockedSend.mockResolvedValue(makeMessage({ senderUserId: "u1", body: "Yes!" }));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Reply to message" }));
    expect(screen.getByTestId("reply-preview")).toHaveTextContent("Dinner at 7?");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Yes!" } });
    fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Enter" });

    await waitFor(() =>
      expect(mockedSend).toHaveBeenCalledWith(
        "ch-1",
        expect.objectContaining({ body: "Yes!", replyToId: "msg-original" }),
      ),
    );
  });

  it("appends an optimistic message immediately on send", async () => {
    mockedMessages.mockResolvedValue([]);
    let resolveSend: (m: ChatMessage) => void = () => {};
    mockedSend.mockImplementation(
      () => new Promise<ChatMessage>((resolve) => { resolveSend = resolve; }),
    );
    renderPage();

    expect(await screen.findByText("Say hi to the household 👋")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "hello household" } });
    fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Enter" });

    // Visible before the server responds.
    expect(await screen.findByText("hello household")).toBeInTheDocument();
    expect(screen.queryByText("Say hi to the household 👋")).not.toBeInTheDocument();

    resolveSend(makeMessage({ senderUserId: "u1", body: "hello household", readBy: [] }));
    await waitFor(() => expect(screen.getByText("hello household")).toBeInTheDocument());
  });
});
