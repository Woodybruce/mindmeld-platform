import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUnreadMessages } from "./useUnreadMessages";
import { fetchChannels, fetchMessages } from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";

vi.mock("@/lib/chat", () => ({
  fetchChannels: vi.fn(),
  fetchMessages: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockedFetchChannels = vi.mocked(fetchChannels);
const mockedFetchMessages = vi.mocked(fetchMessages);

const CHANNELS = {
  channels: [
    { id: "dm-1", householdId: "hh-1", type: "dm" as const, createdAt: "" },
    { id: "ch-1", householdId: "hh-1", type: "household" as const, createdAt: "" },
  ],
  members: [],
};

const makeMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: "msg-1",
  channelId: "ch-1",
  senderUserId: "u2",
  body: "hi",
  replyToId: null,
  messageType: "text",
  imageUrl: null,
  readBy: [],
  createdAt: "2026-09-21T08:00:00.000Z",
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useUnreadMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchChannels.mockResolvedValue(CHANNELS);
  });

  it("counts household-channel messages not sent by or read by the user", async () => {
    mockedFetchMessages.mockResolvedValue([
      makeMessage({ id: "1", senderUserId: "u1" }), // own message
      makeMessage({ id: "2", senderUserId: "u2" }), // unread partner message
      makeMessage({ id: "3", senderUserId: null }), // unread butler message
      makeMessage({ id: "4", senderUserId: "u2", readBy: ["u1"] }), // already read
    ]);

    const { result } = renderHook(() => useUnreadMessages(), { wrapper });

    await waitFor(() => expect(result.current).toBe(2));
    expect(mockedFetchMessages).toHaveBeenCalledWith("ch-1");
  });

  it("returns 0 when the household has no channel yet", async () => {
    mockedFetchChannels.mockResolvedValue({ channels: [], members: [] });

    const { result } = renderHook(() => useUnreadMessages(), { wrapper });

    await waitFor(() => expect(mockedFetchChannels).toHaveBeenCalled());
    expect(result.current).toBe(0);
    expect(mockedFetchMessages).not.toHaveBeenCalled();
  });
});
