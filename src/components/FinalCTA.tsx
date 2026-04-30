import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const FinalCTA = () => {
  const { user, profile, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleJoin = () => {
    if (user && profile?.role) {
      navigate(`/${profile.role}/dashboard`);
    } else if (user) {
      navigate("/select-role");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          Start Building Together.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Join a community of builders who ship real products.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={handleJoin}>Join Co Hustle</Button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
