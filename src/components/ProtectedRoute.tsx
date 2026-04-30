import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  children: React.ReactNode;
  requiredRole?: "startup" | "freelancer";
  requireOnboarded?: boolean;
};

const ProtectedRoute = ({ children, requiredRole, requireOnboarded }: Props) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // No profile → needs role selection
  if (!profile || !profile.role) {
    return <Navigate to="/select-role" replace />;
  }

  // Wrong role for this route
  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
