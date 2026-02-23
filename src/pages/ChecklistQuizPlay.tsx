import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, ChevronLeft, Check, Flame, ListPlus } from "lucide-react";
import { checklistQuizzes } from "@/data/checklistQuizData";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useSharedLists } from "@/hooks/useSharedLists";
import type { UserList, ScoreSnapshot } from "@/components/connect/SharedLists";
import { Slider } from "@/components/ui/slider";

/** First N sections are "score" sections (summary/reflection), rest are exploration items */
const SCORE_SECTION_COUNT = 2;

type Answers = Record<string, boolean | number | string>;

const ChecklistQuizPlay = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const isRetest = searchParams.get("retest") === "true";
  const navigate = useNavigate();
  const { lists: sharedLists, addList, updateList: updateSharedList } = useSharedLists();
  const quiz = checklistQuizzes.find((q) => q.id === quizId);

  const [gender, setGender] = useState<"women" | "men" | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);

  // In retest mode, only show score sections
  const retestListId = isRetest ? localStorage.getItem("retestListId") : null;
  const retestMilestone = isRetest ? Number(localStorage.getItem("retestMilestone") || "0") : 0;

  if (!quiz) {
    navigate("/us");
    return null;
  }

  const allFilteredSections = quiz.sections.filter(
    (s) => !s.forGender || s.forGender === gender
  );

  // In retest mode, only show score sections
  const filteredSections = isRetest
    ? allFilteredSections.slice(0, SCORE_SECTION_COUNT)
    : allFilteredSections;

  const scoreSections = allFilteredSections.slice(0, SCORE_SECTION_COUNT);
  const listSections = allFilteredSections.slice(SCORE_SECTION_COUNT);

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
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
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
    // Build score snapshot from first 2 sections
    const scoreAnswers: Record<string, number | string> = {};
    scoreSections.forEach((sec) => {
      sec.items.forEach((item) => {
        if ((item.type === "rating" || item.type === "choice") && answers[item.id] !== undefined) {
          scoreAnswers[item.id] = answers[item.id] as number | string;
        }
      });
    });

    // Exploration items from remaining sections
    const checkedTexts = listSections.flatMap((s) =>
      s.items.filter((i) => i.type === "checkbox" && answers[i.id] === true).map((i) => i.text)
    );

    const totalCheckboxes = listSections.flatMap((s) =>
      s.items.filter((i) => i.type === "checkbox")
    ).length;

    if (isRetest && retestListId) {
      const existingList = sharedLists.find((l) => l.id === retestListId);
      if (existingList && existingList.scoreData) {
        const newSnapshot: ScoreSnapshot = {
          takenAt: new Date().toISOString(),
          answers: scoreAnswers,
          milestone: retestMilestone,
        };
        const updatedSnapshots = [...existingList.scoreData.snapshots, newSnapshot];
        updateSharedList(existingList.id, { scoreData: { ...existingList.scoreData, snapshots: updatedSnapshots } });
        localStorage.removeItem("retestListId");
        localStorage.removeItem("retestMilestone");
        toast({ title: "Score updated ✓", description: `${retestMilestone}% milestone recorded!` });
        navigate("/us?tab=lists");
        return null;
      }
    }

    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
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
              <span className="text-4xl font-bold text-primary">{checkedTexts.length}</span>
              <span className="text-lg text-muted-foreground">/{totalCheckboxes}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">things to explore together</p>
          </motion.div>

          {/* Score summary (first 2 sections) */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">📊 Your Score Snapshot</h3>
            {scoreSections.map((sec) => {
              const sectionRatings = sec.items.filter(
                (i) => i.type === "rating" && typeof answers[i.id] === "number"
              );
              const sectionChoices = sec.items.filter(
                (i) => i.type === "choice" && typeof answers[i.id] === "string"
              );
              const sectionChecked = sec.items.filter(
                (i) => i.type === "checkbox" && answers[i.id] === true
              );
              if (sectionRatings.length === 0 && sectionChoices.length === 0 && sectionChecked.length === 0) return null;
              return (
                <div key={sec.title}>
                  <p className="text-xs font-medium text-foreground mb-1">{sec.title}</p>
                  <div className="space-y-1">
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
                    {sectionChecked.map((item) => (
                      <div key={item.id} className="flex items-center gap-1 text-xs">
                        <Check className="w-3 h-3 text-primary" />
                        <span className="text-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground">This score will be saved with your list. Retest at 25%, 50%, 75% and 100% to track improvement.</p>
          </div>

          {/* Exploration items by section */}
          {listSections.map((sec, si) => {
            const sectionChecked = sec.items.filter(
              (i) => i.type === "checkbox" && answers[i.id] === true
            );
            if (sectionChecked.length === 0) return null;
            return (
              <motion.div
                key={sec.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.05 }}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <h3 className="text-sm font-semibold text-foreground mb-2">{sec.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {sectionChecked.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <Flame className="w-3 h-3" /> {item.text}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}

          <p className="text-xs text-center text-muted-foreground">
            Share this quiz with your partner to compare bucket lists! 🔥
          </p>

          <button
            onClick={async () => {
              if (checkedTexts.length === 0) {
                toast({ title: "No items selected", description: "Tick some items first!" });
                return;
              }
              const initialSnapshot: ScoreSnapshot = {
                takenAt: new Date().toISOString(),
                answers: scoreAnswers,
                milestone: 0,
              };
              const newList: UserList = {
                id: `checklist-${quiz.id}-${Date.now()}`,
                name: `${quiz.emoji} ${quiz.title} List`,
                icon: quiz.emoji,
                createdAt: new Date().toISOString(),
                items: checkedTexts.map((text, i) => ({ id: `${Date.now()}-${i}`, text, done: false })),
                scoreData: {
                  sections: scoreSections.map((s) => ({
                    title: s.title,
                    items: s.items.map((it) => ({ id: it.id, text: it.text, type: it.type, choices: it.choices })),
                  })),
                  snapshots: [initialSnapshot],
                },
              };
              await addList(newList);
              toast({ title: "List created ✓", description: `${checkedTexts.length} items added with score tracking` });
              navigate("/us?tab=lists");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ListPlus className="w-4 h-4" /> Create Exploration List
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

  // Section-by-section playthrough
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
