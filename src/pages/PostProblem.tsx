import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, IndianRupee } from "lucide-react";
import TagInput from "@/components/TagInput";
import Navbar   from "@/components/Navbar";
import { problemsApi } from "@/lib/api";

const PROBLEM_TAGS = [
  "React","Node.js","Python","UI/UX","Mobile App","API Development",
  "Data Science","Machine Learning","DevOps","Marketing","Content Writing",
  "Video Editing","Graphic Design","SEO","Growth Hacking","Blockchain",
];

const PostProblem = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title:       "",
    description: "",
    tags:        [] as string[],
    budgetMin:   "",
    budgetMax:   "",
    timeline:    "",
    location:    "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Build a clean display budget string from min/max
      const budgetDisplay =
        form.budgetMin && form.budgetMax ? `₹${Number(form.budgetMin).toLocaleString("en-IN")} – ₹${Number(form.budgetMax).toLocaleString("en-IN")}`
        : form.budgetMin ? `From ₹${Number(form.budgetMin).toLocaleString("en-IN")}`
        : form.budgetMax ? `Up to ₹${Number(form.budgetMax).toLocaleString("en-IN")}`
        : "";

      await problemsApi.create({
        title:       form.title.trim(),
        description: form.description.trim(),
        tags:        form.tags,
        budget:      budgetDisplay,
        budgetMin:   form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax:   form.budgetMax ? Number(form.budgetMax) : undefined,
        timeline:    form.timeline,
        location:    form.location,
      });
      toast({ title: "Task posted! Freelancers will be notified." });
      navigate("/startup/dashboard");
    } catch (err: any) {
      toast({ title: "Error posting task", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Post a Task</CardTitle>
            <CardDescription>
              Describe the task clearly. Freelancers will be able to view and apply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Title */}
              <div className="space-y-2">
                <Label className="font-semibold">Title *</Label>
                <Input
                  placeholder="e.g. Build a landing page for our SaaS product"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="font-semibold">Description *</Label>
                <Textarea
                  placeholder="Describe the task in detail — requirements, deliverables, what success looks like…"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="font-semibold">Required Skills / Tags</Label>
                <TagInput
                  tags={form.tags}
                  onChange={tags => setForm({ ...form, tags })}
                  suggestions={PROBLEM_TAGS}
                  placeholder="Add relevant skills (e.g. React, Graphic Design)…"
                />
              </div>

              {/* Budget — just Min and Max, no confusing "display" field */}
              <div className="space-y-2">
                <Label className="font-semibold">Budget / Compensation (₹)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <IndianRupee size={11} /> Min amount
                    </p>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 5000"
                      value={form.budgetMin}
                      onChange={e => setForm({ ...form, budgetMin: e.target.value })}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <IndianRupee size={11} /> Max amount
                    </p>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 10000"
                      value={form.budgetMax}
                      onChange={e => setForm({ ...form, budgetMax: e.target.value })}
                    />
                  </div>
                </div>
                {(form.budgetMin || form.budgetMax) && (
                  <p className="text-xs text-primary font-medium">
                    Budget shown to freelancers:{" "}
                    {form.budgetMin && form.budgetMax
                      ? `₹${Number(form.budgetMin).toLocaleString("en-IN")} – ₹${Number(form.budgetMax).toLocaleString("en-IN")}`
                      : form.budgetMin
                      ? `From ₹${Number(form.budgetMin).toLocaleString("en-IN")}`
                      : `Up to ₹${Number(form.budgetMax).toLocaleString("en-IN")}`}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Leave blank if you prefer to discuss compensation or offer equity.
                </p>
              </div>

              {/* Timeline + Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Timeline</Label>
                  <Input
                    placeholder="e.g. 2 weeks, 1 month"
                    value={form.timeline}
                    onChange={e => setForm({ ...form, timeline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <Input
                    placeholder="e.g. Amritsar, Punjab"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting
                  ? <><Loader2 size={16} className="animate-spin mr-2" /> Posting…</>
                  : "Post Task"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PostProblem;
