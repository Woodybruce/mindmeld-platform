import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  fetchChannels,
  fetchHousehold,
  fetchMessages,
  markChannelRead,
  sendChannelMessage,
  uploadChatImage,
} from "@/lib/chat";
import {
  buildRenderItems,
  isButlerAddressed,
  senderColor,
  type ChatMessage,
  type SendMessageInput,
} from "@/lib/chat-utils";
import MessageBubble, { type QuotedMessage } from "@/components/chat2/MessageBubble";
import DayDivider from "@/components/chat2/DayDivider";
import Composer from "@/components/chat2/Composer";
import TypingDots from "@/components/chat2/TypingDots";

const POLL_MS = 3000;

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [newBelow, setNewBelow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const lastCountRef = useRef(0);
  const markRequestedRef = useRef<Set<string>>(new Set());

  const channelsQuery = useQuery({ queryKey: ["chat", "channels"], queryFn: fetchChannels });
  const householdQuery = useQuery({ queryKey: ["chat", "household"], queryFn: fetchHousehold });

  const channel = channelsQuery.data?.channels.find((c) => c.type === "household") ?? null;
  const members = useMemo(() => channelsQuery.data?.members ?? [], [channelsQuery.data]);
  const channelId = channel?.id;
  const messagesKey = ["chat", "messages", channelId] as const;

  const messagesQuery = useQuery({
    queryKey: messagesKey,
    enabled: !!channelId,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const existing = queryClient.getQueryData<ChatMessage[]>(messagesKey) ?? [];
      // `after` is a strict > with no tie-breaker: step back 1ms so same-tick
      // messages can't be skipped, and dedupe by id when merging the overlap.
      const lastReal = [...existing].reverse().find((m) => !m.id.startsWith("temp-"));
      const after = lastReal
        ? new Date(new Date(lastReal.createdAt).getTime() - 1).toISOString()
        : undefined;
      const batch = await fetchMessages(channelId!, after);
      const byId = new Map(existing.map((m) => [m.id, m] as const));
      for (const m of batch) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) =>
        a.createdAt === b.createdAt ? (a.id < b.id ? -1 : 1) : a.createdAt < b.createdAt ? -1 : 1,
      );
    },
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const msgMap = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const senderName = (m: ChatMessage): string => {
    if (m.senderUserId === null) return "Butler";
    if (m.senderUserId === user?.id) return "You";
    return members.find((mem) => mem.userId === m.senderUserId)?.displayName ?? "Someone";
  };

  const quotedFrom = (m: ChatMessage | null): QuotedMessage | null => {
    if (!m) return null;
    return {
      id: m.id,
      senderName: senderName(m),
      snippet: m.messageType === "image" ? `📷 ${m.body || "Photo"}` : m.body.slice(0, 80),
    };
  };

  // Mark incoming messages read once each, then refresh so ticks update.
  useEffect(() => {
    if (!channelId || !user) return;
    const unread = messages.filter(
      (m) =>
        m.senderUserId !== user.id &&
        !m.id.startsWith("temp-") &&
        !m.readBy.includes(user.id) &&
        !markRequestedRef.current.has(m.id),
    );
    if (unread.length === 0) return;
    for (const m of unread) markRequestedRef.current.add(m.id);
    markChannelRead(channelId)
      .then(() => queryClient.invalidateQueries({ queryKey: messagesKey }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, channelId, user]);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    bottomRef.current?.scrollIntoView?.({ behavior, block: "end" });
  };

  // Auto-scroll only when already near the bottom; otherwise surface the pill.
  useEffect(() => {
    const count = messages.length;
    if (count === 0) return;
    if (lastCountRef.current === 0) {
      scrollToBottom("instant" as ScrollBehavior);
    } else if (count > lastCountRef.current) {
      if (nearBottomRef.current) scrollToBottom("smooth");
      else setNewBelow(true);
    }
    lastCountRef.current = count;
  }, [messages.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    nearBottomRef.current = near;
    if (near) setNewBelow(false);
  };

  const sendMutation = useMutation({
    mutationFn: (input: SendMessageInput) => sendChannelMessage(channelId!, input),
    onMutate: (input) => {
      const temp: ChatMessage = {
        id: `temp-${Date.now()}`,
        channelId: channelId!,
        senderUserId: user!.id,
        body: input.body,
        replyToId: input.replyToId ?? null,
        messageType: input.messageType ?? "text",
        imageUrl: input.imageUrl ?? null,
        readBy: [],
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) => [...old, temp]);
      setReplyingTo(null);
      nearBottomRef.current = true;
      return { tempId: temp.id };
    },
    onSuccess: (created, _input, ctx) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) => [
        ...old.filter((m) => m.id !== ctx.tempId && m.id !== created?.id),
        ...(created ? [created] : []),
      ]);
    },
    onError: (err, _input, ctx) => {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) =>
        old.filter((m) => m.id !== ctx?.tempId),
      );
      toast({ title: "Couldn't send message", description: err.message, variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagesKey }),
  });

  const handleSend = (text: string) => {
    if (!user || !channelId) return;
    sendMutation.mutate({ body: text, senderUserId: user.id, replyToId: replyingTo?.id });
  };

  const handleAttachImage = async (file: File, caption: string) => {
    if (!user || !channelId) return;
    try {
      const imageUrl = await uploadChatImage(user.id, file);
      sendMutation.mutate({
        body: caption || "📷 Photo",
        senderUserId: user.id,
        messageType: "image",
        imageUrl,
        replyToId: replyingTo?.id,
      });
    } catch (err) {
      toast({
        title: "Couldn't upload photo",
        description: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    }
  };

  const scrollToMessage = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  };

  const partnerNames = members
    .filter((m) => m.userId !== user?.id)
    .map((m) => m.displayName)
    .join(", ");
  const subtitle = partnerNames ? `You, ${partnerNames} & Butler` : "You & Butler";

  const lastMessage = messages[messages.length - 1];
  const butlerTyping =
    !!user && !!lastMessage && lastMessage.senderUserId === user.id && isButlerAddressed(lastMessage.body);

  const items = buildRenderItems(messages);

  return (
    <div className="h-[100dvh] max-w-lg mx-auto flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-card border-b border-border safe-area-top z-10">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold text-foreground leading-tight truncate">
              {householdQuery.data?.name ?? "Household"}
            </h1>
            <p className="text-xs text-muted-foreground leading-tight truncate">{subtitle}</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 pb-3 relative">
        {messagesQuery.data === undefined && (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messagesQuery.data !== undefined && messages.length === 0 && (
          <div className="flex items-center justify-center pt-20">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <p className="font-display text-lg font-semibold text-foreground">
                Say hi to the household 👋
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px] mx-auto">
                Address the butler with &lsquo;butler …&rsquo;
              </p>
            </div>
          </div>
        )}

        {items.map((item) =>
          item.kind === "divider" ? (
            <DayDivider key={item.key} label={item.label!} />
          ) : (
            <MessageBubble
              key={item.key}
              message={item.message!}
              isMine={item.message!.senderUserId === user?.id}
              senderName={item.message!.senderUserId === user?.id ? null : senderName(item.message!)}
              senderColorClass={senderColor(item.message!.senderUserId ?? "")}
              isFirstInRun={item.isFirstInRun!}
              isLastInRun={item.isLastInRun!}
              read={item.message!.readBy.some((id) => id !== user?.id)}
              quoted={item.message!.replyToId ? quotedFrom(msgMap.get(item.message!.replyToId) ?? null) : null}
              onReply={setReplyingTo}
              onQuoteTap={scrollToMessage}
            />
          ),
        )}

        {butlerTyping && (
          <div className="flex justify-start mt-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm shrink-0 mr-1.5">
              ✨
            </div>
            <div className="bg-violet-100 dark:bg-violet-900/40 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {newBelow && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom("smooth");
            setNewBelow(false);
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          New messages
        </button>
      )}

      <div className="shrink-0 relative">
        <Composer
          onSend={handleSend}
          onAttachImage={handleAttachImage}
          replyingTo={quotedFrom(replyingTo)}
          onCancelReply={() => setReplyingTo(null)}
          sending={sendMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ChatPage;
