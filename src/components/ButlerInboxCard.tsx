import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, CalendarDays, Check, Inbox, ListChecks, X } from "lucide-react";
import { acceptProposal, dismissProposal, fetchPendingProposals } from "@/lib/butler";
import type { ButlerAction } from "@/lib/butler";
import { toast } from "@/hooks/use-toast";

const actionIcon = (action: ButlerAction) => {
  switch (action.type) {
    case "create_task":
      return ListChecks;
    case "create_event":
      return CalendarDays;
    case "remember":
      return Brain;
  }
};

const actionLabel = (action: ButlerAction): string => {
  switch (action.type) {
    case "remember":
      return `${action.key}: ${action.value}`;
    default:
      return action.title;
  }
};

const ButlerInboxCard = () => {
  const queryClient = useQueryClient();

  const proposalsQuery = useQuery({
    queryKey: ["butler", "proposals", "pending"],
    queryFn: fetchPendingProposals,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["butler", "proposals"] });

  const acceptMutation = useMutation({
    mutationFn: acceptProposal,
    onSuccess: invalidate,
    onError: (err) => {
      toast({ title: "Couldn't accept proposal", description: err.message, variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissProposal,
    onSuccess: invalidate,
    onError: (err) => {
      toast({ title: "Couldn't dismiss proposal", description: err.message, variant: "destructive" });
    },
  });

  const proposals = proposalsQuery.data ?? [];
  if (proposalsQuery.isLoading || proposalsQuery.isError || proposals.length === 0) return null;

  return (
    <section aria-labelledby="butler-inbox-heading" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
          <Inbox className="w-5 h-5" />
        </div>
        <h3 id="butler-inbox-heading" className="flex-1 font-display text-base font-semibold text-foreground">
          Butler inbox
        </h3>
        <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {proposals.length}
        </span>
      </div>

      <ul className="px-4 pb-4 pt-1 space-y-2">
        {proposals.map((proposal) => (
          <li key={proposal.id} className="bg-secondary/60 rounded-xl px-3 py-2.5 space-y-2">
            <div className="min-w-0">
              {proposal.sender && (
                <p className="text-[11px] text-muted-foreground truncate">{proposal.sender}</p>
              )}
              {proposal.subject && (
                <p className="text-xs font-semibold text-foreground truncate">{proposal.subject}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{proposal.payload.summary}</p>
            </div>

            {proposal.payload.actions.length > 0 && (
              <ul className="space-y-1">
                {proposal.payload.actions.map((action, i) => {
                  const Icon = actionIcon(action);
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{actionLabel(action)}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => acceptMutation.mutate(proposal.id)}
                disabled={acceptMutation.isPending || dismissMutation.isPending}
                aria-label={`Accept proposal "${proposal.subject ?? proposal.payload.summary}"`}
                className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                onClick={() => dismissMutation.mutate(proposal.id)}
                disabled={acceptMutation.isPending || dismissMutation.isPending}
                aria-label={`Dismiss proposal "${proposal.subject ?? proposal.payload.summary}"`}
                className="flex-1 h-8 rounded-lg bg-secondary text-muted-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-secondary/80 disabled:opacity-40 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ButlerInboxCard;
