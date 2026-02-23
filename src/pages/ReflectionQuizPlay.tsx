import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, Lock, Eye, EyeOff } from "lucide-react";
import { reflectionQuizzes } from "@/data/reflectionQuizData";
import { Progress } from "@/components/ui/progress";

const ReflectionQuizPlay = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const quiz = reflectionQuizzes.find((q) => q.id === quizId);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  if (!quiz) {
    navigate("/us");
    return null;
  }

  const question = quiz.questions[currentQ];
  const progress = finished ? 100 : (currentQ / quiz.questions.length) * 100;
  const currentAnswer = answers[question.id] || "";
  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;

  const handleNext = () => {
    if (currentQ + 1 >= quiz.questions.length) {
      setFinished(true);
    } else {
      setCurrentQ((p) => p + 1);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ((p) => p - 1);
  };

  const toggleReveal = (idx: number) =>
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));

  if (finished) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/us")} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-bold text-foreground">Your Reflections</h1>
          </div>
        </header>

        <div className="px-4 py-6 space-y-5 pb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 text-center ${quiz.gradient} border border-border/30`}
          >
            <span className="text-4xl">{quiz.emoji}</span>
            <h2 className="font-display text-xl font-bold text-foreground mt-3">{quiz.title}</h2>
            <div className="mt-3">
              <span className="text-3xl font-bold text-primary">{answeredCount}</span>
              <span className="text-lg text-muted-foreground">/{quiz.questions.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">questions reflected on</p>
          </motion.div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              Your answers are private. Sit together with your partner and share them at your own pace.
              Tap the eye icon to reveal each answer when you're ready.
            </p>
          </div>

          <div className="space-y-2.5">
            {quiz.questions.map((q, i) => {
              const answer = answers[q.id]?.trim();
              const revealed = !!revealedAnswers[i];
              if (!answer) return null;

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/50 bg-card p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {revealed ? (
                        <p className="text-sm text-foreground leading-relaxed">{answer}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Answer hidden — tap to reveal</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleReveal(i)}
                      className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors flex-shrink-0"
                    >
                      {revealed ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={() => navigate("/us")}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
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
            <p className="text-[11px] text-muted-foreground">
              Question {currentQ + 1} of {quiz.questions.length}
            </p>
          </div>
          <Lock className="w-4 h-4 text-muted-foreground" />
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
              <p className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wider font-medium">
                Question {currentQ + 1}
              </p>
              <h2 className="font-display text-xl font-bold text-foreground mt-1">
                {question.question}
              </h2>
            </div>

            <textarea
              value={currentAnswer}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
              }
              placeholder="Write your honest answer here…"
              rows={5}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />

            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Your answer stays private until you choose to share
            </p>

            <div className="flex gap-3">
              {currentQ > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {currentQ + 1 >= quiz.questions.length ? "See Reflections" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Skip option */}
            <button
              onClick={handleNext}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip this question
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReflectionQuizPlay;
