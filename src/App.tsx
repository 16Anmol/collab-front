import { Toaster }                          from "@/components/ui/toaster";
import { Toaster as Sonner }                from "@/components/ui/sonner";
import { TooltipProvider }                  from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter, Routes, Route,
  useNavigate, useSearchParams, Navigate
} from "react-router-dom";
import { useEffect }    from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth }      from "@/contexts/AuthContext";
import { saveToken }    from "@/lib/api";

import Index               from "./pages/Index";
import About               from "./pages/About";
import ExploreProblems     from "./pages/ExploreProblems";
import SelectRole          from "./pages/SelectRole";
import StartupDashboard    from "./pages/StartupDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import Profile             from "./pages/Profile";
import PostProblem         from "./pages/PostProblem";
import PostCollabRequest   from "./pages/PostCollabRequest";
import Chat                from "./pages/Chat";
import Milestones          from "./pages/Milestones";
import RatingsPage         from "./pages/RatingsPage";
import AdminPanel          from "./pages/AdminPanel";
import ApplicationDetail      from "./pages/ApplicationDetail";
import TaskApplicationsPage from "./pages/TaskApplicationsPage";
import CollabPitchesPage    from "./pages/CollabPitchesPage";
import CollabPitchDetail    from "./pages/CollabPitchDetail";
import UserProfile          from "./pages/UserProfile";
import MeetRoom           from "./pages/MeetRoom";
import NotFound            from "./pages/NotFound";

const queryClient = new QueryClient();

// ── Full-screen loading ────────────────────────────────────────────────────────
export const LoadingScreen = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <p className="text-sm text-muted-foreground">Loading CoHustle…</p>
  </div>
);

// ── /auth/callback — Google OAuth sends the JWT here ──────────────────────────
const AuthCallback = () => {
  const navigate           = useNavigate();
  const [params]           = useSearchParams();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const run = async () => {
      const token = params.get("token");
      if (token) saveToken(token);

      try {
        // Fetch real profile so we know role/onboarded
        await refreshProfile();
      } finally {
        // refreshProfile updates state; Index.tsx will then redirect correctly
        navigate("/", { replace: true });
      }
    };
    run();
  }, []);

  return <LoadingScreen />;
};

// ── Route Guards ───────────────────────────────────────────────────────────────

/** Must be logged in */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading)        return <LoadingScreen />;
  if (!user)          return <Navigate to="/" replace />;
  if (!profile?.role) return <Navigate to="/select-role" replace />;
  return <>{children}</>;
};

/** Startup role only */
const RequireStartup = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading)                    return <LoadingScreen />;
  if (!user)                      return <Navigate to="/" replace />;
  if (!profile?.role)             return <Navigate to="/select-role" replace />;
  if (profile.role !== "startup") return <Navigate to="/freelancer/dashboard" replace />;
  return <>{children}</>;
};

/** Freelancer role only */
const RequireFreelancer = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading)                       return <LoadingScreen />;
  if (!user)                         return <Navigate to="/" replace />;
  if (!profile?.role)                return <Navigate to="/select-role" replace />;
  if (profile.role !== "freelancer") return <Navigate to="/startup/dashboard" replace />;
  return <>{children}</>;
};

/** SelectRole — only for users who haven't picked a role yet */
const RequireNoRole = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading)       return <LoadingScreen />;
  if (!user)         return <Navigate to="/" replace />;
  if (profile?.role) return <Navigate to={`/${profile.role}/dashboard`} replace />;
  return <>{children}</>;
};

// ── App ────────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public pages */}
            <Route path="/"        element={<Index />} />
            <Route path="/about"   element={<About />} />
            <Route path="/explore" element={<ExploreProblems />} />

            {/* Google OAuth lands here */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Logged in but no role → choose role */}
            <Route path="/select-role" element={
              <RequireNoRole><SelectRole /></RequireNoRole>
            } />

            {/* Startup */}
            <Route path="/startup/dashboard" element={
              <RequireStartup><StartupDashboard /></RequireStartup>
            } />
            <Route path="/post-problem" element={
              <RequireStartup><PostProblem /></RequireStartup>
            } />

            {/* Freelancer */}
            <Route path="/freelancer/dashboard" element={
              <RequireFreelancer><FreelancerDashboard /></RequireFreelancer>
            } />

            {/* Any logged-in user */}
            <Route path="/profile"     element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/post-collab" element={<RequireAuth><PostCollabRequest /></RequireAuth>} />
            <Route path="/chat"        element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/milestones"  element={<RequireAuth><Milestones /></RequireAuth>} />
            <Route path="/ratings"     element={<RequireAuth><RatingsPage /></RequireAuth>} />
            <Route path="/admin"       element={<RequireAuth><AdminPanel /></RequireAuth>} />
            <Route path="/applications/:id" element={<RequireAuth><ApplicationDetail /></RequireAuth>} />
            <Route path="/tasks/:problemId/applications" element={<RequireAuth><TaskApplicationsPage /></RequireAuth>} />
            <Route path="/collab-pitches/:collabRequestId" element={<RequireAuth><CollabPitchesPage /></RequireAuth>} />
            <Route path="/collab-pitch/:pitchId" element={<RequireAuth><CollabPitchDetail /></RequireAuth>} />
            <Route path="/profile/:userId" element={<RequireAuth><UserProfile /></RequireAuth>} />

            {/* WebRTC meeting room — accessible by anyone with the link */}
            <Route path="/meet/:roomId" element={<MeetRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
