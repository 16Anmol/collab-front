import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Send, Loader2, FileText, Github, Linkedin,
  AlertCircle, Globe, ExternalLink, Check,
} from "lucide-react";
import { problemsApi, type Problem } from "@/lib/api";
import { useToast }  from "@/hooks/use-toast";
import TagInput      from "@/components/TagInput";

const ALL_SKILLS = [
  "React","Node.js","Python","TypeScript","Flutter","iOS","Android",
  "UI/UX Design","Figma","Machine Learning","DevOps","Data Science",
  "Copywriting","Marketing","SEO","Graphic Design","Video Editing",
  "Product Management","Blockchain","AWS","FastAPI","Next.js",
  "Photography","Animation","3D Modelling","Music Production",
];

// Validates a URL and returns whether it's a proper link
const isValidUrl = (url: string) => {
  if (!url.trim()) return true; // empty is fine (optional)
  try { new URL(url); return true; } catch { return false; }
};

// Ensure URL has http/https prefix before opening
const openLink = (url: string) => {
  if (!url) return;
  const full = url.startsWith("http") ? url : `https://${url}`;
  window.open(full, "_blank", "noopener,noreferrer");
};

interface Props {
  problem: Problem;
  open: boolean;
  onClose: () => void;
  onSuccess: (problemId: string) => void;
  existingSkills?: string[];
  existingPortfolio?: string;
  existingGithub?: string;
  existingLinkedin?: string;
}

