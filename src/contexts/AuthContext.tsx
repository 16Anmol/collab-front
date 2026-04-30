import {
  createContext, useContext, ReactNode,
  useState, useEffect, useCallback
} from "react";
import { useNavigate } from "react-router-dom";
import {
  authApi, profileApi, saveToken, clearToken,
  type FullProfile, type User
} from "@/lib/api";

type AuthContextType = {
  user: User | null;
  profile: FullProfile | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── On mount: pick up token from URL (after Google OAuth) or localStorage ──
  useEffect(() => {
    const params        = new URLSearchParams(window.location.search);
    const tokenFromUrl  = params.get("token");
    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      // Remove token from URL so it doesn't stay visible
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchProfile();
  }, []);

  // ── Fetch real user + profile from backend ─────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await profileApi.getMe();
      setProfile(p);
      setUser({
        id:        p.id,
        email:     p.email,
        fullName:  p.fullName,
        avatar:    p.avatar,
        role:      p.role,
        onboarded: p.onboarded,
        tags:      p.tags,
      });
      // Apply role-based colour theme to entire app
      document.documentElement.setAttribute(
        "data-theme",
        p.role === "freelancer" ? "freelancer" : "startup"
      );
    } catch {
      // No token or expired → user is logged out
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Google login: redirect to backend which redirects to Google ─────────────
  const signInWithGoogle = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  // ── Sign out: clear token + state ──────────────────────────────────────────
  const signOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      // Even if backend call fails, still clear local state
    } finally {
      clearToken();
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile: fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
