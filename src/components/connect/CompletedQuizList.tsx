import { motion } from "framer-motion";
import { Check, ChevronRight, Trophy, Lightbulb, ListPlus } from "lucide-react";
import type { CompletedQuiz } from "@/data/quizData";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useSharedLists } from "@/hooks/useSharedLists";
import type { UserList } from "@/components/connect/SharedLists";

interface CompletedQuizListProps {
  quizzes: CompletedQuiz[];
}

const CompletedQuizList = ({ quizzes }: CompletedQuizListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { lists: sharedLists, addList, updateList: updateSharedList } = useSharedLists();

  const addToList = async (text: string) => {
    const together = sharedLists.find((l) => l.template === "together-list" || l.name === "Our Together List");
    if (together) {
      const updatedItems = [...together.items, { id: Date.now().toString(), text, done: false }];
      await updateSharedList(together.id, { items: updatedItems });
    } else {
      await addList({ id: `together-${Date.now()}`, name: "Our Together List", icon: "💑", createdAt: new Date().toISOString(), template: "together-list", items: [{ id: Date.now().toString(), text, done: false }] });
    }
    toast({ title: "Added to Together List ✓", description: text });
  };

  if (quizzes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-display text-base font-semibold text-foreground">No quizzes completed yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Complete a quiz above and your results will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quizzes.map((quiz, i) => {
        const isExpanded = expandedId === `${quiz.quizId}-${quiz.completedAt}`;
        const percentage = Math.round((quiz.score / quiz.totalQuestions) * 100);
        const timeAgo = getTimeAgo(quiz.completedAt);

        return (
          <motion.div
            key={`${quiz.quizId}-${quiz.completedAt}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : `${quiz.quizId}-${quiz.completedAt}`)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-2xl">{quiz.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{quiz.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-primary">{quiz.score}/{quiz.totalQuestions} ({percentage}%)</span>
                  <span className="text-[11px] text-muted-foreground">· {timeAgo}</span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="border-t border-border/30"
              >
                {/* Answers */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Answers</p>
                  {quiz.answers.map((a, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      {a.match ? (
                        <Check className="w-3.5 h-3.5 text-us-sage mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-muted-foreground mt-0.5 flex-shrink-0">✗</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate">{a.question}</p>
                        <p className="text-foreground">You: {a.yourAnswer} · Partner: {a.partnerAnswer}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action items */}
                <div className="px-4 py-3 border-t border-border/30 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Suggested Actions
                  </p>
                  {quiz.actionItems.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <p className="text-foreground pl-4 flex-1">• {item}</p>
                      <button
                        onClick={() => addToList(item)}
                        className="flex items-center gap-1 text-[11px] text-primary font-medium hover:text-primary/80 transition-colors flex-shrink-0"
                      >
                        <ListPlus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default CompletedQuizList;
