import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Swords, RotateCcw, Trophy, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { notifyPartner } from "@/lib/notifyPartner";

type Player = "Player 1" | "Player 2";

const funDares = [
  "Do your best impression of your partner right now",
  "Serenade your partner with any song for 30 seconds",
  "Give your partner a 60-second shoulder massage",
  "Speak in an accent for the next 3 rounds",
  "Do 10 star jumps right now",
  "Feed your partner something with your eyes closed",
  "Recreate your first kiss exactly as it happened",
  "Do your best catwalk across the room",
  "Let your partner draw on your arm with a pen",
  "Tell your partner 5 things you love about them in 30 seconds",
  "Do a 30-second stand-up comedy routine",
  "Give your partner a foot massage for 60 seconds",
  "Act out how you'd propose in the most dramatic way possible",
  "Slow dance with your partner for one full minute — no music",
  "Let your partner style your hair however they want",
  "Do your best robot dance",
  "Write 'I love you' somewhere on your partner's body",
  "Hold eye contact for 60 seconds without laughing",
  "Give your partner three genuine compliments right now",
  "Do an impression of your favourite movie character",
  "Let your partner post anything on your social media",
  "Attempt a handstand for 10 seconds",
  "Describe your partner using only food terms",
  "Do 5 press-ups or let your partner sit on your back while you try",
  "Draw a portrait of your partner in 60 seconds",
  "Whisper the most romantic thing you can think of in your partner's ear",
  "Call someone and sing happy birthday even if it's not their birthday",
  "Do your best impression of a news reporter announcing your relationship",
  "Let your partner tickle you for 15 seconds without reacting",
  "Tell your partner your most embarrassing moment",
];

const spicyDares = [
  "Strip completely naked and let your partner look at you for 60 seconds — no touching allowed",
  "Go down on your partner for exactly 2 minutes — then stop. No matter what.",
  "Let your partner sit on your face for 60 seconds",
  "Give your partner the sloppiest, filthiest kiss you can manage",
  "Get on your knees and beg your partner to tell you what they want done to them",
  "Bend over and let your partner spank you 10 times — they choose how hard",
  "Perform oral on your partner but only use the tip of your tongue",
  "Describe your dirtiest fantasy about your partner — in graphic detail. Leave nothing out.",
  "Let your partner undress you completely and then pose you however they want",
  "Straddle your partner's face and grind slowly for 60 seconds",
  "Lick your partner from their navel all the way down — as slowly as humanly possible",
  "Get naked, lie face down, and let your partner do whatever they want to your body for 3 minutes",
  "Demonstrate your favourite sex position on your partner right now — clothes optional",
  "Give your partner a hand job or finger them for exactly 90 seconds — then stop completely",
  "Whisper the filthiest thing you've ever thought about your partner directly into their ear",
  "Let your partner tie your wrists behind your back — then they decide what happens next",
  "Kiss, lick and bite your way from your partner's inner thigh to where they really want you",
  "Put your partner's fingers in your mouth and show them exactly what your tongue can do",
  "Strip your partner completely naked using only your mouth",
  "Ride your partner (or let them ride you) for 60 seconds — then you MUST stop",
  "Pin your partner down and kiss every inch of their body — save the best bits for last",
  "Let your partner pull your hair while you go down on them",
  "Give your partner a lap dance — fully naked. Make them keep their hands to themselves.",
  "Eat whipped cream, chocolate, or ice off your partner's body — you choose where to put it",
  "Edge your partner — bring them close and then stop. Repeat 3 times.",
  "Tell your partner exactly how you want to be fucked tonight — step by step, in detail",
  "Let your partner choke you lightly while you make out — use a safe word",
  "Get into the 69 position for 2 minutes — loser is whoever stops first",
  "Blindfold your partner, then use your mouth on them — they have to guess where you'll go next",
  "Record a filthy voice note to your partner describing what you're going to do to them after this game",
];

type Mode = "fun" | "spicy" | "mixed";

