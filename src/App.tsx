import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Welcome/Landing - eager load for first paint
import Welcome from "./pages/Welcome";

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const LiveMatches = lazy(() => import("./pages/LiveMatches"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Sports Mode Pages
const SportsIndex = lazy(() => import("./pages/sports/SportsIndex"));
const SportsTournaments = lazy(() => import("./pages/sports/SportsTournaments"));
const SportsTournamentDetail = lazy(() => import("./pages/sports/SportsTournamentDetail"));
const SportsLeaderboards = lazy(() => import("./pages/sports/SportsLeaderboards"));
const SportsLiveMatches = lazy(() => import("./pages/sports/SportsLiveMatches"));
const SportsAdmin = lazy(() => import("./pages/sports/SportsAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Welcome/Multiverse Landing Page */}
                <Route path="/" element={<Welcome />} />
                
                {/* Esports Routes */}
                <Route path="/esports" element={<Index />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/tournaments/:id" element={<TournamentDetail />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/live-matches" element={<LiveMatches />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                
                {/* Sports Routes */}
                <Route path="/sports" element={<SportsIndex />} />
                <Route path="/sports/tournaments" element={<SportsTournaments />} />
                <Route path="/sports/tournaments/:id" element={<SportsTournamentDetail />} />
                <Route path="/sports/leaderboards" element={<SportsLeaderboards />} />
                <Route path="/sports/live-matches" element={<SportsLiveMatches />} />
                <Route path="/sports/admin" element={<SportsAdmin />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
