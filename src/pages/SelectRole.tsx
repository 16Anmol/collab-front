import { useState }    from "react";
import { useNavigate } from "react-router-dom";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Textarea }    from "@/components/ui/textarea";
import { Label }       from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Rocket, Briefcase, ArrowLeft, ArrowRight,
  Check, Loader2, LogOut
} from "lucide-react";
import { useToast }    from "@/hooks/use-toast";
import TagInput        from "@/components/TagInput";
import { profileApi }  from "@/lib/api";
import { useAuth }     from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STARTUP_TAGS = [
  "SaaS","Fintech","Healthtech","Edtech","AI/ML","E-commerce",
  "Marketplace","B2B","B2C","Social","Crypto","Climate","Gaming",
  "Developer Tools","Hardware","Logistics","Real Estate","Food & Beverage",
];

const FREELANCER_TAGS = [
  "React","Node.js","Python","UI/UX Design","TypeScript","Flutter",
  "iOS","Android","Machine Learning","DevOps","Data Science","Figma",
  "Copywriting","Marketing","SEO","Graphic Design","Video Editing",
  "Product Management","Blockchain","AWS",
];

type Role = "startup" | "freelancer" | null;

const SelectRole = () => {
  const navigate          = useNavigate();
  const { toast }         = useToast();
  const { user, signOut, refreshProfile } = useAuth();

  const [step,       setStep]       = useState(1);
  const [role,       setRole]       = useState<Role>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const [startup, setStartup] = useState({
    startupName: "", industry: "", description: "",
    fundingStage: "", website: "", location: "", tags: [] as string[],
  });

  const [freelancer, setFreelancer] = useState({
    bio: "", experience: "", portfolioLink: "",
    hourlyRate: "", skills: [] as string[], tags: [] as string[],
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await profileApi.setRole(role!);

      if (role === "startup") {
        if (!startup.startupName.trim()) {
          toast({ title: "Startup name is required", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        await profileApi.saveStartup({
          startupName:  startup.startupName.trim(),
          industry:     startup.industry,
          description:  startup.description,
          fundingStage: startup.fundingStage,
          website:      startup.website,
          location:     startup.location,
          tags:         startup.tags,
        });
      } else {
        if (!freelancer.skills.length) {
          toast({ title: "Add at least one skill", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        await profileApi.saveFreelancer({
          skills:       freelancer.skills,
          bio:          freelancer.bio,
          experience:   freelancer.experience,
          portfolioLink: freelancer.portfolioLink,
          hourlyRate:   freelancer.hourlyRate ? parseFloat(freelancer.hourlyRate) : undefined,
          tags:         freelancer.tags,
        });
      }

      await refreshProfile();
      toast({ title: "Profile created! Welcome to CoHustle 🎉" });
      navigate(role === "startup" ? "/startup/dashboard" : "/freelancer/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header: welcome + sign-out option */}
        <div className="mb-8 flex items-center justify-between">
          <div className="text-center flex-1">
            {user?.avatar && (
              <img src={user.avatar} alt="" className="mx-auto mb-3 h-14 w-14 rounded-full object-cover" />
            )}
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>

        {/* Step progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check size={15} /> : s}
              </div>
              {s < 2 && (
                <div className={`h-0.5 w-10 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Choose role ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">How will you use CoHustle?</h1>
            <p className="mt-2 text-muted-foreground">Choose your role — this shapes your dashboard and features.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${role === "startup" ? "ring-2 ring-primary shadow-md" : ""}`}
                onClick={() => setRole("startup")}
              >
                <CardContent className="flex flex-col items-center gap-3 p-8">
                  <div className={`rounded-full p-4 ${role === "startup" ? "bg-primary/10" : "bg-muted"}`}>
                    <Rocket className={`h-10 w-10 ${role === "startup" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">I'm a Startup</h2>
                  <p className="text-sm text-muted-foreground text-center">Post problems, find collaborators, build your vision</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${role === "freelancer" ? "ring-2 ring-primary shadow-md" : ""}`}
                onClick={() => setRole("freelancer")}
              >
                <CardContent className="flex flex-col items-center gap-3 p-8">
                  <div className={`rounded-full p-4 ${role === "freelancer" ? "bg-primary/10" : "bg-muted"}`}>
                    <Briefcase className={`h-10 w-10 ${role === "freelancer" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">I'm a Freelancer</h2>
                  <p className="text-sm text-muted-foreground text-center">Work on real problems, collaborate with startups</p>
                </CardContent>
              </Card>
            </div>
            <Button className="mt-8" size="lg" disabled={!role} onClick={() => setStep(2)}>
              Continue <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ── Step 2a: Startup profile form ───────────────────────────── */}
        {step === 2 && role === "startup" && (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Set Up Your Startup</h2>
              <p className="text-sm text-muted-foreground mb-6">Tell freelancers about your startup so they can find and apply to your problems.</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Startup Name *</Label>
                  <Input
                    placeholder="e.g. CoHustle Labs"
                    value={startup.startupName}
                    onChange={e => setStartup({ ...startup, startupName: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input placeholder="e.g. SaaS, Fintech" value={startup.industry} onChange={e => setStartup({ ...startup, industry: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Funding Stage</Label>
                    <Input placeholder="e.g. Pre-seed, Seed" value={startup.fundingStage} onChange={e => setStartup({ ...startup, fundingStage: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="What does your startup do?" value={startup.description} onChange={e => setStartup({ ...startup, description: e.target.value })} rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input type="url" placeholder="https://yourstartup.com" value={startup.website} onChange={e => setStartup({ ...startup, website: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input placeholder="e.g. Bangalore, India" value={startup.location} onChange={e => setStartup({ ...startup, location: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Domain Tags <span className="text-muted-foreground text-xs">(helps freelancers find you)</span></Label>
                  <TagInput tags={startup.tags} onChange={tags => setStartup({ ...startup, tags })} suggestions={STARTUP_TAGS} placeholder="e.g. SaaS, AI/ML, Fintech" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} className="mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={!startup.startupName.trim() || submitting} onClick={handleSubmit}>
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin mr-2" />Creating profile…</>
                    : <><Check size={14} className="mr-1" />Complete Setup</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2b: Freelancer profile form ────────────────────────── */}
        {step === 2 && role === "freelancer" && (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Set Up Your Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">Show startups what you're great at so they can find and hire you.</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Skills * <span className="text-muted-foreground text-xs">(what you can build/design/do)</span></Label>
                  <TagInput tags={freelancer.skills} onChange={skills => setFreelancer({ ...freelancer, skills })} suggestions={FREELANCER_TAGS} placeholder="e.g. React, Python, UI Design" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea placeholder="Tell startups a little about yourself…" value={freelancer.bio} onChange={e => setFreelancer({ ...freelancer, bio: e.target.value })} rows={3} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Experience</Label>
                    <Input placeholder="e.g. 3 years in web dev" value={freelancer.experience} onChange={e => setFreelancer({ ...freelancer, experience: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate (₹)</Label>
                    <Input type="number" placeholder="e.g. 1500" value={freelancer.hourlyRate} onChange={e => setFreelancer({ ...freelancer, hourlyRate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Portfolio Link</Label>
                  <Input type="url" placeholder="https://yourportfolio.com" value={freelancer.portfolioLink} onChange={e => setFreelancer({ ...freelancer, portfolioLink: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Interest Tags <span className="text-muted-foreground text-xs">(for matching with startups)</span></Label>
                  <TagInput tags={freelancer.tags} onChange={tags => setFreelancer({ ...freelancer, tags })} suggestions={FREELANCER_TAGS} placeholder="e.g. AI/ML, Frontend, Mobile" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} className="mr-1" /> Back
                </Button>
                <Button className="flex-1" disabled={!freelancer.skills.length || submitting} onClick={handleSubmit}>
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin mr-2" />Creating profile…</>
                    : <><Check size={14} className="mr-1" />Complete Setup</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Logout confirmation */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You haven't set up your profile yet. You'll need to sign in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SelectRole;
