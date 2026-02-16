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


import SharedFileManager from "@/components/connect/SharedFileManager";
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

const seedCompletedQuizzes = (): CompletedQuiz[] => [
  {
    quizId: "know-me",
    title: "How Well Do You Know Me?",
    emoji: "🧠",
    score: 7,
    totalQuestions: 10,
    completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    answers: [
      { question: "What's my favourite comfort food?", yourAnswer: "Pizza", partnerAnswer: "Pizza", match: true },
      { question: "What do I do first thing in the morning?", yourAnswer: "Check phone", partnerAnswer: "Make coffee", match: false },
      { question: "What's my biggest fear?", yourAnswer: "Failure", partnerAnswer: "Failure", match: true },
      { question: "Where would I most want to travel?", yourAnswer: "Japan", partnerAnswer: "Japan", match: true },
      { question: "What's my love language?", yourAnswer: "Quality time", partnerAnswer: "Quality time", match: true },
      { question: "What makes me laugh the hardest?", yourAnswer: "Dry humour", partnerAnswer: "Memes", match: false },
      { question: "What's my dream job?", yourAnswer: "Entrepreneur", partnerAnswer: "Entrepreneur", match: true },
      { question: "How do I relax after a hard day?", yourAnswer: "TV show", partnerAnswer: "TV show", match: true },
      { question: "What song always puts me in a good mood?", yourAnswer: "A throwback", partnerAnswer: "Something chill", match: false },
      { question: "What am I most proud of?", yourAnswer: "Personal growth", partnerAnswer: "Personal growth", match: true },
    ],
    actionItems: ["Plan a surprise comfort-food night", "Share your morning routines for a week"],
  },
  {
    quizId: "love-language",
    title: "Love Language Check-In",
    emoji: "💕",
    score: 6,
    totalQuestions: 8,
    completedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    answers: [
      { question: "I feel most loved when my partner…", yourAnswer: "Plans quality time", partnerAnswer: "Plans quality time", match: true },
      { question: "After a tough week, I need…", yourAnswer: "A cosy night in", partnerAnswer: "A heartfelt conversation", match: false },
      { question: "The best surprise would be…", yourAnswer: "A weekend trip", partnerAnswer: "A weekend trip", match: true },
      { question: "I feel disconnected when…", yourAnswer: "We're always busy", partnerAnswer: "We're always busy", match: true },
      { question: "My ideal date night is…", yourAnswer: "Deep conversation over dinner", partnerAnswer: "Deep conversation over dinner", match: true },
      { question: "I show love by…", yourAnswer: "Making plans together", partnerAnswer: "Doing helpful things", match: false },
      { question: "A small gesture that means a lot:", yourAnswer: "Undivided attention", partnerAnswer: "Undivided attention", match: true },
      { question: "When I'm stressed, I want you to…", yourAnswer: "Talk it through", partnerAnswer: "Talk it through", match: true },
    ],
    actionItems: ["Schedule a weekly date night", "Write each other a love note this week"],
  },
  {
    quizId: "dream-life",
    title: "Dream Life Alignment",
    emoji: "🌙",
    score: 5,
    totalQuestions: 10,
    completedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    answers: [
      { question: "In 5 years, where do we live?", yourAnswer: "Suburbs", partnerAnswer: "City centre", match: false },
      { question: "How many kids (if any)?", yourAnswer: "Two", partnerAnswer: "Two", match: true },
      { question: "Our ideal home has…", yourAnswer: "Big garden", partnerAnswer: "Cosy kitchen", match: false },
      { question: "We retire and…", yourAnswer: "Travel the world", partnerAnswer: "Travel the world", match: true },
      { question: "Our next big purchase should be…", yourAnswer: "Property", partnerAnswer: "Property", match: true },
      { question: "Work-life balance means…", yourAnswer: "Weekends sacred", partnerAnswer: "Flexible hours", match: false },
      { question: "Our holiday style is…", yourAnswer: "Adventure", partnerAnswer: "Adventure", match: true },
      { question: "What's most important for our home?", yourAnswer: "Near family", partnerAnswer: "Near nature", match: false },
      { question: "How do we handle finances?", yourAnswer: "Joint account", partnerAnswer: "Joint account", match: true },
      { question: "Pets?", yourAnswer: "Dog", partnerAnswer: "Both", match: false },
    ],
    actionItems: ["Discuss where you'd both love to live", "Create a shared vision board for your dream home"],
  },
  {
    quizId: "challenges",
    title: "Our Challenges Quiz",
    emoji: "⚡",
    score: 8,
    totalQuestions: 10,
    completedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    answers: [
      { question: "What's our biggest strength as a couple?", yourAnswer: "Communication", partnerAnswer: "Communication", match: true },
      { question: "Where do we clash the most?", yourAnswer: "Tidiness", partnerAnswer: "Tidiness", match: true },
      { question: "How do we handle disagreements?", yourAnswer: "Talk it out", partnerAnswer: "Talk it out", match: true },
      { question: "What should we do more of?", yourAnswer: "Adventures", partnerAnswer: "Date nights", match: false },
      { question: "Our biggest win this year?", yourAnswer: "Moving in together", partnerAnswer: "Moving in together", match: true },
      { question: "Who apologises first?", yourAnswer: "Me", partnerAnswer: "Me", match: true },
      { question: "What habit do you wish I'd change?", yourAnswer: "Phone usage", partnerAnswer: "Phone usage", match: true },
      { question: "How do we recharge together?", yourAnswer: "Walking", partnerAnswer: "Cooking", match: false },
      { question: "What are we most excited about?", yourAnswer: "The future", partnerAnswer: "The future", match: true },
      { question: "How do we show gratitude?", yourAnswer: "Saying thank you", partnerAnswer: "Saying thank you", match: true },
    ],
    actionItems: ["Plan one adventure together this month", "Set a phone-free evening once a week"],
  },
];

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
          <GameCard title="Truth or Dare" description="Couples edition with spicy and sweet options." emoji="🎯" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-gold/15 to-us-cream/30" onClick={() => navigate("/truth-or-dare")} delay={0.08} />
          <GameCard title="Would You Rather" description="Impossible choices, hilarious debates." emoji="🤔" players="2 players · Anywhere" gradient="bg-gradient-to-br from-us-sage/15 to-us-cream/30" onClick={() => navigate("/would-you-rather")} delay={0.16} />
          <GameCard title="Photo Challenge" description="Complete fun photo tasks together as a team." emoji="📸" players="2 players · Outdoors" gradient="bg-gradient-to-br from-us-blush/20 to-us-coral/10" onClick={() => navigate("/photo-challenge")} delay={0.24} />
        </TabsContent>

        {/* Photos */}
        <TabsContent value="photos" className="mt-4">
          <OurPhotos />
        </TabsContent>

        {/* Admin — Events, Photos & Files */}
        <TabsContent value="admin" className="mt-4 space-y-6">

          <div className="border-t border-border/50 pt-4 space-y-3">
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
            <SharedFileManager />
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Us;