const DareDuel = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [phase, setPhase] = useState<"setup" | "playing" | "complete">("setup");
  const [mode, setMode] = useState<Mode>("fun");

  const [notified, setNotified] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("Player 1");
  const [scores, setScores] = useState<Record<Player, number>>({ "Player 1": 0, "Player 2": 0 });
  const [currentDare, setCurrentDare] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1);
  const [maxRounds] = useState(10);
  const [duelResult, setDuelResult] = useState<"done" | "duel" | null>(null);

  const opponent: Player = currentPlayer === "Player 1" ? "Player 2" : "Player 1";

  const getDarePool = () => {
    if (mode === "fun") return funDares;
    if (mode === "spicy") return spicyDares;
    return [...funDares, ...spicyDares];
  };

  const drawDare = () => {
    const allDares = getDarePool();
    const pool = allDares.filter((d) => !used.has(d));
    const source = pool.length === 0 ? allDares : pool;
    const pick = source[Math.floor(Math.random() * source.length)];
    setCurrentDare(pick);
    setUsed((prev) => new Set(prev).add(pick));
    setDuelResult(null);
  };

  const startGame = () => {
    drawDare();
    setPhase("playing");
    if (!notified && profile?.partner_id) {
      setNotified(true);
      notifyPartner({ partnerId: profile.partner_id, title: "⚔️ Dare Duel!", body: `${profile.username || "Your partner"} started a Dare Duel`, route: "/dare-duel" });
    }
  };

  const handleDone = () => {
    setScores((prev) => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 2 }));
    setDuelResult("done");
  };

  const handleDuel = () => {
    // Counter-dare: opponent can win 3 points instead if they do the dare too
    setDuelResult("duel");
  };

  const handleDuelResult = (opponentDid: boolean) => {
    if (opponentDid) {
      setScores((prev) => ({ ...prev, [opponent]: prev[opponent] + 3 }));
    } else {
      setScores((prev) => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 3 }));
    }
    nextRound();
  };

  const nextRound = () => {
    if (round >= maxRounds) {
      setPhase("complete");
      return;
    }
    setRound((r) => r + 1);
    setCurrentPlayer(opponent);
    setDuelResult(null);
    drawDare();
  };

  const skipNextRound = () => {
    nextRound();
  };

  const reset = () => {
    setPhase("setup");
    setMode("fun");
    setCurrentPlayer("Player 1");
    setScores({ "Player 1": 0, "Player 2": 0 });
    setCurrentDare(null);
    setUsed(new Set());
    setRound(1);
    setDuelResult(null);
    setNotified(false);
  };

  const winner = scores["Player 1"] > scores["Player 2"] ? "Player 1" : scores["Player 2"] > scores["Player 1"] ? "Player 2" : null;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Swords className="w-5 h-5 text-us-coral" /> Dare Duel
          </h1>
          {phase === "playing" && (
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                mode === "spicy" ? "bg-rose-500/15 text-rose-500" : mode === "mixed" ? "bg-purple-500/15 text-purple-500" : "bg-us-coral/10 text-us-coral"
              }`}>
                {mode === "spicy" ? "🔥 Spicy" : mode === "mixed" ? "🎲 Mixed" : "😄 Fun"}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Round {round}/{maxRounds}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-6 space-y-5">

        {/* Setup screen */}
        {phase === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-5xl block">⚔️</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Dare Duel</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Take turns drawing dares. Complete them to score 2 points — or call a <strong>Duel</strong> to make your partner do it for 3!
              </p>
            </div>

            <div className="rounded-2xl bg-secondary/60 border border-border/30 p-4 space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Choose your mode</p>
              <div className="flex gap-2">
                {([
                  { key: "fun" as Mode, label: "Fun", icon: "😄", desc: "Playful & silly" },
                  { key: "spicy" as Mode, label: "Spicy", icon: "🔥", desc: "Filthy & explicit" },
                  { key: "mixed" as Mode, label: "Mixed", icon: "🎲", desc: "Best of both" },
                ]).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`flex-1 rounded-xl p-3 text-center border transition-all ${
                      mode === m.key
                        ? m.key === "spicy"
                          ? "bg-gradient-to-br from-rose-500/15 to-pink-500/20 border-rose-400/40"
                          : m.key === "mixed"
                          ? "bg-gradient-to-br from-purple-500/15 to-pink-500/20 border-purple-400/40"
                          : "bg-gradient-to-br from-us-coral/15 to-us-blush/20 border-us-coral/40"
                        : "bg-secondary/30 border-border/30 opacity-60"
                    }`}
                    data-testid={`button-mode-${m.key}`}
                  >
                    <span className="text-lg block">{m.icon}</span>
                    <p className="text-xs font-bold text-foreground mt-1">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/60 border border-border/30 p-4 space-y-2">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">How to play</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>✅ <strong>Done</strong> — you complete the dare, earn <strong>2 pts</strong></li>
                <li>⚔️ <strong>Duel</strong> — challenge your partner to do it instead. If they do: they earn <strong>3 pts</strong>. If they refuse: you earn <strong>3 pts</strong></li>
                <li>🏆 Most points after {maxRounds} rounds wins!</li>
              </ul>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              className="w-full rounded-2xl bg-gradient-to-br from-us-coral to-us-blush py-4 text-white font-display text-lg font-bold shadow-lg"
            >
              Start Duel ⚔️
            </motion.button>
          </motion.div>
        )}

        {/* Playing screen */}
        {phase === "playing" && (
          <div className="space-y-4">
            {/* Scoreboard */}
            <div className="flex gap-3">
              {(["Player 1", "Player 2"] as Player[]).map((p) => (
                <div
                  key={p}
                  className={`flex-1 rounded-xl p-3 text-center border transition-all ${
                    currentPlayer === p
                      ? "bg-gradient-to-br from-us-coral/20 to-us-blush/30 border-us-coral/40"
                      : "bg-secondary/50 border-border/30"
                  }`}
                >
                  <p className="text-xs text-muted-foreground font-medium">{p}</p>
                  <p className="font-display text-2xl font-bold text-foreground">{scores[p]}</p>
                  <p className="text-[14px] text-muted-foreground">pts</p>
                </div>
              ))}
            </div>

            {/* Current player badge */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-us-coral/10 border border-us-coral/30 px-3 py-1 text-xs font-semibold text-us-coral">
                <Flame className="w-3 h-3" /> {currentPlayer}'s dare
              </span>
            </div>

            {/* Dare card */}
            <AnimatePresence mode="wait">
              {currentDare && (
                <motion.div
                  key={currentDare}
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -16 }}
                  className="rounded-2xl bg-gradient-to-br from-us-coral/10 to-us-blush/20 border border-us-coral/20 p-6"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-us-coral mb-3">
                    {mode === "spicy" ? "🔥 Spicy Dare" : mode === "mixed" && spicyDares.includes(currentDare || "") ? "🔥 Spicy Dare" : "⚡ Dare"}
                  </p>
                  <p className="font-display text-xl font-bold text-foreground leading-snug">{currentDare}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            {duelResult === null && (
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDone}
                  className="flex-1 rounded-2xl bg-gradient-to-br from-us-sage/20 to-us-cream/40 border border-us-sage/30 py-4 text-center"
                >
                  <span className="text-xl block mb-1">✅</span>
                  <p className="text-sm font-bold text-foreground">Done!</p>
                  <p className="text-xs text-muted-foreground">+2 pts</p>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDuel}
                  className="flex-1 rounded-2xl bg-gradient-to-br from-us-coral/20 to-us-blush/30 border border-us-coral/30 py-4 text-center"
                >
                  <span className="text-xl block mb-1">⚔️</span>
                  <p className="text-sm font-bold text-foreground">Duel!</p>
                  <p className="text-xs text-muted-foreground">Winner +3 pts</p>
                </motion.button>
              </div>
            )}

            {/* Done result */}
            {duelResult === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="rounded-xl bg-us-sage/10 border border-us-sage/30 p-4 text-center">
                  <p className="text-sm font-bold text-foreground">✅ {currentPlayer} completed the dare! +2 pts</p>
                </div>
                <button
                  onClick={skipNextRound}
                  className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-foreground"
                >
                  Next round →
                </button>
              </motion.div>
            )}

            {/* Duel phase */}
            {duelResult === "duel" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="rounded-xl bg-us-coral/10 border border-us-coral/30 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-us-coral mb-1">⚔️ Duel issued!</p>
                  <p className="text-sm font-semibold text-foreground">{opponent} — can you do this dare?</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDuelResult(true)}
                    className="flex-1 rounded-xl bg-gradient-to-br from-us-sage/20 to-us-cream/30 border border-border/30 py-3 text-sm font-bold text-foreground"
                  >
                    ✅ I did it! (+3)
                  </button>
                  <button
                    onClick={() => handleDuelResult(false)}
                    className="flex-1 rounded-xl bg-gradient-to-br from-us-coral/10 to-us-blush/20 border border-border/30 py-3 text-sm font-bold text-foreground"
                  >
                    ❌ Nope (+3 to {currentPlayer})
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Complete screen */}
        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div>
              <Trophy className="w-12 h-12 mx-auto text-us-gold mb-3" />
              <h2 className="font-display text-2xl font-bold text-foreground">
                {winner ? `${winner} Wins! 🏆` : "It's a Draw! 🤝"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {winner ? `What a duel!` : `Perfectly matched — what a game!`}
              </p>
            </div>

            <div className="flex gap-3">
              {(["Player 1", "Player 2"] as Player[]).map((p) => (
                <div
                  key={p}
                  className={`flex-1 rounded-2xl p-4 border ${
                    winner === p
                      ? "bg-gradient-to-br from-us-gold/20 to-us-cream/40 border-us-gold/40"
                      : "bg-secondary/50 border-border/30"
                  }`}
                >
                  {winner === p && <Trophy className="w-5 h-5 mx-auto text-us-gold mb-1" />}
                  <p className="text-xs text-muted-foreground font-medium">{p}</p>
                  <p className="font-display text-3xl font-bold text-foreground">{scores[p]}</p>
                  <p className="text-[14px] text-muted-foreground">points</p>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-us-coral to-us-blush py-3 text-white font-semibold"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DareDuel;
