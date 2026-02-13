import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, Check, Flame } from "lucide-react";
import { checklistQuizzes } from "@/data/checklistQuizData";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

type Answers = Record<string, boolean | number | string>;

const ChecklistQuizPlay = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const quiz = checklistQuizzes.find((q) => q.id === quizId);

  const [gender, setGender] = useState<"women" | "men" | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);

  if (!quiz) {
    navigate("/us");
    return null;
  }

  const filteredSections = quiz.sections.filter(
    (s) => !s.forGender || s.forGender === gender
  );

  const totalSections = filteredSections.length;
  const section = filteredSections[sectionIdx];
  const progress = finished ? 100 : ((sectionIdx) / totalSections) * 100;

  const toggleCheckbox = (id: string) =>
    setAnswers((prev) => ({ ...prev, [id]: !prev[id] }));

  const setRating = (id: string, val: number) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const setChoice = (id: string, val: string) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const handleNext = () => {
    if (sectionIdx + 1 >= totalSections) {
      setFinished(true);
    } else {
      setSectionIdx((p) => p + 1);
    }
  };

  const handleBack = () => {
    if (sectionIdx > 0) setSectionIdx((p) => p - 1);
  };

  // Gender selection screen
  if (quiz.hasGenderPerspective && !gender) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/us")} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-bold text-foreground">{quiz.title}</h1>
          </div>
        </header>
        <div className="px-4 py-12 space-y-6 text-center">
          <span className="text-5xl">{quiz.emoji}</span>
          <h2 className="font-display text-xl font-bold text-foreground">Choose your perspective</h2>
          <p className="text-sm text-muted-foreground">Some questions are tailored to your perspective</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setGender("women")}
              className="rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all"
            >
              👩 Woman
            </button>
            <button
              onClick={() => setGender("men")}
              className="rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all"
            >
              👨 Man
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (finished) {
    const checkedItems = Object.entries(answers).filter(
      ([, v]) => v === true
    ).length;
    const totalCheckboxes = filteredSections.flatMap((s) =>
      s.items.filter((i) => i.type === "checkbox")
    ).length;

    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate("/us")} className="p-1 -ml-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-display text-lg font-bold text-foreground">Your Results</h1>
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
            <div className="mt-4">
              <span className="text-4xl font-bold text-primary">{checkedItems}</span>
              <span className="text-lg text-muted-foreground">/{totalCheckboxes}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">items you want to explore</p>
          </motion.div>

          {/* Summary by section */}
          {filteredSections.map((sec, si) => {
            const sectionChecked = sec.items.filter(
              (i) => i.type === "checkbox" && answers[i.id] === true
            );
            const sectionRatings = sec.items.filter(
              (i) => i.type === "rating" && typeof answers[i.id] === "number"
            );
            const sectionChoices = sec.items.filter(
              (i) => i.type === "choice" && typeof answers[i.id] === "string"
            );

            if (sectionChecked.length === 0 && sectionRatings.length === 0 && sectionChoices.length === 0) return null;

            return (
              <motion.div
                key={sec.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.05 }}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <h3 className="text-sm font-semibold text-foreground mb-2">{sec.title}</h3>
                <div className="space-y-1.5">
                  {sectionRatings.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.text}</span>
                      <span className="font-bold text-primary">{answers[item.id] as number}/10</span>
                    </div>
                  ))}
                  {sectionChoices.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.text}</span>
                      <span className="font-medium text-foreground">{answers[item.id] as string}</span>
                    </div>
                  ))}
                  {sectionChecked.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {sectionChecked.map((item) => (
                        <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          <Flame className="w-3 h-3" /> {item.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <p className="text-xs text-center text-muted-foreground">
            Share this quiz with your partner to compare bucket lists! 🔥
          </p>

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

  // Section-by-section playthrough
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
              Section {sectionIdx + 1} of {totalSections} — {section.title}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={sectionIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{section.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tick everything that interests you or applies
              </p>
            </div>

            <div className="space-y-3">
              {section.items.map((item) => {
                if (item.type === "checkbox") {
                  const checked = !!answers[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleCheckbox(item.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all text-left ${
                        checked
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-card hover:border-border"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-primary text-primary-foreground"
                            : "border-2 border-border"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm text-foreground">{item.text}</span>
                    </button>
                  );
                }

                if (item.type === "rating") {
                  const val = (answers[item.id] as number) ?? 5;
                  return (
                    <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{item.text}</span>
                        <span className="text-lg font-bold text-primary">{val}</span>
                      </div>
                      <Slider
                        value={[val]}
                        onValueChange={([v]) => setRating(item.id, v)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  );
                }

                if (item.type === "choice" && item.choices) {
                  const selected = answers[item.id] as string | undefined;
                  return (
                    <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
                      <span className="text-sm text-foreground">{item.text}</span>
                      <div className="flex gap-2 flex-wrap">
                        {item.choices.map((c) => (
                          <button
                            key={c}
                            onClick={() => setChoice(item.id, c)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              selected === c
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            <div className="flex gap-3">
              {sectionIdx > 0 && (
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
                {sectionIdx + 1 >= totalSections ? "See Results" : "Next Section"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChecklistQuizPlay;
