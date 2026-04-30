import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";

const STEPS = [
  { id: 1, label: "Your Skills",   icon: User },
  { id: 2, label: "Verification",  icon: Shield },
];

const Field = ({ label, required, hint, children }: any) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
    {children}
  </div>
);

const DriveInput = ({ value, onChange, placeholder }: any) => (
  <div className="relative">
    <Input
      type="url" value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "https://drive.google.com/..."}
      className="pr-10"
    />
    {value && (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800">
        <ExternalLink size={15}/>
      </a>
    )}
  </div>
);

const FreelancerOnboarding = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    skills: "", experience: "", bio: "", portfolioLink: "",
    githubLink: "", linkedinLink: "", hourlyRate: "", location: "", availability: "",
    identityProof: "", resumeLink: "",
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  const handleSubmit = async () => {
    if (!form.skills.trim()) {
      toast({ title: "Skills are required", variant: "destructive" }); return;
    }
    if (!form.identityProof.trim()) {
      toast({ title: "Identity proof is required", description: "Please upload a Google Drive link for your ID proof.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await profileApi.saveFreelancer({
        skills:        form.skills.split(",").map(s => s.trim()).filter(Boolean),
        experience:    form.experience,
        bio:           form.bio,
        portfolioLink: form.portfolioLink || undefined,
        githubLink:    form.githubLink || undefined,
        linkedinLink:  form.linkedinLink || undefined,
        hourlyRate:    form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        location:      form.location,
        availability:  form.availability,
        identityProof: form.identityProof,
        resumeLink:    form.resumeLink || undefined,
      });
      await refreshProfile();
      navigate("/freelancer/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-700 text-white mb-4 shadow-lg">
            <User size={26}/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Set Up Your Freelancer Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Build your professional presence on CoHustle</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                step === s.id ? "bg-purple-700 text-white shadow" :
                step > s.id ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"
              }`}>
                <s.icon size={14}/>{s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300"/>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Skills" required hint="Comma-separated. e.g. React, UI Design, Python, Content Writing">
                <Input value={form.skills} onChange={set("skills")} placeholder="React, Node.js, Figma..." autoFocus/>
              </Field>
              <Field label="Professional Bio" hint="2-3 sentences about your work and expertise">
                <textarea
                  value={form.bio} onChange={set("bio")}
                  rows={3} placeholder="I'm a full-stack developer with 3 years of experience..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Experience">
                  <Input value={form.experience} onChange={set("experience")} placeholder="3 years, Fresher..."/>
                </Field>
                <Field label="Hourly Rate (₹)">
                  <Input type="number" value={form.hourlyRate} onChange={set("hourlyRate")} placeholder="500"/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Location">
                  <Input value={form.location} onChange={set("location")} placeholder="Mumbai, Remote..."/>
                </Field>
                <Field label="Availability">
                  <Input value={form.availability} onChange={set("availability")} placeholder="Full-time, Weekends..."/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="GitHub">
                  <Input type="url" value={form.githubLink} onChange={set("githubLink")} placeholder="https://github.com/..."/>
                </Field>
                <Field label="LinkedIn">
                  <Input type="url" value={form.linkedinLink} onChange={set("linkedinLink")} placeholder="https://linkedin.com/in/..."/>
                </Field>
              </div>
              <Field label="Portfolio">
                <Input type="url" value={form.portfolioLink} onChange={set("portfolioLink")} placeholder="https://yourportfolio.com"/>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
                <p className="font-semibold mb-1">🔒 Why we ask for documents</p>
                <p className="text-purple-700">Startups want to know who they're working with. A verified profile gets significantly more responses and builds instant credibility.</p>
              </div>

              <Field
                label="Identity Proof"
                required
                hint="Aadhaar card, PAN card, Passport, or any government-issued photo ID. Upload to Google Drive and paste the shareable link."
              >
                <DriveInput value={form.identityProof} onChange={set("identityProof")}/>
              </Field>

              <Field
                label="Resume / CV"
                hint="Your professional resume in PDF format. Upload to Google Drive."
              >
                <DriveInput value={form.resumeLink} onChange={set("resumeLink")} placeholder="https://drive.google.com/..."/>
              </Field>

              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 border border-gray-100">
                <p className="font-medium text-gray-600 mb-1">How to share a Google Drive link:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Upload your document to Google Drive</li>
                  <li>Right-click → Share → "Anyone with the link" → Viewer</li>
                  <li>Copy link and paste it above</li>
                </ol>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
                <ChevronLeft size={15}/> Back
              </button>
            ) : <div/>}
            {step < STEPS.length ? (
              <button onClick={() => {
                if (!form.skills.trim()) { toast({ title: "Skills are required", variant: "destructive" }); return; }
                setStep(s => s + 1);
              }} className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold">
                Next <ChevronRight size={15}/>
              </button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}
                className="bg-purple-700 hover:bg-purple-800 text-white px-8">
                {submitting ? "Saving..." : "Complete Setup →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerOnboarding;
