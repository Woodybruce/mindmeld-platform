import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ListChecks, FolderOpen, ExternalLink,
  FileText, Image, File, Upload, Sparkles,
  Gamepad2, Trophy, Camera, Calendar, Heart,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import QuizCard from "@/components/connect/QuizCard";

import GameCard from "@/components/connect/GameCard";
import CompletedQuizList from "@/components/connect/CompletedQuizList";
import SharedLists from "@/components/connect/SharedLists";
import type { UserList } from "@/components/connect/SharedLists";
import OurPhotos from "@/components/connect/OurPhotos";
import OurEvents from "@/components/connect/OurEvents";
import GratitudeJournal from "@/components/connect/GratitudeJournal";

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

const defaultLists: UserList[] = [];

const seedCompletedQuizzes = (): CompletedQuiz[] => [];

const Us = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "lists";
  
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
            <TabsTrigger value="games" className="gap-1 text-xs data-[state=active]:bg-card">
              <Gamepad2 className="w-3.5 h-3.5" /> Games
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1 text-xs data-[state=active]:bg-card">
              <Camera className="w-3.5 h-3.5" /> Photos
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-1 text-xs data-[state=active]:bg-card">
              <FolderOpen className="w-3.5 h-3.5" /> Admin
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


          {/* Gratitude & Love Languages */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gratitude & Connection</p>
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
          </div>
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

        {/* Admin — Events & Files */}
        <TabsContent value="admin" className="mt-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-us-gold" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Events & Calendar</p>
            </div>
            <OurEvents />
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-us-navy" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shared Files</p>
            </div>
            <SharedFolderEmbed />
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Us;
