import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import AchievementToast from "@/components/AchievementToast";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Index from "./pages/Index";
import PlayGame from "./pages/PlayGame";
import Multiplayer from "./pages/Multiplayer";

import SPAuth from "./pages/SPAuth";
import MPAuth from "./pages/MPAuth";
import SPProfile from "./pages/SPProfile";
import MPProfile from "./pages/MPProfile";
import SPLeaderboard from "./pages/SPLeaderboard";
import MPLeaderboard from "./pages/MPLeaderboard";
import SPAchievements from "./pages/SPAchievements";
import MPAchievements from "./pages/MPAchievements";
import SPCustomCards from "./pages/SPCustomCards";
import MPCustomCards from "./pages/MPCustomCards";
import MPSocial from "./pages/MPSocial";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AchievementToast />
      <BrowserRouter>
        <SettingsProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/play" element={<PlayGame />} />
              <Route path="/multiplayer" element={<Multiplayer />} />
              
              <Route path="/sp/auth" element={<SPAuth />} />
              <Route path="/mp/auth" element={<MPAuth />} />
              <Route path="/sp/profile" element={<SPProfile />} />
              <Route path="/mp/profile" element={<MPProfile />} />
              <Route path="/sp/leaderboard" element={<SPLeaderboard />} />
              <Route path="/mp/leaderboard" element={<MPLeaderboard />} />
              <Route path="/sp/achievements" element={<SPAchievements />} />
              <Route path="/mp/achievements" element={<MPAchievements />} />
              <Route path="/sp/custom-cards" element={<SPCustomCards />} />
              <Route path="/mp/custom-cards" element={<MPCustomCards />} />
              <Route path="/mp/social" element={<MPSocial />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </SettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
