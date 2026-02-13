import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, MessageCircle, Gamepad2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import QuizCard from "@/components/connect/QuizCard";
import PromptCard from "@/components/connect/PromptCard";
import GameCard from "@/components/connect/GameCard";

const quizzes = [
  {
    title: "How Well Do You Know Me?",
    description: "Answer questions about your partner's preferences, memories, and dreams.",
    emoji: "🧠",
    duration: "5 min",
    questions: 10,
    gradient: "bg-gradient-to-br from-us-blush/40 to-us-cream/60",
  },
  {
    title: "Love Language Check-In",
    description: "Discover how your love languages have evolved over time.",
    emoji: "💕",
    duration: "3 min",
    questions: 8,
    gradient: "bg-gradient-to-br from-us-coral/10 to-us-blush/30",
  },
  {
    title: "Dream Life Alignment",
    description: "Are your future visions in sync? Find out where you align and differ.",
    emoji: "🌙",
    duration: "7 min",
    questions: 12,
    gradient: "bg-gradient-to-br from-us-sage/20 to-us-cream/40",
  },
  {
    title: "Conflict Style Quiz",
    description: "Understand how you each handle disagreements and find better solutions.",
    emoji: "🤝",
    duration: "4 min",
    questions: 8,
    gradient: "bg-gradient-to-br from-us-gold/15 to-us-cream/40",
  },
];

const allPrompts = [
  { category: "Deep", prompt: "What's one thing you've never told me that you wish I knew?", color: "text-us-coral" },
  { category: "Playful", prompt: "If we could teleport anywhere right now, where would you take us?", color: "text-us-gold" },
  { category: "Growth", prompt: "What's one way I've helped you grow as a person?", color: "text-us-sage" },
  { category: "Memory", prompt: "What's your favourite memory of us from the last month?", color: "text-us-terracotta" },
  { category: "Dreams", prompt: "What's something you want us to experience together before the year ends?", color: "text-primary" },
  { category: "Intimacy", prompt: "When do you feel most connected to me?", color: "text-us-coral" },
  { category: "Fun", prompt: "What fictional couple reminds you most of us?", color: "text-us-gold" },
  { category: "Gratitude", prompt: "What's something small I do that means a lot to you?", color: "text-us-sage" },
];

const Connect = () => {
  const navigate = useNavigate();
  const [promptIndex, setPromptIndex] = useState(0);

  const visiblePrompts = [
    allPrompts[promptIndex % allPrompts.length],
    allPrompts[(promptIndex + 1) % allPrompts.length],
    allPrompts[(promptIndex + 2) % allPrompts.length],
  ];

  const shufflePrompts = () => {
    setPromptIndex((prev) => (prev + 3) % allPrompts.length);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Connect
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Strengthen your bond</p>
        </div>
      </header>

      <Tabs defaultValue="quizzes" className="px-4 pt-3 pb-24">
        <TabsList className="w-full bg-us-cream/60 dark:bg-muted">
          <TabsTrigger value="quizzes" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-card">
            <Sparkles className="w-4 h-4" /> Quizzes
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-card">
            <MessageCircle className="w-4 h-4" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="games" className="flex-1 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-card">
            <Gamepad2 className="w-4 h-4" /> Games
          </TabsTrigger>
        </TabsList>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">How well do you really know each other?</p>
          {quizzes.map((quiz, i) => (
            <QuizCard key={quiz.title} {...quiz} delay={i * 0.08} />
          ))}
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Spark a meaningful conversation</p>
            <button
              onClick={shufflePrompts}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Shuffle
            </button>
          </div>
          {visiblePrompts.map((p, i) => (
            <PromptCard
              key={`${promptIndex}-${i}`}
              category={p.category}
              prompt={p.prompt}
              categoryColor={p.color}
              delay={i * 0.08}
            />
          ))}
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Fun activities to play together</p>
          <GameCard
            title="Kiss Chase"
            description="Chase each other in real life using GPS!"
            emoji="💋"
            players="2 players · Outdoors"
            gradient="bg-gradient-to-br from-us-coral/15 to-us-blush/25"
            onClick={() => navigate("/kiss-chase")}
            delay={0}
          />
          <GameCard
            title="Truth or Dare"
            description="Couples edition with spicy and sweet options."
            emoji="🎯"
            players="2 players · Anywhere"
            gradient="bg-gradient-to-br from-us-gold/15 to-us-cream/30"
            delay={0.08}
          />
          <GameCard
            title="Would You Rather"
            description="Impossible choices, hilarious debates."
            emoji="🤔"
            players="2 players · Anywhere"
            gradient="bg-gradient-to-br from-us-sage/15 to-us-cream/30"
            delay={0.16}
          />
          <GameCard
            title="Photo Challenge"
            description="Complete fun photo tasks together as a team."
            emoji="📸"
            players="2 players · Outdoors"
            gradient="bg-gradient-to-br from-us-blush/20 to-us-coral/10"
            delay={0.24}
          />
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Connect;
