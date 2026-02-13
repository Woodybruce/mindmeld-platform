import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ListChecks, FolderOpen, ExternalLink,
  FileText, Image, File, Upload, Sparkles, MessageCircle,
  Gamepad2, RefreshCw, Trophy, Camera, Calendar, Heart,
  Link2, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import QuizCard from "@/components/connect/QuizCard";
import PromptCard from "@/components/connect/PromptCard";
import GameCard from "@/components/connect/GameCard";
import CompletedQuizList from "@/components/connect/CompletedQuizList";
import SharedLists from "@/components/connect/SharedLists";
import type { UserList } from "@/components/connect/SharedLists";
import OurPhotos from "@/components/connect/OurPhotos";
import OurEvents from "@/components/connect/OurEvents";
import GratitudeJournal from "@/components/connect/GratitudeJournal";
import LinksAndMedia from "@/components/connect/LinksAndMedia";
import SharedFolderEmbed from "@/components/connect/SharedFolderEmbed";
import { quizDefinitions, generateActionItems } from "@/data/quizData";
import { checklistQuizzes } from "@/data/checklistQuizData";
import { reflectionQuizzes } from "@/data/reflectionQuizData";
import type { CompletedQuiz } from "@/data/quizData";
import { usePartnerQuizActivity } from "@/hooks/usePartnerQuizActivity";
import PartnerQuizBanner from "@/components/connect/PartnerQuizBanner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const quizCards = quizDefinitions.map((q) => ({
  id: q.id,
  title: q.title,
  description: q.description,
  emoji: q.emoji,
  duration: q.duration,
  questions: q.questions.length,
  gradient: q.gradient,
}));

const allPrompts = [
  // Original prompts
  { category: "Deep", prompt: "What's one thing you've never told me that you wish I knew?", color: "text-us-coral" },
  { category: "Playful", prompt: "If we could teleport anywhere right now, where would you take us?", color: "text-us-gold" },
  { category: "Growth", prompt: "What's one way I've helped you grow as a person?", color: "text-us-sage" },
  { category: "Memory", prompt: "What's your favourite memory of us from the last month?", color: "text-us-terracotta" },
  { category: "Dreams", prompt: "What's something you want us to experience together before the year ends?", color: "text-primary" },
  { category: "Intimacy", prompt: "When do you feel most connected to me?", color: "text-us-coral" },
  { category: "Fun", prompt: "What fictional couple reminds you most of us?", color: "text-us-gold" },
  { category: "Gratitude", prompt: "What's something small I do that means a lot to you?", color: "text-us-sage" },
  // Love Language prompts — everyday ideas to try together
  { category: "💬 Words", prompt: "Leave a sticky note with a sweet message somewhere they'll find it today", color: "text-us-coral" },
  { category: "💬 Words", prompt: "Send a midday 'thinking of you' text — be specific about what you appreciate", color: "text-us-coral" },
  { category: "💬 Words", prompt: "Praise your partner in front of someone else today", color: "text-us-coral" },
  { category: "⏰ Time", prompt: "Take a tech-free walk together — no phones, just conversation", color: "text-us-sage" },
  { category: "⏰ Time", prompt: "Cook a new recipe together tonight", color: "text-us-sage" },
  { category: "⏰ Time", prompt: "Have a 15-minute nightly check-in: how was your day, really?", color: "text-us-sage" },
  { category: "🎁 Gifts", prompt: "Bring home their favourite snack as a surprise today", color: "text-us-gold" },
  { category: "🎁 Gifts", prompt: "Gift something tied to an inside joke between you two", color: "text-us-gold" },
  { category: "🤲 Service", prompt: "Handle their least favourite chore without being asked", color: "text-us-terracotta" },
  { category: "🤲 Service", prompt: "Make them coffee or tea exactly how they like it", color: "text-us-terracotta" },
  { category: "🤲 Service", prompt: "Finish a task they've been putting off", color: "text-us-terracotta" },
  { category: "🫂 Touch", prompt: "Slow dance together at home — no music required", color: "text-primary" },
  { category: "🫂 Touch", prompt: "Give a 20-second hug. Count it out. Feel the difference", color: "text-primary" },
  { category: "🫂 Touch", prompt: "Run your fingers through their hair while watching TV tonight", color: "text-primary" },
];

