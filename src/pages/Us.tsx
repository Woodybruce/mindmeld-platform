import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ListChecks, FolderOpen, ExternalLink,
  FileText, Image, File, Upload, Sparkles, MessageCircle,
  Gamepad2, RefreshCw, Trophy, Camera, Calendar, Heart,
  Link2
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { quizDefinitions } from "@/data/quizData";
import { checklistQuizzes } from "@/data/checklistQuizData";
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
  { category: "Deep", prompt: "What's one thing you've never told me that you wish I knew?", color: "text-us-coral" },
  { category: "Playful", prompt: "If we could teleport anywhere right now, where would you take us?", color: "text-us-gold" },
  { category: "Growth", prompt: "What's one way I've helped you grow as a person?", color: "text-us-sage" },
  { category: "Memory", prompt: "What's your favourite memory of us from the last month?", color: "text-us-terracotta" },
  { category: "Dreams", prompt: "What's something you want us to experience together before the year ends?", color: "text-primary" },
  { category: "Intimacy", prompt: "When do you feel most connected to me?", color: "text-us-coral" },
  { category: "Fun", prompt: "What fictional couple reminds you most of us?", color: "text-us-gold" },
  { category: "Gratitude", prompt: "What's something small I do that means a lot to you?", color: "text-us-sage" },
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
    items: [],
  },
];

const Us = () => {
  const navigate = useNavigate();
  const [promptIndex, setPromptIndex] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>([]);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const { partnerActivity, dismiss: dismissActivity } = usePartnerQuizActivity();

  useEffect(() => {
    setCompletedQuizzes(JSON.parse(localStorage.getItem("completedQuizzes") || "[]"));
    const stored = localStorage.getItem("userLists");
    if (stored) {
      setUserLists(JSON.parse(stored));
    } else {
      // First visit: seed with OneNote data
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Us</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your shared world</p>
        </div>
      </header>

      {partnerActivity && (
        <PartnerQuizBanner
          quizTitle={partnerActivity.quizTitle}
          quizEmoji={partnerActivity.quizEmoji}
          onDismiss={dismissActivity}
        />
      )}

      <Tabs defaultValue="lists" className="px-4 pt-3 pb-24">
        <ScrollArea className="w-full">
          <TabsList className="w-max bg-secondary gap-0.5 px-1">
            <TabsTrigger value="lists" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <ListChecks className="w-3.5 h-3.5" /> Lists
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <MessageCircle className="w-3.5 h-3.5" /> Prompts
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Gamepad2 className="w-3.5 h-3.5" /> Games
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Camera className="w-3.5 h-3.5" /> Photos
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" /> Events
            </TabsTrigger>
            <TabsTrigger value="gratitude" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Heart className="w-3.5 h-3.5" /> Gratitude
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <Link2 className="w-3.5 h-3.5" /> Links
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1 text-xs data-[state=active]:bg-card whitespace-nowrap">
              <FolderOpen className="w-3.5 h-3.5" /> Files
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Lists — default tab, imported from OneNote */}
        <TabsContent value="lists" className="mt-4 space-y-5">
          <SharedLists lists={userLists} onUpdate={handleListsUpdate} />

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
          <QuizCard
            title="Love Language Ideas"
            description="Understand how you both give and receive love, with real stories and everyday ideas."
            emoji="💕"
            duration="Browse"
            questions={5}
            gradient="bg-gradient-to-br from-us-blush/30 to-us-coral/10"
            onClick={() => navigate("/love-languages")}
            delay={0.1}
          />
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
        <TabsContent value="gratitude" className="mt-4">
          <GratitudeJournal />
        </TabsContent>

        {/* Links */}
        <TabsContent value="links" className="mt-4">
          <LinksAndMedia />
        </TabsContent>

        {/* Files */}
        <TabsContent value="files" className="mt-4 space-y-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-dashed border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Shared Folder</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Link OneDrive, Dropbox, or Google Drive</p>
              </div>
              <a
                href="https://paveam-my.sharepoint.com/:o:/g/personal/bruce_pave_london/IgDoxZBcATJaTr_DusAtrAgDAfjEuDrohCYxTKB6RFZdkmU?e=rVCfyu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open OneNote
              </a>
            </div>
          </motion.div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Files</span>
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
            {mockFiles.map((file, i) => (
              <motion.button key={file.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.06 }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 text-left">
                {fileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{file.updated}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Us;
