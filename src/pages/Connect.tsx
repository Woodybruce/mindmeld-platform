import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, MessageCircle, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const Connect = () => {
  const navigate = useNavigate();

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

        <TabsContent value="quizzes" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-us-gold mb-3" />
            <h2 className="font-display text-lg font-semibold text-foreground">Couple Quizzes</h2>
            <p className="text-sm text-muted-foreground mt-1">How well do you really know each other?</p>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <MessageCircle className="w-10 h-10 mx-auto text-us-coral mb-3" />
            <h2 className="font-display text-lg font-semibold text-foreground">Conversation Prompts</h2>
            <p className="text-sm text-muted-foreground mt-1">Deep questions to spark meaningful conversations.</p>
          </div>
        </TabsContent>

        <TabsContent value="games" className="mt-4 space-y-3">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Gamepad2 className="w-10 h-10 mx-auto text-us-sage mb-3" />
            <h2 className="font-display text-lg font-semibold text-foreground">Games</h2>
            <p className="text-sm text-muted-foreground mt-1">Fun activities to play together.</p>
          </div>
          <button
            onClick={() => navigate("/kiss-chase")}
            className="w-full rounded-xl border border-us-coral/30 bg-gradient-to-r from-us-coral/10 to-us-blush/20 p-4 text-left hover:from-us-coral/20 transition-colors"
          >
            <span className="font-display font-semibold text-foreground">💋 Kiss Chase</span>
            <p className="text-xs text-muted-foreground mt-0.5">Chase each other in real life!</p>
          </button>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Connect;
