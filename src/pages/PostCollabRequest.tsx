import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import TagInput from "@/components/TagInput";
import Navbar from "@/components/Navbar";
import { collabApi } from "@/lib/api";

const COLLAB_TAGS = [
  "Co-founder", "Technical", "Design", "Marketing", "Sales", "Product",
  "AI/ML", "Mobile", "Web", "Backend", "Frontend", "Full-stack",
  "SaaS", "Fintech", "Healthtech", "Edtech",
];

const PostCollabRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", tags: [] as string[], lookingFor: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.lookingFor) {
      toast({ title: "All required fields must be filled", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await collabApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        lookingFor: form.lookingFor,
        tags: form.tags,
      });
      toast({ title: "Collaboration request posted!" });
      navigate(-1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Find a Collaborator</CardTitle>
            <CardDescription>
              Describe who you're looking for — a co-founder, a startup partner (S2S), a freelancer, mentor, or investor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g. Looking for a technical co-founder"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Looking For *</Label>
                <Select value={form.lookingFor} onValueChange={v => setForm({ ...form, lookingFor: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup Partner (S2S)</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="co-founder">Co-founder</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="What are you building? What kind of person are you looking for? What will they work on?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={form.tags}
                  onChange={tags => setForm({ ...form, tags })}
                  suggestions={COLLAB_TAGS}
                  placeholder="Add relevant tags..."
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!form.lookingFor || submitting}>
                {submitting ? <><Loader2 size={16} className="animate-spin mr-2" />Posting...</> : "Post Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PostCollabRequest;
