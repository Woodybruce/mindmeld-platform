import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SpotifyPlayerProvider } from "@/contexts/SpotifyPlayerContext";
import PersistentSpotifyPlayer from "@/components/PersistentSpotifyPlayer";
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
import DareDuel from "./pages/DareDuel";
import DesignMyNight from "./pages/DesignMyNight";
import FamilyQuiz from "./pages/FamilyQuiz";
import SexBucketGame from "./pages/SexBucketGame";
import AdminFeedContent from "./pages/AdminFeedContent";
import AdminProducts from "./pages/AdminProducts";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import OutlookCallback from "./pages/OutlookCallback";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import AuthGuard from "./components/AuthGuard";
import NotFound from "./pages/NotFound";
import VibeOverlay from "./components/VibeOverlay";
import OfflineBanner from "./components/OfflineBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <VibeOverlay />
          <OfflineBanner />
          <SpotifyPlayerProvider>
            <BrowserRouter>
              <PersistentSpotifyPlayer />
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
              <Route path="/dare-duel" element={<AuthGuard><DareDuel /></AuthGuard>} />
              <Route path="/design-my-night" element={<AuthGuard><DesignMyNight /></AuthGuard>} />
              <Route path="/family-quiz" element={<AuthGuard><FamilyQuiz /></AuthGuard>} />
              <Route path="/sex-bucket-game" element={<AuthGuard><SexBucketGame /></AuthGuard>} />
              <Route path="/admin/feed" element={<AuthGuard><AdminFeedContent /></AuthGuard>} />
              <Route path="/admin/products" element={<AuthGuard><AdminProducts /></AuthGuard>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/outlook-callback" element={<OutlookCallback />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SpotifyPlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
