import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModeProvider } from "@/contexts/ModeContext";

// Welcome/Landing
import Welcome from "./pages/Welcome";

// Esports Pages
import Index from "./pages/Index";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Leaderboards from "./pages/Leaderboards";
import LiveMatches from "./pages/LiveMatches";
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Sports Mode Pages
import SportsIndex from "./pages/sports/SportsIndex";
import SportsTournaments from "./pages/sports/SportsTournaments";
import SportsTournamentDetail from "./pages/sports/SportsTournamentDetail";
import SportsLeaderboards from "./pages/sports/SportsLeaderboards";
import SportsLiveMatches from "./pages/sports/SportsLiveMatches";
import SportsAdmin from "./pages/sports/SportsAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </TooltipProvider>
      </ModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
