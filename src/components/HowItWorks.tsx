import { FileText, Users, Rocket } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Post a Task",
    description: "Describe the task you need help with.",
  },
  {
    icon: Users,
    title: "Find Collaborators",
    description: "Skilled people apply to work with you.",
  },
  {
    icon: Rocket,
    title: "Build Together",
    description: "Work with clear milestones and goals.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-section-alt px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-foreground">
          How It Works
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Three simple steps to start collaborating.
        </p>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <step.icon size={24} className="text-accent-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
