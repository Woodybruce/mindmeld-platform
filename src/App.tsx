import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Us from "./pages/Us";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import KissChasePage from "./pages/KissChase";
import QuizPlay from "./pages/QuizPlay";
import ChecklistQuizPlay from "./pages/ChecklistQuizPlay";
import LoveLanguageGuide from "./pages/LoveLanguageGuide";
import ReflectionQuizPlay from "./pages/ReflectionQuizPlay";
import OurChallenges from "./pages/OurChallenges";
import OurSexList from "./pages/OurSexList";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/us" element={<Us />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/kiss-chase" element={<KissChasePage />} />
            <Route path="/quiz/:quizId" element={<QuizPlay />} />
            <Route path="/checklist-quiz/:quizId" element={<ChecklistQuizPlay />} />
            <Route path="/love-languages" element={<LoveLanguageGuide />} />
            <Route path="/reflection-quiz/:quizId" element={<ReflectionQuizPlay />} />
            <Route path="/our-challenges" element={<OurChallenges />} />
            <Route path="/our-sex-list" element={<OurSexList />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
