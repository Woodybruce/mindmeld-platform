import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import TruthOrDare from "./pages/TruthOrDare";
import WouldYouRather from "./pages/WouldYouRather";
import PhotoChallenge from "./pages/PhotoChallenge";
import FamilyQuiz from "./pages/FamilyQuiz";
import Auth from "./pages/Auth";
import OutlookCallback from "./pages/OutlookCallback";
import AuthGuard from "./components/AuthGuard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/us" element={<AuthGuard><Us /></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
              <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
              <Route path="/kiss-chase" element={<AuthGuard><KissChasePage /></AuthGuard>} />
              <Route path="/quiz/:quizId" element={<AuthGuard><QuizPlay /></AuthGuard>} />
              <Route path="/checklist-quiz/:quizId" element={<AuthGuard><ChecklistQuizPlay /></AuthGuard>} />
              <Route path="/love-languages" element={<AuthGuard><LoveLanguageGuide /></AuthGuard>} />
              <Route path="/reflection-quiz/:quizId" element={<AuthGuard><ReflectionQuizPlay /></AuthGuard>} />
              <Route path="/our-challenges" element={<AuthGuard><OurChallenges /></AuthGuard>} />
              <Route path="/our-sex-list" element={<AuthGuard><OurSexList /></AuthGuard>} />
              <Route path="/truth-or-dare" element={<AuthGuard><TruthOrDare /></AuthGuard>} />
              <Route path="/would-you-rather" element={<AuthGuard><WouldYouRather /></AuthGuard>} />
              <Route path="/photo-challenge" element={<AuthGuard><PhotoChallenge /></AuthGuard>} />
              <Route path="/family-quiz" element={<AuthGuard><FamilyQuiz /></AuthGuard>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/outlook-callback" element={<OutlookCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
