import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Send, ChevronRight, ChevronLeft,
  Building2, Lightbulb, Handshake, Link2, Check
} from "lucide-react";
import TagInput   from "@/components/TagInput";
import { collabPitchesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, label: "Your Startup",    icon: Building2,  desc: "Tell them who you are" },
  { id: 2, label: "Your Offering",   icon: Lightbulb,  desc: "What you bring to the table" },
  { id: 3, label: "Collaboration",   icon: Handshake,  desc: "Why this is a great fit" },
  { id: 4, label: "Links & Confirm", icon: Link2,      desc: "Finish & send pitch" },
];

const SECTORS = [
  "SaaS","Fintech","Healthtech","Edtech","AI/ML","E-commerce",
  "Marketplace","B2B","B2C","Gaming","Climate","Developer Tools",
  "Logistics","Real Estate","Food & Beverage","Social","Crypto","Hardware",
];

const STAGES = ["Idea","Pre-MVP","MVP","Beta","Launched","Revenue-generating","Series A+"];

interface Props {
  open: boolean;
  recipientId: string;
  recipientName: string;
  postTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PitchDialog = ({
  open, recipientId, recipientName, postTitle, onClose, onSuccess,
}: Props) => {
  const { toast }     = useToast();
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    // Step 1 — your startup
    startupName:   "",
    sector:        "",
    stage:         "",
    teamSize:      "",
    location:      "",
    tagline:       "",      // one-line value prop

    // Step 2 — what you offer
    whatYouOffer:  "",      // skills / resources / tech / network you bring
    pastWins:      "",      // key achievements / traction
    yourTech:      [] as string[],

    // Step 3 — collaboration specifics
    collabGoal:    "",      // what you want to achieve together
    yourAsk:       "",      // what you need from them
    timeline:      "",      // how long you want to collaborate
    collabType:    "",      // co-build / revenue-share / integration / partnership

    // Step 4 — links
    website:       "",
    linkedin:      "",
    demoLink:      "",
  });

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Validation per step
  const stepValid = () => {
    if (step === 1) return !!(form.startupName.trim() && form.sector && form.stage && form.tagline.trim());
    if (step === 2) return !!(form.whatYouOffer.trim());
    if (step === 3) return !!(form.collabGoal.trim() && form.collabType);
    return true;
  };

  const buildPitchMessage = () => `
🚀 **Startup Collaboration Pitch from ${form.startupName}**

**About us**
${form.tagline}
Sector: ${form.sector} · Stage: ${form.stage} · Team: ${form.teamSize || "–"} · Location: ${form.location || "–"}

**What we bring to the table**
${form.whatYouOffer}
${form.yourTech.length ? `\nSkills/Tech: ${form.yourTech.join(", ")}` : ""}
${form.pastWins ? `\nKey wins: ${form.pastWins}` : ""}

**Why let's collaborate**
Goal: ${form.collabGoal}
Type: ${form.collabType}${form.timeline ? ` · Timeline: ${form.timeline}` : ""}
What we need: ${form.yourAsk || "Open to discussion"}

${form.website || form.linkedin || form.demoLink
  ? `**Links**${form.website ? `\nWebsite: ${form.website}` : ""}${form.linkedin ? `\nLinkedIn: ${form.linkedin}` : ""}${form.demoLink ? `\nDemo: ${form.demoLink}` : ""}`
  : ""}

Pitching about your post: "${postTitle}"
`.trim();

  const handleSend = async () => {
    if (!form.collabGoal.trim() || !form.collabType) {
      toast({ title: "Please complete Step 3 first", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await collabPitchesApi.submit({
        collabRequestId: recipientId, // recipientId is the collabRequestId
        startupName:   form.startupName,
        tagline:       form.tagline,
        sector:        form.sector,
        stage:         form.stage,
        teamSize:      form.teamSize,
        location:      form.location,
        whatYouOffer:  form.whatYouOffer,
        yourTech:      form.yourTech,
        pastWins:      form.pastWins,
        collabGoal:    form.collabGoal,
        collabType:    form.collabType,
        yourAsk:       form.yourAsk,
        timeline:      form.timeline,
        website:       form.website,
        linkedin:      form.linkedin,
        demoLink:      form.demoLink,
      });
      toast({ title: "Pitch submitted! 🚀", description: `${recipientName} will review your pitch and connect with you.` });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Could not send pitch", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const TECH_OPTIONS = [
    "React","Node.js","Python","AI/ML","Flutter","iOS","Android","AWS","GCP",
    "Blockchain","Data Science","DevOps","UI/UX","Mobile","Web","API","SaaS","Payments",
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-r from-green-50 to-green-50">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Pitch to {recipientName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            Regarding: <span className="font-medium text-foreground">"{postTitle}"</span>
          </DialogDescription>

          {/* Step progress */}
          <div className="flex items-center gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s.id ? <Check size={12}/> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 transition-all ${step > s.id ? "bg-primary" : "bg-muted"}`}/>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step} of 4 — <strong className="text-foreground">{STEPS[step-1].label}</strong>: {STEPS[step-1].desc}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Step 1: Your Startup ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label>Startup name *</Label>
                <Input placeholder="e.g. CoHustle Labs" value={form.startupName} onChange={e => set("startupName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>One-line tagline / value proposition *</Label>
                <Input placeholder="e.g. We help startups find talent 10x faster" value={form.tagline} onChange={e => set("tagline", e.target.value)} maxLength={100} />
                <p className="text-xs text-muted-foreground text-right">{form.tagline.length}/100</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sector *</Label>
                  <Select value={form.sector} onValueChange={v => set("sector", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stage *</Label>
                  <Select value={form.stage} onValueChange={v => set("stage", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Team size</Label>
                  <Select value={form.teamSize} onValueChange={v => set("teamSize", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["Solo founder","2–5","6–15","16–50","50+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Amritsar, Punjab" value={form.location} onChange={e => set("location", e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: What you offer ───────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>What do you bring to the table? *</Label>
                <Textarea
                  placeholder="Describe your skills, technology, resources, distribution, network, or anything valuable you can offer. Be specific — this is your pitch."
                  rows={5}
                  value={form.whatYouOffer}
                  onChange={e => set("whatYouOffer", e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.whatYouOffer.length} chars {form.whatYouOffer.length < 80 ? "— add more detail" : "✓"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Technologies / Skills <span className="text-xs text-muted-foreground font-normal">(select all that apply)</span></Label>
                <TagInput tags={form.yourTech} onChange={v => set("yourTech", v)} suggestions={TECH_OPTIONS} placeholder="Add tech or skills…" />
              </div>
              <div className="space-y-1.5">
                <Label>Key achievements / traction <span className="text-xs text-muted-foreground font-normal">(optional but compelling)</span></Label>
                <Textarea
                  placeholder="e.g. 500 beta users, ₹5L ARR, 3 enterprise pilots, award winner, etc."
                  rows={3}
                  value={form.pastWins}
                  onChange={e => set("pastWins", e.target.value)}
                  className="resize-none"
                />
              </div>
            </>
          )}

          {/* ── Step 3: Collaboration specifics ─────────────────────────── */}
          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <Label>Type of collaboration *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "Co-build product",    emoji: "🔨" },
                    { value: "Revenue sharing",     emoji: "💰" },
                    { value: "Integration / API",   emoji: "🔌" },
                    { value: "Sales partnership",   emoji: "🤝" },
                    { value: "Customer referrals",  emoji: "📢" },
                    { value: "Mentorship / Advice", emoji: "🎓" },
                    { value: "Investment / Funding", emoji: "💼" },
                    { value: "Open to explore",     emoji: "🌱" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => set("collabType", opt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                        form.collabType === opt.value
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "bg-background border-border text-foreground hover:bg-accent hover:border-primary/30"
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span className="text-xs leading-tight">{opt.value}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What do you want to achieve together? *</Label>
                <Textarea
                  placeholder="Describe the joint goal — what would success look like in 3–6 months?"
                  rows={3}
                  value={form.collabGoal}
                  onChange={e => set("collabGoal", e.target.value)}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>What do you need from them?</Label>
                  <Input placeholder="e.g. Design help, distribution…" value={form.yourAsk} onChange={e => set("yourAsk", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected timeline</Label>
                  <Select value={form.timeline} onValueChange={v => set("timeline", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {["1–4 weeks","1–3 months","3–6 months","6–12 months","Long-term","Flexible"].map(s =>
                        <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── Step 4: Links & confirm ──────────────────────────────────── */}
          {step === 4 && (
            <>
              <div className="rounded-xl bg-muted/50 p-4 space-y-1 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pitch summary</p>
                <p className="text-sm font-semibold text-foreground">{form.startupName}</p>
                <p className="text-xs text-muted-foreground">{form.tagline}</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  <Badge variant="secondary">{form.sector}</Badge>
                  <Badge variant="secondary">{form.stage}</Badge>
                  {form.teamSize && <Badge variant="secondary">{form.teamSize}</Badge>}
                  <Badge variant="outline" className="text-primary border-primary/30">{form.collabType}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Link2 size={13}/> Website <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input type="url" placeholder="https://yourstartup.com" value={form.website} onChange={e => set("website", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn / Company page <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input type="url" placeholder="https://linkedin.com/company/…" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Demo / Deck link <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input type="url" placeholder="https://demo.yourstartup.com" value={form.demoLink} onChange={e => set("demoLink", e.target.value)} />
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2 mt-2">
                <Send size={14} className="text-primary flex-shrink-0 mt-0.5"/>
                <p className="text-xs text-primary">
                  Your pitch will be sent as a message to <strong>{recipientName}</strong>. They can reply in the Messages section.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            disabled={sending}
          >
            <ChevronLeft size={15} className="mr-1"/> {step > 1 ? "Back" : "Cancel"}
          </Button>

          {step < 4 ? (
            <Button
              size="sm"
              disabled={!stepValid()}
              onClick={() => setStep(s => s + 1)}
            >
              Next <ChevronRight size={15} className="ml-1"/>
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={sending}
              onClick={handleSend}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {sending
                ? <><Loader2 size={13} className="animate-spin"/> Sending…</>
                : <><Send size={13}/> Send Pitch</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PitchDialog;
