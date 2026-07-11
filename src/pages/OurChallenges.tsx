import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Check, Shield, Sparkles, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChallengeItem {
  id: string;
  text: string;
}

interface SolutionItem {
  id: string;
  text: string;
  done: boolean;
}

interface SolvedItem {
  id: string;
  text: string;
}

interface ChallengesData {
  challenges: ChallengeItem[];
  solutions: SolutionItem[];
  solved: SolvedItem[];
}

const GAME_TYPE = "our_challenges";

const defaultData: ChallengesData = {
  challenges: [
    { id: "ch1", text: "Historic resentment" },
    { id: "ch2", text: "Poor Communication" },
    { id: "ch3", text: "Prioritising others over" },
  ],
  solutions: [
    { id: "s1", text: "Prioritise our relationship over everything else", done: false },
    { id: "s2", text: "Repair after any conflict with discussion", done: false },
    { id: "s3", text: "Cherish, support and protect each others families", done: false },
    { id: "s4", text: "Manage family workload / tasks so feels equitable for both", done: false },
    { id: "s5", text: "Embrace and kiss everyday you leave or reunite", done: false },
    { id: "s6", text: "Say I love you", done: false },
    { id: "s7", text: "Spend time together doing things we love", done: false },
    { id: "s8", text: "Focus on our physical and sexual connection", done: false },
  ],
  solved: [
    { id: "sv1", text: "Made a One note app to use" },
    { id: "sv2", text: "Gone to Estelle Manor" },
  ],
};

const uid = () => crypto.randomUUID().slice(0, 8);

const OurChallenges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rowId, setRowId] = useState<string | null>(null);
  const [data, setData] = useState<ChallengesData>(defaultData);
  const [newChallenge, setNewChallenge] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newSolved, setNewSolved] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("shared_lists")
      .select("id, score_data")
      .eq("game_type", GAME_TYPE)
      .limit(1)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          setRowId(row.id);
          const sd = row.score_data as any;
          if (sd?.challenges) setData(sd as ChallengesData);
        }
      });
  }, [user]);

  // Track the row id + any in-flight first insert via refs so two rapid saves
  // before the first insert resolves don't create duplicate rows.
  const rowIdRef = useRef<string | null>(null);
  const insertPromiseRef = useRef<Promise<string | null> | null>(null);

  const save = async (next: ChallengesData) => {
    setData(next);
    if (!user) return;

    let id = rowId ?? rowIdRef.current;
    if (!id && insertPromiseRef.current) {
      id = await insertPromiseRef.current;
    }

    if (id) {
      await supabase.from("shared_lists").update({ score_data: next as any }).eq("id", id);
      return;
    }

    insertPromiseRef.current = (async () => {
      const { data: row } = await supabase.from("shared_lists").insert({
        user_id: user.id,
        game_type: GAME_TYPE,
        name: "Our Challenges",
        score_data: next as any,
      } as any).select("id").single();
      if (row) {
        rowIdRef.current = row.id;
        setRowId(row.id);
        return row.id as string;
      }
      return null;
    })();
    await insertPromiseRef.current;
  };

  const addChallenge = () => {
    if (!newChallenge.trim()) return;
    save({ ...data, challenges: [...data.challenges, { id: uid(), text: newChallenge.trim() }] });
    setNewChallenge("");
    setAddingTo(null);
  };

  const addSolution = () => {
    if (!newSolution.trim()) return;
    save({ ...data, solutions: [...data.solutions, { id: uid(), text: newSolution.trim(), done: false }] });
    setNewSolution("");
    setAddingTo(null);
  };

  const addSolved = () => {
    if (!newSolved.trim()) return;
    save({ ...data, solved: [...data.solved, { id: uid(), text: newSolved.trim() }] });
    setNewSolved("");
    setAddingTo(null);
  };

  const toggleSolution = (id: string) => {
    save({
      ...data,
      solutions: data.solutions.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  const removeChallenge = (id: string) => save({ ...data, challenges: data.challenges.filter((c) => c.id !== id) });
  const removeSolution = (id: string) => save({ ...data, solutions: data.solutions.filter((s) => s.id !== id) });
  const removeSolved = (id: string) => save({ ...data, solved: data.solved.filter((s) => s.id !== id) });

  const doneCount = data.solutions.filter((s) => s.done).length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto pb-8">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Our Challenges</h1>
            <p className="text-[13px] text-muted-foreground">Honest growth, together</p>
          </div>
          <Shield className="w-4 h-4 text-muted-foreground" />
        </div>
      </header>

      <div className="px-4 py-5 space-y-6">
        {/* Section 1: Challenges */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">Our challenges in our relationship</h2>
          </div>
          <div className="space-y-2">
            {data.challenges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 group"
              >
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                <p className="text-sm text-foreground flex-1">{c.text}</p>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenActionMenu(openActionMenu === c.id ? null : c.id)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {openActionMenu === c.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => { removeChallenge(c.id); setOpenActionMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {addingTo === "challenges" ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newChallenge}
                  onChange={(e) => setNewChallenge(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChallenge()}
                  placeholder="Add a challenge…"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={addChallenge} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingTo("challenges")} className="flex items-center gap-2 text-xs text-primary font-medium hover:text-primary/80 transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Add challenge
              </button>
            )}
          </div>
        </motion.section>

        {/* Section 2: Solutions */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💪</span>
              <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">What we are doing to solve them</h2>
            </div>
            <span className="text-[13px] text-muted-foreground">{doneCount}/{data.solutions.length}</span>
          </div>
          <div className="space-y-2">
            {data.solutions.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggleSolution(s.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left group"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${s.done ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                  {s.done && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <p className={`text-sm flex-1 transition-colors ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{s.text}</p>
                <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenActionMenu(openActionMenu === s.id ? null : s.id)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {openActionMenu === s.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => { removeSolution(s.id); setOpenActionMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.button>
            ))}
            {addingTo === "solutions" ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSolution()}
                  placeholder="Add a commitment…"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={addSolution} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingTo("solutions")} className="flex items-center gap-2 text-xs text-primary font-medium hover:text-primary/80 transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Add commitment
              </button>
            )}
          </div>
        </motion.section>

        {/* Section 3: Solved */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏆</span>
            <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">What we've solved and how</h2>
          </div>
          <div className="space-y-2">
            {data.solved.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 group"
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground flex-1">{s.text}</p>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenActionMenu(openActionMenu === `solved-${s.id}` ? null : `solved-${s.id}`)}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {openActionMenu === `solved-${s.id}` && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={() => { removeSolved(s.id); setOpenActionMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {addingTo === "solved" ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newSolved}
                  onChange={(e) => setNewSolved(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSolved()}
                  placeholder="What did you solve?"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button onClick={addSolved} className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingTo("solved")} className="flex items-center gap-2 text-xs text-primary font-medium hover:text-primary/80 transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Add win
              </button>
            )}
          </div>
        </motion.section>

        <Sparkles className="w-5 h-5 text-muted-foreground/30 mx-auto" />
      </div>
    </div>
  );
};

export default OurChallenges;
