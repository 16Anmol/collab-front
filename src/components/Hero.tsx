import { Button }      from "@/components/ui/button";
import { ArrowRight }  from "lucide-react";
import { useAuth }     from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const { user, profile, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user && profile?.role) {
      navigate(`/${profile.role}/dashboard`);
    } else if (user && !profile?.role) {
      navigate("/select-role");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
          Where Builders Collaborate.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground md:text-xl">
          Post tasks. Find skilled collaborators. Build together.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="gap-2" onClick={handleGetStarted} disabled={loading}>
            {!user ? "Sign in with Google" : "Go to Dashboard"}
            <ArrowRight size={18} />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/explore")}>
            Explore Problems
          </Button>
        </div>
        {!user && !loading && (
          <p className="mt-4 text-sm text-muted-foreground">
            Free to join. No credit card required.
          </p>
        )}
      </div>
    </section>
  );
};

export default Hero;
