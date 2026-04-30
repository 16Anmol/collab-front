import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Users, Target, Handshake } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold text-foreground md:text-5xl">About Co Hustle</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Co Hustle is a collaboration platform built for builders. We believe the best products come from people working together — not competing against each other in bidding wars.
        </p>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
              <Target className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Our Mission</h3>
            <p className="mt-2 text-muted-foreground">
              To make collaboration simple, fair, and accessible for startups and freelancers worldwide.
            </p>
          </div>
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Community First</h3>
            <p className="mt-2 text-muted-foreground">
              We're building a community where trust and quality matter more than the lowest price.
            </p>
          </div>
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
              <Handshake className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Fair Opportunities</h3>
            <p className="mt-2 text-muted-foreground">
              No connects, no bidding. Just real problems and skilled people ready to solve them together.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
