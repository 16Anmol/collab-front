import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, Shield, ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";

const STEPS = [
  { id: 1, label: "Startup Info",   icon: Building2 },
  { id: 2, label: "Verification",   icon: Shield },
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
      type="url"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "https://drive.google.com/..."}
      className="pr-10"
    />
    {value && (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-800">
        <ExternalLink size={15}/>
      </a>
    )}
  </div>
);

const StartupOnboarding = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    startupName: "", industry: "", description: "",
    fundingStage: "", website: "", location: "", teamSize: "", linkedinPage: "",
    companyDocument: "", identityProof: "", pitchDeck: "",
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  const handleSubmit = async () => {
    if (!form.startupName.trim()) {
      toast({ title: "Startup name is required", variant: "destructive" }); return;
    }
    if (!form.identityProof.trim()) {
      toast({ title: "Identity proof is required", description: "Please upload a Google Drive link for your ID proof.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await profileApi.saveStartup(form);
      await refreshProfile();
      navigate("/startup/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-white mb-4 shadow-lg">
            <Building2 size={26}/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Set Up Your Startup Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Build trust with freelancers and partners</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                step === s.id ? "bg-green-700 text-white shadow" :
                step > s.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}>
                <s.icon size={14}/>
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300"/>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* ── Step 1: Startup Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Startup Name" required>
                <Input value={form.startupName} onChange={set("startupName")} placeholder="Acme Technologies" autoFocus/>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Industry">
                  <Input value={form.industry} onChange={set("industry")} placeholder="SaaS, FinTech, EdTech..."/>
                </Field>
                <Field label="Funding Stage">
                  <Input value={form.fundingStage} onChange={set("fundingStage")} placeholder="Pre-seed, Seed, Series A"/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Team Size">
                  <Input value={form.teamSize} onChange={set("teamSize")} placeholder="1-5, 6-20, 20+"/>
                </Field>
                <Field label="Location">
                  <Input value={form.location} onChange={set("location")} placeholder="Delhi, Bangalore..."/>
                </Field>
              </div>
              <Field label="Description" hint="What does your startup do? (2-3 sentences)">
                <textarea
                  value={form.description} onChange={set("description")}
                  rows={3} placeholder="We build AI-powered tools that help..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Website">
                  <Input type="url" value={form.website} onChange={set("website")} placeholder="https://yourstartup.com"/>
                </Field>
                <Field label="LinkedIn Page">
                  <Input type="url" value={form.linkedinPage} onChange={set("linkedinPage")} placeholder="https://linkedin.com/company/..."/>
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Verification Documents ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <p className="font-semibold mb-1">🔒 Why we ask for documents</p>
                <p className="text-green-700">Uploading documents builds trust with freelancers and collaborators. All links are private — only verified users can view your profile.</p>
              </div>

              <Field
                label="Company / Startup Document"
                hint="GST certificate, Company incorporation certificate, MSME registration, or any official startup document. Upload to Google Drive and paste the shareable link."
              >
                <DriveInput value={form.companyDocument} onChange={set("companyDocument")}/>
              </Field>

              <Field
                label="Founder Identity Proof"
                required
                hint="Aadhaar card, PAN card, Passport, or any government-issued photo ID. Upload to Google Drive (set access to 'Anyone with the link can view')."
              >
                <DriveInput value={form.identityProof} onChange={set("identityProof")}/>
              </Field>

              <Field
                label="Pitch Deck (Optional)"
                hint="Your startup pitch deck or one-pager. Helps collaborators understand your vision."
              >
                <DriveInput value={form.pitchDeck} onChange={set("pitchDeck")}/>
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

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
                <ChevronLeft size={15}/> Back
              </button>
            ) : <div/>}

            {step < STEPS.length ? (
              <button
                onClick={() => {
                  if (step === 1 && !form.startupName.trim()) {
                    toast({ title: "Startup name is required", variant: "destructive" }); return;
                  }
                  setStep(s => s + 1);
                }}
                className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold"
              >
                Next <ChevronRight size={15}/>
              </button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}
                className="bg-green-700 hover:bg-green-800 text-white px-8">
                {submitting ? "Saving..." : "Complete Setup →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupOnboarding;
