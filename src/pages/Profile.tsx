import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import TagInput from "@/components/TagInput";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/lib/api";

const DriveInput = ({ label, hint, value, onChange, required }: any) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
    <div className="relative">
      <Input
        type="url" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://drive.google.com/..."
        className="pr-10"
      />
      {value && (
        <a href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank" rel="noopener noreferrer"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary hover:opacity-80">
          <ExternalLink size={14}/>
        </a>
      )}
    </div>
  </div>
);

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [startupData, setStartupData] = useState({
    startupName: "", industry: "", description: "", fundingStage: "",
    website: "", location: "", teamSize: "", linkedinPage: "", tags: [] as string[],
    companyDocument: "", identityProof: "", pitchDeck: "",
  });

  const [freelancerData, setFreelancerData] = useState({
    bio: "", experience: "", portfolioLink: "", hourlyRate: 0,
    skills: [] as string[], tags: [] as string[],
    githubLink: "", linkedinLink: "", location: "", availability: "",
    identityProof: "", resumeLink: "",
  });

  useEffect(() => {
    if (profile?.startupProfile) {
      const sp = profile.startupProfile as any;
      setStartupData({
        startupName:     sp.startupName     || "",
        industry:        sp.industry        || "",
        description:     sp.description     || "",
        fundingStage:    sp.fundingStage    || "",
        website:         sp.website         || "",
        location:        sp.location        || "",
        teamSize:        sp.teamSize        || "",
        linkedinPage:    sp.linkedinPage    || "",
        tags:            profile.tags       || [],
        companyDocument: sp.companyDocument || "",
        identityProof:   sp.identityProof   || "",
        pitchDeck:       sp.pitchDeck       || "",
      });
    }
    if (profile?.freelancerProfile) {
      const fp = profile.freelancerProfile as any;
      setFreelancerData({
        bio:           fp.bio           || "",
        experience:    fp.experience    || "",
        portfolioLink: fp.portfolioLink || "",
        hourlyRate:    fp.hourlyRate    || 0,
        skills:        fp.skills        || [],
        tags:          profile.tags     || [],
        githubLink:    fp.githubLink    || "",
        linkedinLink:  fp.linkedinLink  || "",
        location:      fp.location      || "",
        availability:  fp.availability  || "",
        identityProof: fp.identityProof || "",
        resumeLink:    fp.resumeLink    || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profile?.role === "startup") {
        await profileApi.updateStartup(startupData);
      } else if (profile?.role === "freelancer") {
        await profileApi.updateFreelancer(freelancerData);
      }
      await refreshProfile();
      toast({ title: "Profile updated! ✅", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Error saving profile", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Check if docs are missing
  const startupMissingDocs = profile?.role === "startup" && profile?.startupProfile &&
    !(profile.startupProfile as any).identityProof;
  const freelancerMissingDocs = profile?.role === "freelancer" && profile?.freelancerProfile &&
    !(profile.freelancerProfile as any).identityProof;
  const missingDocs = startupMissingDocs || freelancerMissingDocs;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-8">
          {profile?.avatar
            ? <img src={profile.avatar} className="h-16 w-16 rounded-2xl object-cover shadow-sm"/>
            : <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-sm">
                {profile?.fullName?.[0]?.toUpperCase()}
              </div>}
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile?.fullName}</h1>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>

        {/* Document upload notification banner */}
        {missingDocs && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-amber-800">Action Required: Upload Verification Documents</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {profile?.role === "startup"
                  ? "Please upload your Founder Identity Proof and Company Document (Google Drive links) to build trust with freelancers and collaborators."
                  : "Please upload your Identity Proof (Google Drive link) to build trust with startups and get more responses."}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={profile?.fullName || ""} disabled className="bg-muted/40"/>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-muted/40"/>
              </div>
            </CardContent>
          </Card>

          {/* Startup Details */}
          {profile?.role === "startup" && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Startup Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Startup Name</Label>
                    <Input value={startupData.startupName} onChange={e => setStartupData({ ...startupData, startupName: e.target.value })}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Industry</Label>
                      <Input value={startupData.industry} onChange={e => setStartupData({ ...startupData, industry: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Funding Stage</Label>
                      <Input value={startupData.fundingStage} onChange={e => setStartupData({ ...startupData, fundingStage: e.target.value })} placeholder="Pre-seed, Seed..."/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Team Size</Label>
                      <Input value={startupData.teamSize} onChange={e => setStartupData({ ...startupData, teamSize: e.target.value })} placeholder="1-5, 6-20..."/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Location</Label>
                      <Input value={startupData.location} onChange={e => setStartupData({ ...startupData, location: e.target.value })}/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={startupData.description} onChange={e => setStartupData({ ...startupData, description: e.target.value })} rows={3}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input type="url" value={startupData.website} onChange={e => setStartupData({ ...startupData, website: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>LinkedIn Page</Label>
                      <Input type="url" value={startupData.linkedinPage} onChange={e => setStartupData({ ...startupData, linkedinPage: e.target.value })}/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags</Label>
                    <TagInput tags={startupData.tags} onChange={tags => setStartupData({ ...startupData, tags })}/>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Documents */}
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield size={16} className="text-amber-600"/>
                    Verification Documents
                    {!(startupData.identityProof) && (
                      <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Action needed</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DriveInput
                    label="Founder Identity Proof" required
                    hint="Aadhaar, PAN, Passport or any govt-issued photo ID. Upload to Google Drive → Share → Anyone with link → Viewer."
                    value={startupData.identityProof}
                    onChange={(v: string) => setStartupData({ ...startupData, identityProof: v })}
                  />
                  <DriveInput
                    label="Company Document"
                    hint="GST certificate, incorporation cert, MSME registration, or any official startup document."
                    value={startupData.companyDocument}
                    onChange={(v: string) => setStartupData({ ...startupData, companyDocument: v })}
                  />
                  <DriveInput
                    label="Pitch Deck (Optional)"
                    hint="Your startup pitch deck or one-pager."
                    value={startupData.pitchDeck}
                    onChange={(v: string) => setStartupData({ ...startupData, pitchDeck: v })}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Freelancer Details */}
          {profile?.role === "freelancer" && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Freelancer Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Bio</Label>
                    <Textarea value={freelancerData.bio} onChange={e => setFreelancerData({ ...freelancerData, bio: e.target.value })} rows={3}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Experience</Label>
                      <Input value={freelancerData.experience} onChange={e => setFreelancerData({ ...freelancerData, experience: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hourly Rate (₹)</Label>
                      <Input type="number" value={freelancerData.hourlyRate || ""} onChange={e => setFreelancerData({ ...freelancerData, hourlyRate: parseFloat(e.target.value) || 0 })}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Location</Label>
                      <Input value={freelancerData.location} onChange={e => setFreelancerData({ ...freelancerData, location: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Availability</Label>
                      <Input value={freelancerData.availability} onChange={e => setFreelancerData({ ...freelancerData, availability: e.target.value })} placeholder="Full-time, Weekends..."/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>GitHub</Label>
                      <Input type="url" value={freelancerData.githubLink} onChange={e => setFreelancerData({ ...freelancerData, githubLink: e.target.value })}/>
                    </div>
                    <div className="space-y-1.5">
                      <Label>LinkedIn</Label>
                      <Input type="url" value={freelancerData.linkedinLink} onChange={e => setFreelancerData({ ...freelancerData, linkedinLink: e.target.value })}/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Portfolio</Label>
                    <Input type="url" value={freelancerData.portfolioLink} onChange={e => setFreelancerData({ ...freelancerData, portfolioLink: e.target.value })}/>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Skills</Label>
                    <TagInput tags={freelancerData.skills} onChange={skills => setFreelancerData({ ...freelancerData, skills })}/>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Interest Tags</Label>
                    <TagInput tags={freelancerData.tags} onChange={tags => setFreelancerData({ ...freelancerData, tags })}/>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Documents */}
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield size={16} className="text-amber-600"/>
                    Verification Documents
                    {!(freelancerData.identityProof) && (
                      <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Action needed</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DriveInput
                    label="Identity Proof" required
                    hint="Aadhaar, PAN, Passport or any govt-issued photo ID. Upload to Google Drive → Share → Anyone with link → Viewer."
                    value={freelancerData.identityProof}
                    onChange={(v: string) => setFreelancerData({ ...freelancerData, identityProof: v })}
                  />
                  <DriveInput
                    label="Resume / CV"
                    hint="Your professional resume in PDF format. Upload to Google Drive."
                    value={freelancerData.resumeLink}
                    onChange={(v: string) => setFreelancerData({ ...freelancerData, resumeLink: v })}
                  />
                </CardContent>
              </Card>
            </>
          )}

          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={16} className="animate-spin mr-2"/>Saving...</> : <><Save size={16} className="mr-2"/>Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
