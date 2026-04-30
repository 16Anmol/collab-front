import { Building2, User } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "For Startups",
    points: [
      "Find skilled collaborators",
      "Launch faster",
      "Flexible payment or equity",
    ],
  },
  {
    icon: User,
    title: "For Freelancers",
    points: [
      "Work on real startup problems",
      "Build long-term connections",
      "Get fair opportunities",
    ],
  },
];

const WhoIsItFor = () => {
  return (
    <section id="who" className="bg-section-alt px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-foreground">
          Who Is It For?
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="rounded-lg border border-border bg-card p-8 shadow-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <audience.icon size={24} className="text-accent-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">
                {audience.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {audience.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoIsItFor;
