import { Check } from "lucide-react";

const reasons = [
  "No connects",
  "No bidding system",
  "No price wars",
  "Collaboration-focused",
  "Milestone-based work",
  "Startup-friendly",
];

const WhyCoHustle = () => {
  return (
    <section id="why" className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-foreground">
          Why Co Hustle?
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Built for real collaboration, not competition.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                <Check size={14} className="text-accent-foreground" />
              </div>
              <span className="text-foreground">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default WhyCoHustle;
