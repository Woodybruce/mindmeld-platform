import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SpotifyPlayerProvider } from "@/contexts/SpotifyPlayerContext";
import PersistentSpotifyPlayer from "@/components/PersistentSpotifyPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import Us from "./pages/Us";
import Chat from "./pages/Chat";
import ChatPage from "./pages/ChatPage";
import Auth from "./pages/Auth";
import AuthGuard from "./components/AuthGuard";
import NotFound from "./pages/NotFound";
import VibeOverlay from "./components/VibeOverlay";
import OfflineBanner from "./components/OfflineBanner";

const TasksPage = lazy(() => import("./pages/TasksPage"));
const DiaryPage = lazy(() => import("./pages/DiaryPage"));
const Profile = lazy(() => import("./pages/Profile"));
const KissChasePage = lazy(() => import("./pages/KissChase"));
const QuizPlay = lazy(() => import("./pages/QuizPlay"));
const ChecklistQuizPlay = lazy(() => import("./pages/ChecklistQuizPlay"));
const LoveLanguageGuide = lazy(() => import("./pages/LoveLanguageGuide"));
const ReflectionQuizPlay = lazy(() => import("./pages/ReflectionQuizPlay"));
const OurChallenges = lazy(() => import("./pages/OurChallenges"));
const OurSexList = lazy(() => import("./pages/OurSexList"));
const TruthOrDare = lazy(() => import("./pages/TruthOrDare"));
const WouldYouRather = lazy(() => import("./pages/WouldYouRather"));
const PhotoChallenge = lazy(() => import("./pages/PhotoChallenge"));
const DareDuel = lazy(() => import("./pages/DareDuel"));
const DesignMyNight = lazy(() => import("./pages/DesignMyNight"));
const FamilyQuiz = lazy(() => import("./pages/FamilyQuiz"));
const SexBucketGame = lazy(() => import("./pages/SexBucketGame"));
const AdminFeedContent = lazy(() => import("./pages/AdminFeedContent"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OutlookCallback = lazy(() => import("./pages/OutlookCallback"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
              <ErrorBoundary fallbackTitle="Something went wrong">
              <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
              <Route path="/feed" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/tasks" element={<AuthGuard><TasksPage /></AuthGuard>} />
              <Route path="/diary" element={<AuthGuard><DiaryPage /></AuthGuard>} />
              <Route path="/us" element={<AuthGuard><Us /></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
              <Route path="/chat" element={<AuthGuard><ChatPage /></AuthGuard>} />
              <Route path="/chat-legacy" element={<AuthGuard><Chat /></AuthGuard>} />
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
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </SpotifyPlayerProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