const ApplyDialog = ({
  problem, open, onClose, onSuccess,
  existingSkills = [], existingPortfolio = "",
  existingGithub = "", existingLinkedin = "",
}: Props) => {
  const { toast }      = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pitch:            "",
    skills:           existingSkills,
    pastProjects:     "",
    // ── Links section ──────────────────────────────────────────────
    resumeLink:       "",      // mandatory — Google Drive PDF
    githubLink:       existingGithub,   // optional
    linkedinLink:     existingLinkedin, // optional
    portfolioLink:    existingPortfolio, // optional — any website/portfolio
    otherLink:        "",               // optional — Instagram, Behance, Dribbble, etc.
    otherLinkLabel:   "",               // e.g. "Behance", "Instagram", "YouTube"
    // ── Proposal terms ─────────────────────────────────────────────
    deliveryTimeline: "",
    expectedBudget:   "",
  });

  const handleSubmit = async () => {
    if (!form.pitch.trim()) {
      toast({ title: "Pitch is required", description: "Tell the startup how you'll solve this task.", variant: "destructive" });
      return;
    }
    if (!form.resumeLink.trim()) {
      toast({ title: "Resume link is required", description: "Please share your CV/Resume as a Google Drive link.", variant: "destructive" });
      return;
    }
    if (!isValidUrl(form.resumeLink)) {
      toast({ title: "Invalid resume link", description: "Please enter a valid URL (e.g. https://drive.google.com/…)", variant: "destructive" });
      return;
    }
    if (!form.deliveryTimeline) {
      toast({ title: "Please select a delivery timeline", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await problemsApi.apply(problem._id, {
        pitch:            form.pitch.trim(),
        coverNote:        form.pitch.trim(),
        skills:           form.skills,
        pastProjects:     form.pastProjects.trim(),
        resumeLink:       form.resumeLink.trim(),
        githubLink:       form.githubLink.trim(),
        linkedinLink:     form.linkedinLink.trim(),
        portfolioLink:    form.portfolioLink.trim() || form.otherLink.trim(),
        deliveryTimeline: form.deliveryTimeline,
        expectedBudget:   form.expectedBudget.trim(),
      });
      toast({ title: "Application submitted! 🎉", description: "The startup will review your proposal." });
      onSuccess(problem._id);
      onClose();
    } catch (err: any) {
      toast({ title: "Could not apply", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // Helper: show green tick if field has valid content
  const ValidTick = ({ value }: { value: string }) =>
    value.trim() && isValidUrl(value)
      ? <Check size={13} className="text-emerald-500 flex-shrink-0" />
      : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Apply: {problem.title}</DialogTitle>
          <DialogDescription>
            Fill in your proposal. Fields marked * are mandatory.
            {problem.budget && (
              <span className="ml-2 font-medium text-primary">Budget: {problem.budget}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* ── 1. Pitch ──────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">
              Your Solution / Pitch *
            </Label>
            <Textarea
              placeholder={`How would you solve "${problem.title}"? Describe your approach, methodology, and what makes you the right person for this task…`}
              rows={5}
              value={form.pitch}
              onChange={e => setForm({ ...form, pitch: e.target.value })}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle size={11}/> Required — be specific about your approach
              </span>
              <span className={`text-xs ${form.pitch.length >= 100 ? "text-emerald-600" : "text-muted-foreground"}`}>
                {form.pitch.length} chars {form.pitch.length < 100 ? "— aim for 100+" : "✓"}
              </span>
            </div>
          </div>

          {/* ── 2. Skills ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm">Skills you'll bring to this project</Label>
            <TagInput
              tags={form.skills}
              onChange={skills => setForm({ ...form, skills })}
              suggestions={ALL_SKILLS}
              placeholder="Add skills relevant to this problem…"
            />
          </div>

          {/* ── 3. Past projects ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm">Past projects / experience</Label>
            <Textarea
              placeholder="Describe 1-2 similar projects you've completed. What did you build? What was the outcome?"
              rows={3}
              value={form.pastProjects}
              onChange={e => setForm({ ...form, pastProjects: e.target.value })}
              className="resize-none"
            />
          </div>

          {/* ── 4. Links section ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ExternalLink size={14} className="text-primary" /> Your Links & Profiles
            </p>

            {/* Resume / CV — mandatory */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileText size={13} className="text-blue-500" />
                Resume / CV *
                <span className="text-[10px] font-normal text-muted-foreground">(Google Drive, Dropbox, or any public PDF link)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/file/d/your-cv-link"
                  value={form.resumeLink}
                  onChange={e => setForm({ ...form, resumeLink: e.target.value })}
                  className={`flex-1 ${!form.resumeLink ? "border-amber-200 focus-visible:ring-amber-300" : ""}`}
                />
                {form.resumeLink && isValidUrl(form.resumeLink) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openLink(form.resumeLink)}
                    className="flex-shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <ExternalLink size={13} /> Test
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle size={9} className="text-amber-400" />
                Make sure the link is set to "Anyone with the link can view" — not restricted.
              </p>
            </div>

            {/* GitHub — optional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Github size={13} />
                GitHub Profile
                <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="https://github.com/yourusername"
                  value={form.githubLink}
                  onChange={e => setForm({ ...form, githubLink: e.target.value })}
                  className="flex-1"
                />
                <ValidTick value={form.githubLink} />
                {form.githubLink && isValidUrl(form.githubLink) && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => openLink(form.githubLink)} className="text-gray-500 hover:text-gray-700 p-1.5">
                    <ExternalLink size={13} />
                  </Button>
                )}
              </div>
            </div>

            {/* LinkedIn — optional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Linkedin size={13} className="text-sky-600" />
                LinkedIn Profile
                <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={form.linkedinLink}
                  onChange={e => setForm({ ...form, linkedinLink: e.target.value })}
                  className="flex-1"
                />
                <ValidTick value={form.linkedinLink} />
                {form.linkedinLink && isValidUrl(form.linkedinLink) && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => openLink(form.linkedinLink)} className="text-sky-500 hover:text-sky-700 p-1.5">
                    <ExternalLink size={13} />
                  </Button>
                )}
              </div>
            </div>

            {/* Portfolio website — optional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Globe size={13} className="text-green-700" />
                Portfolio / Website
                <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="https://yourportfolio.com or behance.net/you"
                  value={form.portfolioLink}
                  onChange={e => setForm({ ...form, portfolioLink: e.target.value })}
                  className="flex-1"
                />
                <ValidTick value={form.portfolioLink} />
                {form.portfolioLink && isValidUrl(form.portfolioLink) && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => openLink(form.portfolioLink)} className="text-green-700 hover:text-purple-700 p-1.5">
                    <ExternalLink size={13} />
                  </Button>
                )}
              </div>
            </div>

            {/* Other social / work link — optional (Instagram, Behance, YouTube, etc.) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Globe size={13} className="text-rose-400" />
                Other link
                <span className="text-[10px] font-normal text-muted-foreground">(Instagram, Behance, YouTube, Dribbble, etc. — optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Platform name (e.g. Instagram)"
                  value={form.otherLinkLabel}
                  onChange={e => setForm({ ...form, otherLinkLabel: e.target.value })}
                  className="w-36 flex-shrink-0"
                />
                <div className="flex gap-1.5 items-center flex-1">
                  <Input
                    type="url"
                    placeholder="https://instagram.com/youraccount"
                    value={form.otherLink}
                    onChange={e => setForm({ ...form, otherLink: e.target.value })}
                    className="flex-1"
                  />
                  <ValidTick value={form.otherLink} />
                  {form.otherLink && isValidUrl(form.otherLink) && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => openLink(form.otherLink)} className="text-rose-400 hover:text-rose-600 p-1.5">
                      <ExternalLink size={13} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Timeline + compensation ────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">How long will you take? *</Label>
              <Select value={form.deliveryTimeline} onValueChange={v => setForm({ ...form, deliveryTimeline: v })}>
                <SelectTrigger><SelectValue placeholder="Select timeline…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Less than 1 week">Less than 1 week</SelectItem>
                  <SelectItem value="1–2 weeks">1–2 weeks</SelectItem>
                  <SelectItem value="2–4 weeks">2–4 weeks</SelectItem>
                  <SelectItem value="1–2 months">1–2 months</SelectItem>
                  <SelectItem value="2–3 months">2–3 months</SelectItem>
                  <SelectItem value="Flexible / Open to discuss">Flexible / Open to discuss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Your expected compensation</Label>
              <Input
                placeholder={problem.budget ? `Budget: ${problem.budget}` : "e.g. ₹15,000 or Equity"}
                value={form.expectedBudget}
                onChange={e => setForm({ ...form, expectedBudget: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin mr-2"/>Submitting…</>
              : <><Send size={14} className="mr-2"/>Submit Application</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyDialog;