const mockFiles = [
  { name: "Holiday Itinerary.pdf", type: "pdf", updated: "2 days ago" },
  { name: "Wedding Mood Board", type: "folder", updated: "5 days ago" },
  { name: "Apartment Shortlist.docx", type: "doc", updated: "1 week ago" },
  { name: "Us — Summer 2025", type: "image", updated: "2 weeks ago" },
  { name: "Budget Tracker.xlsx", type: "doc", updated: "3 weeks ago" },
];

const fileIcon = (type: string) => {
  switch (type) {
    case "pdf": return <FileText className="w-5 h-5 text-destructive" />;
    case "image": return <Image className="w-5 h-5 text-us-gold" />;
    case "folder": return <FolderOpen className="w-5 h-5 text-us-sage" />;
    default: return <File className="w-5 h-5 text-primary" />;
  }
};

// Pre-populated lists from OneNote wireframe
const defaultLists: UserList[] = [
  {
    id: "onenote-daily-bruce",
    name: "Bruce Daily Plan",
    icon: "☀️",
    template: "daily",
    createdAt: "2026-01-04T17:45:00.000Z",
    items: [
      { id: "d1", text: "Get under layers", done: true },
      { id: "d2", text: "Size small grey or black get 2 roll necks and 4 others", done: true },
      { id: "d3", text: "Get shampoo", done: true },
      { id: "d4", text: "Coco sparks", done: false },
    ],
  },
  {
    id: "onenote-family-todo",
    name: "Bruce Family To Do List",
    icon: "👨‍👩‍👧",
    template: "actions",
    createdAt: "2026-01-04T17:45:00.000Z",
    items: [
      { id: "f1", text: "🧒 Coco — New school registration", done: false },
      { id: "f2", text: "🧒 Coco — New ski boots", done: false },
      { id: "f3", text: "👧 Freya — New school", done: false },
      { id: "f4", text: "👧 Freya — Remove her teeth", done: false },
      { id: "f5", text: "👩 Helen — test", done: false },
      { id: "f6", text: "🐕 Woody — Sort Neck", done: false },
      { id: "f7", text: "🏠 House — Boiler", done: false },
      { id: "f8", text: "💰 Finances — Mortgage application", done: false },
      { id: "f9", text: "💰 Finances — Tax planning process", done: false },
      { id: "f10", text: "📋 Special projects — Planning for flat", done: false },
      { id: "f11", text: "✈️ Holidays — August holiday", done: false },
    ],
  },
  {
    id: "onenote-together",
    name: "Our Together List",
    icon: "💑",
    template: "long-term",
    createdAt: "2026-01-04T15:30:00.000Z",
    items: [
      { id: "t1", text: "⭐ Go shopping and drink together", done: false },
      { id: "t2", text: "⭐ More fun stuff together", done: false },
      { id: "t3", text: "⭐ Planned events over the year", done: false },
      { id: "t4", text: "Dancing", done: false },
      { id: "t5", text: "Go see an act", done: false },
      { id: "t6", text: "Paint / draw each other", done: false },
      { id: "t7", text: "Go to art Gallery", done: false },
      { id: "t8", text: "🗺️ Scottish Lakes trip", done: false },
    ],
  },
  {
    id: "onenote-dream",
    name: "Our 1 Long Term Dream",
    icon: "🌊",
    template: "long-term",
    createdAt: "2026-01-04T17:45:00.000Z",
    items: [
      { id: "dr1", text: "Spend more time somewhere warm by the sea", done: false },
    ],
  },
];

