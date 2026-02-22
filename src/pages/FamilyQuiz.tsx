import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, X, Loader2, Sparkles, Users, ListPlus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiInvoke } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { UserList } from "@/components/connect/SharedLists";

interface FamilyMember {
  id: string;
  name: string;
  age: string;
  role: "child" | "parent";
}

const CATEGORIES = [
  { id: "per-child", label: "Per-child tasks", emoji: "👶", description: "School, clothes, health, activities" },
  { id: "house", label: "House", emoji: "🏠", description: "Home maintenance, décor, improvements" },
  { id: "finances", label: "Finances", emoji: "💰", description: "Banking, investments, bills, planning" },
  { id: "holidays", label: "Holidays", emoji: "✈️", description: "Trips, breaks, half-terms" },
  { id: "special-projects", label: "Special Projects", emoji: "🛠️", description: "Renovations, big purchases, events" },
  { id: "health", label: "Health & Wellbeing", emoji: "❤️", description: "Medical, fitness, self-care" },
];

type Step = "members" | "categories" | "generating" | "results";

const FamilyQuiz = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("members");
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: "p1", name: "", age: "", role: "parent" },
    { id: "p2", name: "", age: "", role: "parent" },
  ]);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<{ category: string; tasks: string[] }[]>([]);

  const parents = members.filter((m) => m.role === "parent");
  const children = members.filter((m) => m.role === "child");

  const updateMember = (id: string, field: "name" | "age", value: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const addChild = () => {
    if (!newChildName.trim()) return;
    setMembers((prev) => [
      ...prev,
      { id: `child-${Date.now()}`, name: newChildName.trim(), age: newChildAge.trim(), role: "child" },
    ]);
    setNewChildName("");
    setNewChildAge("");
  };

  const removeChild = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const canProceedFromMembers = parents.some((p) => p.name.trim()) && children.length > 0;
  const canProceedFromCategories = selectedCategories.length > 0;

  const generateList = async () => {
    setStep("generating");
    try {
      const familyInfo = {
        parents: parents.filter((p) => p.name.trim()).map((p) => ({ name: p.name, age: p.age })),
        children: children.map((c) => ({ name: c.name, age: c.age })),
        categories: selectedCategories.map((id) => CATEGORIES.find((c) => c.id === id)!.label),
      };

      const { data, error } = await apiInvoke("suggest-family-tasks", {
        body: familyInfo,
      });

      if (error) throw error;

      if (data?.categories) {
        setGeneratedTasks(data.categories);
        setStep("results");
      } else {
        throw new Error("Invalid response");
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't generate list", description: "Please try again.", variant: "destructive" });
      setStep("categories");
    }
  };

  const saveAsList = () => {
    const allItems = generatedTasks.flatMap((cat) => [
      { id: `heading-${Date.now()}-${cat.category}`, text: cat.category, done: false, isHeading: true },
      ...cat.tasks.map((text, i) => ({ id: `fam-${Date.now()}-${cat.category}-${i}`, text, done: false })),
    ]);
    const stored = localStorage.getItem("userLists");
    const lists: UserList[] = stored ? JSON.parse(stored) : [];
    const newList: UserList = {
      id: `family-${Date.now()}`,
      name: "Family To-Do List",
      icon: "👨‍👩‍👧‍👦",
      createdAt: new Date().toISOString(),
      items: allItems,
      aiSuggestable: true,
    };
    localStorage.setItem("userLists", JSON.stringify([newList, ...lists]));
    toast({ title: "Family list created ✓", description: `${allItems.length} tasks added` });
    navigate("/us?tab=lists");
  };

  const progress = step === "members" ? 33 : step === "categories" ? 66 : 100;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=quizzes")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Family Quiz</h1>
            <p className="text-[11px] text-muted-foreground">Build your family to-do list with AI</p>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <div className="px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {/* Step 1: Family Members */}
          {step === "members" && (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
                <h2 className="font-display text-xl font-bold text-foreground mt-3">Who's in your family?</h2>
                <p className="text-sm text-muted-foreground mt-1">Add your children so AI can personalise tasks by age</p>
              </div>

              {/* Parents */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parents</p>
                {parents.map((p, i) => (
                  <div key={p.id} className="flex gap-2">
                    <input
                      value={p.name}
                      onChange={(e) => updateMember(p.id, "name", e.target.value)}
                      placeholder={`Parent ${i + 1} name`}
                      className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>

              {/* Children */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Children</p>
                {children.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2.5"
                  >
                    <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{c.name}</span>
                    {c.age && <span className="text-xs text-muted-foreground">Age {c.age}</span>}
                    <button onClick={() => removeChild(c.id)} className="p-1">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </motion.div>
                ))}

                <div className="flex gap-2">
                  <input
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addChild()}
                    placeholder="Child's name"
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    value={newChildAge}
                    onChange={(e) => setNewChildAge(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addChild()}
                    placeholder="Age"
                    className="w-16 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={addChild}
                    disabled={!newChildName.trim()}
                    className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep("categories")}
                disabled={!canProceedFromMembers}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Next — Pick Categories
              </button>
            </motion.div>
          )}

          {/* Step 2: Categories */}
          {step === "categories" && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">What areas need attention?</h2>
                <p className="text-sm text-muted-foreground mt-1">Pick the categories for your family list</p>
              </div>

              <div className="space-y-2">
                {CATEGORIES.map((cat, i) => {
                  const selected = selectedCategories.includes(cat.id);
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        selected ? "border-primary bg-primary/10" : "border-border/50 bg-card hover:border-border"
                      }`}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("members")}
                  className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={generateList}
                  disabled={!canProceedFromCategories}
                  className="flex-[2] rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate Family List
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generating */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center space-y-4"
            >
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <h2 className="font-display text-lg font-bold text-foreground">Building your family list…</h2>
              <p className="text-sm text-muted-foreground">
                Personalising tasks for {children.map((c) => c.name).join(", ")}
              </p>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="text-center">
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
                <h2 className="font-display text-xl font-bold text-foreground mt-3">Your Family List</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {generatedTasks.reduce((acc, c) => acc + c.tasks.length, 0)} tasks across {generatedTasks.length} categories
                </p>
              </div>

              {generatedTasks.map((cat, ci) => (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.06 }}
                  className="rounded-xl border border-border/50 bg-card p-4"
                >
                  <h3 className="text-sm font-semibold text-foreground mb-2">{cat.category}</h3>
                  <div className="space-y-1.5">
                    {cat.tasks.map((task, ti) => (
                      <div key={ti} className="flex items-start gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="text-foreground">{task}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

              <button
                onClick={saveAsList}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ListPlus className="w-4 h-4" /> Save as Family List
              </button>

              <button
                onClick={generateList}
                className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Regenerate
              </button>

              <button
                onClick={() => navigate("/us?tab=quizzes")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Back to Quizzes
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FamilyQuiz;
