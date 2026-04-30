import { ShieldCheck, Target, Star } from "lucide-react";

const trustItems = [
  { icon: ShieldCheck, label: "Verified Profiles" },
  { icon: Target, label: "Structured Milestones" },
  { icon: Star, label: "Transparent Ratings" },
];

const TrustSection = () => {
  return (
    <section className="bg-section-alt px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
