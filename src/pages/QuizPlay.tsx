import { useState, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Check, Users, ListPlus } from "lucide-react";
import { quizDefinitions, generateActionItems } from "@/data/quizData";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  createQuizSession,
  saveQuizAnswer,
  completeQuizSession,
  getPartnerAnswers,
} from "@/lib/quizService";
import type { PartnerAnswerMap } from "@/lib/quizService";
import { toast } from "@/hooks/use-toast";
import { useSharedLists } from "@/hooks/useSharedLists";
import type { UserList } from "@/components/connect/SharedLists";

const QuizPlay = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { lists: sharedLists, addList, updateList: updateSharedList } = useSharedLists();
  const quiz = quizDefinitions.find((q) => q.id === quizId);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerAnswers, setPartnerAnswers] = useState<PartnerAnswerMap>({});
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!quiz || !user) return;
    // Start session and fetch partner answers
    const init = async () => {
      try {
        const session = await createQuizSession(quiz.id, quiz.questions.length);
        setSessionId(session.id);
        const pa = await getPartnerAnswers(quiz.id, user.id);
        setPartnerAnswers(pa);
      } catch (e) {
        console.error("Failed to init quiz session:", e);
      }
    };
    init();
  }, [quiz, user]);

  if (!quiz) {
    return <Navigate to="/us" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const question = quiz.questions[currentQ];
  const progress = ((currentQ + (finished ? 1 : 0)) / quiz.questions.length) * 100;
  const hasPartner = Object.keys(partnerAnswers).length > 0;

  const handleSelect = (option: string) => setSelected(option);

  const handleNext = async () => {
    if (!selected || !sessionId) return;
    setLoading(true);

    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);

    // Save answer to DB
    try {
      await saveQuizAnswer(sessionId, currentQ, question.question, selected);
    } catch (e) {
      console.error("Failed to save answer:", e);
    }

    setSelected(null);

    if (currentQ + 1 >= quiz.questions.length) {
      // Calculate score against partner
      let matchCount = 0;
      newAnswers.forEach((a, i) => {
        if (partnerAnswers[i] && partnerAnswers[i] === a) matchCount++;
      });
      setScore(matchCount);

      try {
        await completeQuizSession(sessionId, hasPartner ? matchCount : 0);
      } catch (e) {
        console.error("Failed to complete session:", e);
      }
      setFinished(true);
    } else {
      setCurrentQ((prev) => prev + 1);
    }
    setLoading(false);
  };

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

  const createListFromQuiz = async (actionItems: string[]) => {
    const newList: UserList = {
      id: `quiz-${quiz!.id}-${Date.now()}`,
      name: `${quiz!.emoji} ${quiz!.title} Actions`,
      icon: quiz!.emoji,
      createdAt: new Date().toISOString(),
      items: actionItems.map((text, i) => ({ id: `${Date.now()}-${i}`, text, done: false })),
    };
    await addList(newList);
    toast({ title: "Action list created ✓", description: `${actionItems.length} items added to your Lists tab` });
    navigate("/us?tab=lists");
  };

  if (finished) {
    const actionItems = generateActionItems(quiz.id);
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/us")} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-bold text-foreground">Results</h1>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6 pb-24">
          {/* Score card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 text-center ${quiz.gradient} border border-border/30`}
          >
            <span className="text-4xl">{quiz.emoji}</span>
            <h2 className="font-display text-xl font-bold text-foreground mt-3">{quiz.title}</h2>
            {hasPartner ? (
              <>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{score}</span>
                  <span className="text-lg text-muted-foreground">/{quiz.questions.length}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {score >= quiz.questions.length * 0.8 ? "Amazing! You really know each other! 🎉"
                    : score >= quiz.questions.length * 0.5 ? "Pretty good! Keep learning about each other 💛"
                    : "Time to discover more about each other! 🌱"}
                </p>
              </>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <p className="text-sm">Waiting for your partner to take this quiz to compare answers!</p>
              </div>
            )}
          </motion.div>

          {/* Answer insights */}
          <div>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Your Answers</h3>
            <div className="space-y-2">
              {answers.map((answer, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/50 bg-card p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">{quiz.questions[i].question}</p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs rounded-lg bg-secondary px-2.5 py-1.5">
                      You: <span className="font-medium text-foreground">{answer}</span>
                    </span>
                    {hasPartner && partnerAnswers[i] ? (
                      <span className="flex-1 text-xs rounded-lg bg-secondary px-2.5 py-1.5">
                        Partner: <span className="font-medium text-foreground">{partnerAnswers[i]}</span>
                      </span>
                    ) : (
                      <span className="flex-1 text-xs rounded-lg bg-muted px-2.5 py-1.5 text-muted-foreground italic">
                        Partner hasn't answered yet
                      </span>
                    )}
                    {hasPartner && partnerAnswers[i] === answer && (
                      <Check className="w-4 h-4 text-us-sage flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action items */}
          <div>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Suggested Actions</h3>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3"
                >
                  <span className="text-sm mt-0.5">💡</span>
                  <p className="text-sm text-foreground flex-1">{item}</p>
                  <button
                    onClick={() => addToList(item)}
                    className="flex items-center gap-1 text-[13px] text-primary font-medium hover:text-primary/80 transition-colors flex-shrink-0"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> Add
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <button
            onClick={() => createListFromQuiz(actionItems)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ListPlus className="w-4 h-4" /> Create Action List
          </button>

          <button
            onClick={() => navigate("/us")}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            Back to Us
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-sm font-bold text-foreground">{quiz.title}</h1>
            <p className="text-[13px] text-muted-foreground">
              Question {currentQ + 1} of {quiz.questions.length}
            </p>
          </div>
          {hasPartner && (
            <span className="flex items-center gap-1 text-[13px] text-us-sage font-medium">
              <Check className="w-3 h-3" /> Partner answered
            </span>
          )}
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div>
              <span className="text-3xl">{quiz.emoji}</span>
              <h2 className="font-display text-xl font-bold text-foreground mt-3">{question.question}</h2>
            </div>

            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left rounded-xl border p-4 transition-all text-sm font-medium ${
                    selected === option
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-card text-foreground hover:border-border"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={!selected || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Saving…" : currentQ + 1 >= quiz.questions.length ? "See Results" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizPlay;
