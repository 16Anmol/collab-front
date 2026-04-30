import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SampleProblemCard = () => {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-foreground">
          What Tasks Look Like
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Clean, structured, and easy to understand.
        </p>
        <div className="mx-auto mt-12 max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold text-foreground">
            Build MVP for SaaS
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">React</Badge>
            <Badge variant="secondary">UI Design</Badge>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              ₹30,000 or Equity
            </span>
            <Button size="sm">Apply</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SampleProblemCard;
