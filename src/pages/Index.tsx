import Navbar          from "@/components/Navbar";
import Hero            from "@/components/Hero";
import HowItWorks      from "@/components/HowItWorks";
import WhyCoHustle     from "@/components/WhyCoHustle";
import WhoIsItFor      from "@/components/WhoIsItFor";
import SampleProblemCard from "@/components/SampleProblemCard";
import TrustSection    from "@/components/TrustSection";
import FinalCTA        from "@/components/FinalCTA";
import Footer          from "@/components/Footer";
import { useAuth }     from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect }   from "react";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // If already logged in and onboarded, redirect straight to dashboard
  useEffect(() => {
    if (!loading && user && profile?.role && profile?.onboarded) {
      navigate(`/${profile.role}/dashboard`, { replace: true });
    }
    // If logged in but no role, go to SelectRole
    if (!loading && user && !profile?.role) {
      navigate("/select-role", { replace: true });
    }
  }, [loading, user, profile]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyCoHustle />
      <WhoIsItFor />
      <SampleProblemCard />
      <TrustSection />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
