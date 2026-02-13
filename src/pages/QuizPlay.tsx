import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Check } from "lucide-react";
import { quizDefinitions, generateActionItems } from "@/data/quizData";
import type { CompletedQuiz } from "@/data/quizData";
import { Progress } from "@/components/ui/progress";

const QuizPlay = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const quiz = quizDefinitions.find((q) => q.id === quizId);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  if (!quiz) {
    navigate("/us");
    return null;
  }

  const question = quiz.questions[currentQ];
  const progress = ((currentQ + (finished ? 1 : 0)) / quiz.questions.length) * 100;

  const handleSelect = (option: string) => {
    setSelected(option);
  };

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ + 1 >= quiz.questions.length) {
      // Quiz complete — simulate partner answers & save
      const partnerOptions = quiz.questions.map((q) => q.options[Math.floor(Math.random() * q.options.length)]);
      const resultAnswers = quiz.questions.map((q, i) => ({
        question: q.question,
        yourAnswer: newAnswers[i],
        partnerAnswer: partnerOptions[i],
        match: newAnswers[i] === partnerOptions[i],
      }));
      const score = resultAnswers.filter((a) => a.match).length;

      const completed: CompletedQuiz = {
        quizId: quiz.id,
        title: quiz.title,
        emoji: quiz.emoji,
        score,
        totalQuestions: quiz.questions.length,
        completedAt: new Date().toISOString(),
        answers: resultAnswers,
        actionItems: generateActionItems(quiz.id),
      };

      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem("completedQuizzes") || "[]");
      existing.unshift(completed);
      localStorage.setItem("completedQuizzes", JSON.stringify(existing));
      setFinished(true);
    } else {
      setCurrentQ((prev) => prev + 1);
    }
  };

  if (finished) {
    const completed: CompletedQuiz = JSON.parse(localStorage.getItem("completedQuizzes") || "[]")[0];
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
            <div className="mt-4">
              <span className="text-4xl font-bold text-primary">{completed.score}</span>
              <span className="text-lg text-muted-foreground">/{completed.totalQuestions}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {completed.score >= completed.totalQuestions * 0.8
                ? "Amazing! You really know each other! 🎉"
                : completed.score >= completed.totalQuestions * 0.5
                ? "Pretty good! Keep learning about each other 💛"
                : "Time to discover more about each other! 🌱"}
            </p>
          </motion.div>

          {/* Answer insights */}
          <div>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Answer Insights</h3>
            <div className="space-y-2">
              {completed.answers.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/50 bg-card p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">{a.question}</p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs rounded-lg bg-secondary px-2.5 py-1.5">
                      You: <span className="font-medium text-foreground">{a.yourAnswer}</span>
                    </span>
                    <span className="flex-1 text-xs rounded-lg bg-secondary px-2.5 py-1.5">
                      Partner: <span className="font-medium text-foreground">{a.partnerAnswer}</span>
                    </span>
                    {a.match && <Check className="w-4 h-4 text-us-sage flex-shrink-0" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action items */}
          <div>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Suggested Actions</h3>
            <div className="space-y-2">
              {completed.actionItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3"
                >
                  <span className="text-sm mt-0.5">💡</span>
                  <p className="text-sm text-foreground">{item}</p>
                </motion.div>
              ))}
            </div>
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
              disabled={!selected}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {currentQ + 1 >= quiz.questions.length ? "See Results" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizPlay;