const seedCompletedQuizzes = (): CompletedQuiz[] => {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  return quizDefinitions.map((quiz) => {
    const yourAnswers = quiz.questions.map((q) => pick(q.options));
    const partnerAnswers = quiz.questions.map((q) => pick(q.options));
    const answers = quiz.questions.map((q, i) => ({
      question: q.question,
      yourAnswer: yourAnswers[i],
      partnerAnswer: partnerAnswers[i],
      match: yourAnswers[i] === partnerAnswers[i],
    }));
    const score = answers.filter((a) => a.match).length;
    return {
      quizId: quiz.id,
      title: quiz.title,
      emoji: quiz.emoji,
      score,
      totalQuestions: quiz.questions.length,
      completedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      answers,
      actionItems: generateActionItems(quiz.id),
    };
  });
};

const Us = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "lists";
  const [promptIndex, setPromptIndex] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>([]);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const { partnerActivity, dismiss: dismissActivity } = usePartnerQuizActivity();

  useEffect(() => {
    const storedQuizzes = localStorage.getItem("completedQuizzes");
    if (storedQuizzes && JSON.parse(storedQuizzes).length > 0) {
      setCompletedQuizzes(JSON.parse(storedQuizzes));
    } else {
      // Seed with simulated quiz completions
      const seeded = seedCompletedQuizzes();
      setCompletedQuizzes(seeded);
      localStorage.setItem("completedQuizzes", JSON.stringify(seeded));
    }
    const stored = localStorage.getItem("userLists");
    if (stored) {
      setUserLists(JSON.parse(stored));
    } else {
      setUserLists(defaultLists);
      localStorage.setItem("userLists", JSON.stringify(defaultLists));
    }
  }, []);

  const handleListsUpdate = (updated: UserList[]) => {
    setUserLists(updated);
    localStorage.setItem("userLists", JSON.stringify(updated));
  };

  const visiblePrompts = [
    allPrompts[promptIndex % allPrompts.length],
    allPrompts[(promptIndex + 1) % allPrompts.length],
    allPrompts[(promptIndex + 2) % allPrompts.length],
  ];

  const shufflePrompts = () => setPromptIndex((prev) => (prev + 3) % allPrompts.length);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <AppHeader subtitle="Your shared world" />

      {partnerActivity && (
        <PartnerQuizBanner
          quizTitle={partnerActivity.quizTitle}
          quizEmoji={partnerActivity.quizEmoji}
          onDismiss={dismissActivity}
        />
      )}

      <Tabs defaultValue={defaultTab} className="px-4 pt-3 pb-24">
        <TabsList className="flex flex-wrap h-auto bg-secondary gap-1 p-1">
            <TabsTrigger value="lists" className="gap-1 text-xs data-[state=active]:bg-card">
              <ListChecks className="w-3.5 h-3.5" /> Lists
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1 text-xs data-[state=active]:bg-card">
              <Sparkles className="w-3.5 h-3.5" /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-1 text-xs data-[state=active]:bg-card">
              <MessageCircle className="w-3.5 h-3.5" /> Prompts
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-1 text-xs data-[state=active]:bg-card">
              <Gamepad2 className="w-3.5 h-3.5" /> Games
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1 text-xs data-[state=active]:bg-card">
              <Camera className="w-3.5 h-3.5" /> Photos
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1 text-xs data-[state=active]:bg-card">
              <Calendar className="w-3.5 h-3.5" /> Events
            </TabsTrigger>
            <TabsTrigger value="gratitude" className="gap-1 text-xs data-[state=active]:bg-card">
              <Heart className="w-3.5 h-3.5" /> Gratitude
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1 text-xs data-[state=active]:bg-card">
              <Link2 className="w-3.5 h-3.5" /> Links
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1 text-xs data-[state=active]:bg-card">
              <FolderOpen className="w-3.5 h-3.5" /> Files
            </TabsTrigger>
          </TabsList>

        {/* Lists — default tab, imported from OneNote */}
        <TabsContent value="lists" className="mt-4 space-y-5">
          <SharedLists lists={userLists} onUpdate={handleListsUpdate} />

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/our-sex-list")}
            className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-xl">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Our Sex List</p>
              <p className="text-xs text-muted-foreground">Values, motivations, preferences & things to explore</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate("/our-challenges")}
            className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-xl">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Our Challenges</p>
              <p className="text-xs text-muted-foreground">Challenges, commitments & wins together</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>

          {completedQuizzes.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quiz Results</p>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Trophy className="w-3.5 h-3.5" /> {completedQuizzes.length} done
                </span>
              </div>
              <CompletedQuizList quizzes={completedQuizzes} />
            </>
          )}
        </TabsContent>

        {/* Quizzes */}
        <TabsContent value="quizzes" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">How well do you really know each other?</p>
          {checklistQuizzes.map((cq, i) => (
            <QuizCard
              key={cq.id}
              title={cq.title}
              description={cq.description}
              emoji={cq.emoji}
              duration={cq.duration}
              questions={cq.sections.flatMap((s) => s.items).length}
              gradient={cq.gradient}
              onClick={() => navigate(`/checklist-quiz/${cq.id}`)}
              delay={i * 0.08}
            />
          ))}
          {reflectionQuizzes.map((rq, i) => (
            <QuizCard
              key={rq.id}
              title={rq.title}
              description={rq.description}
              emoji={rq.emoji}
              duration={rq.duration}
              questions={rq.questions.length}
              gradient={rq.gradient}
              onClick={() => navigate(`/reflection-quiz/${rq.id}`)}
              delay={0.15 + i * 0.08}
            />
          ))}
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Multiple Choice</p>
          </div>
          {quizCards.map((quiz, i) => (
            <QuizCard key={quiz.title} {...quiz} onClick={() => navigate(`/quiz/${quiz.id}`)} delay={i * 0.08} />
          ))}
        </TabsContent>

        {/* Prompts */}
        <TabsContent value="prompts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Spark a meaningful conversation</p>
            <button onClick={shufflePrompts} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Shuffle
            </button>
          </div>
          {visiblePrompts.map((p, i) => (
            <PromptCard key={`${promptIndex}-${i}`} category={p.category} prompt={p.prompt} categoryColor={p.color} delay={i * 0.08} />
          ))}
        </TabsContent>

        {/* Games */}
        <TabsContent value="games" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Fun activities to play together</p>
          <GameCard title="Kiss Chase" description="Chase each other in real life using GPS!" emoji="💋" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-coral/15 to-us-blush/25" onClick={() => navigate("/kiss-chase")} delay={0} />
          <GameCard title="Truth or Dare" description="Couples edition with spicy and sweet options." emoji="🎯" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-gold/15 to-us-cream/30" delay={0.08} />
          <GameCard title="Would You Rather" description="Impossible choices, hilarious debates." emoji="🤔" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-sage/15 to-us-cream/30" delay={0.16} />
          <GameCard title="Photo Challenge" description="Complete fun photo tasks together as a team." emoji="📸" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-blush/20 to-us-coral/10" delay={0.24} />
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos" className="mt-4">
          <OurPhotos />
        </TabsContent>

        {/* Events */}
        <TabsContent value="events" className="mt-4">
          <OurEvents />
        </TabsContent>

        {/* Gratitude */}
        <TabsContent value="gratitude" className="mt-4 space-y-4">
          <GratitudeJournal />

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/love-languages")}
            className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-xl">💕</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Love Language Ideas</p>
              <p className="text-xs text-muted-foreground">How you both give and receive love, with everyday ideas</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </TabsContent>

        {/* Links */}
        <TabsContent value="links" className="mt-4">
          <LinksAndMedia />
        </TabsContent>

        {/* Files */}
        <TabsContent value="files" className="mt-4 space-y-3">
          <SharedFolderEmbed />
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Us;
