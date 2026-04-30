import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ExternalLink, FileText, Clock,
  Briefcase, Star, CheckCircle, XCircle, Loader2, RotateCcw,
  Github, Linkedin, CalendarDays
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import { applicationsApi, type Application } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Ensure URL has proper protocol before opening — prevents routing as a local path
const safeUrl = (url: string) => {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

const statusLabels: Record<string, string> = {
  pending:     "Pending",
  selected:    "Selected 🎉",
  finalised:   "Finalised ✓",
  better_luck: "Better Luck Next Time",
  accepted:    "Accepted",
  rejected:    "Better Luck Next Time",
};
const statusColors: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-800 border-amber-200",
  selected:    "bg-blue-50 text-blue-800 border-blue-200",
  finalised:   "bg-emerald-50 text-emerald-800 border-emerald-300",
  better_luck: "bg-gray-100 text-gray-600 border-gray-200",
  accepted:    "bg-green-100 text-green-800 border-green-200",
  rejected:    "bg-gray-100 text-gray-600 border-gray-200",
};

const StarRating = ({ n }: { n: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} className={i < n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"} />
    ))}
  </div>
);

const ApplicationDetail = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { toast }    = useToast();

  const [app,       setApp]       = useState<Application | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [showUndo,  setShowUndo]  = useState(false);

  useEffect(() => {
    if (!id) return;
    applicationsApi.getById(id)
      .then(setApp)
      .catch(err => toast({ title: "Could not load application", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatus = async (status: "accepted" | "rejected" | "pending") => {
    if (!app) return;
    setUpdating(true);
    try {
      await applicationsApi.updateStatus(app._id, status);
      setApp(prev => prev ? { ...prev, status } : prev);
      toast({ title: status === "pending" ? "Decision undone" : `Application ${status}` });
      if (status !== "pending") setShowUndo(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const isStartup     = user?.role === "startup";
  const isFreelancer  = user?.role === "freelancer";

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    </div>
  );

  if (!app) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="text-center py-32">
        <p className="text-muted-foreground">Application not found.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-10">

        {/* Back button */}
        <Button variant="ghost" className="mb-6 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1.5" /> Back
        </Button>

        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Application for</p>
              <h1 className="text-2xl font-bold text-foreground">{app.problemTitle}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-muted-foreground">By <strong className="text-foreground">{app.applicantName}</strong></span>
                <Badge className={`border ${statusColors[app.status] || statusColors.pending}`}>
                  {statusLabels[app.status] || app.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Startup action buttons */}
            {isStartup && (
              <div className="flex flex-col items-end gap-2">
                {app.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      disabled={updating}
                      onClick={() => handleStatus("accepted")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updating ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle size={14} className="mr-1.5" />}
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      disabled={updating}
                      onClick={() => handleStatus("rejected")}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle size={14} className="mr-1.5" /> Reject
                    </Button>
                  </div>
                )}
                {(app.status === "accepted" || app.status === "rejected") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updating}
                    onClick={() => setShowUndo(true)}
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <RotateCcw size={13} /> Undo decision
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Timeline",    value: app.deliveryTimeline || "Not specified", icon: Clock },
            { label: "Asking",      value: app.expectedBudget   || "Not specified", icon: Briefcase },
            { label: "Skills",      value: app.skills?.length ? `${app.skills.length} skills` : "None listed", icon: Star },
            { label: "Links",       value: [app.portfolioLink, app.resumeLink].filter(Boolean).length + " shared", icon: ExternalLink },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <s.icon size={16} className="mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pitch / solution */}
        {(app as any).pitch && (
          <Card className="mb-5">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText size={15} className="text-primary" /> Pitch / Solution
              </h2>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{(app as any).pitch}</p>
            </CardContent>
          </Card>
        )}

        {/* Cover note */}
        <Card className="mb-5">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText size={15} className="text-primary" /> Cover Note
            </h2>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {app.coverNote || <span className="text-muted-foreground italic">No cover note provided.</span>}
            </p>
          </CardContent>
        </Card>

        {/* Skills */}
        {app.skills && app.skills.length > 0 && (
          <Card className="mb-5">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {app.skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-sm px-3 py-1">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past projects */}
        {app.pastProjects && (
          <Card className="mb-5">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Past Projects & Experience</h2>
              <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{app.pastProjects}</p>
            </CardContent>
          </Card>
        )}

        {/* Links */}
        {(app.portfolioLink || app.resumeLink || (app as any).githubLink || (app as any).linkedinLink) && (
          <Card className="mb-5">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Shared Links</h2>
              <div className="space-y-3">
                {(app as any).githubLink && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Github size={11}/> GitHub</p>
                      <p className="text-sm text-foreground truncate max-w-xs">{(app as any).githubLink}</p>
                    </div>
                    <a href={safeUrl((app as any).githubLink || "")} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink size={13}/> Open</Button>
                    </a>
                  </div>
                )}
                {(app as any).linkedinLink && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 border border-sky-100">
                    <div>
                      <p className="text-xs text-sky-600 flex items-center gap-1"><Linkedin size={11}/> LinkedIn</p>
                      <p className="text-sm text-foreground truncate max-w-xs">{(app as any).linkedinLink}</p>
                    </div>
                    <a href={safeUrl((app as any).linkedinLink || "")} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"><ExternalLink size={13}/> Open</Button>
                    </a>
                  </div>
                )}
                {app.portfolioLink && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-xs text-muted-foreground">Portfolio</p>
                      <p className="text-sm text-foreground truncate max-w-xs">{app.portfolioLink}</p>
                    </div>
                    <a href={safeUrl(app.portfolioLink || "")} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink size={13}/> Open</Button>
                    </a>
                  </div>
                )}
                {app.resumeLink && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Resume / CV</p>
                      <p className="text-sm text-foreground truncate max-w-xs">{app.resumeLink}</p>
                    </div>
                    <a
                      href={safeUrl(app.resumeLink || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                        <FileText size={13} /> View CV
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery details */}
        <Card className="mb-5">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Proposal Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Delivery Timeline</p>
                <p className="text-base font-semibold text-foreground">{app.deliveryTimeline || "Not specified"}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Expected Compensation</p>
                <p className="text-base font-semibold text-foreground">{app.expectedBudget || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting details if scheduled */}
        {app.meeting?.scheduled && (
          <Card className="mb-5 border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CalendarDays size={15} className="text-emerald-600" /> Scheduled Meeting
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">{app.meeting.date} · {app.meeting.timeSlot}</p>
                  <p className="text-sm text-muted-foreground mt-1">{app.meeting.link}</p>
                </div>
                <a
                  href={safeUrl(app.meeting?.link || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (app.meeting?.link.includes('/meet/')) {
                      e.preventDefault();
                      window.open(app.meeting.link, '_blank');
                    }
                  }}
                >
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    🎥 Join Meeting
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom action bar for startups */}
        {isStartup && app.status === "pending" && (
          <div className="sticky bottom-6 bg-background/80 backdrop-blur-sm border border-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg">
            <p className="text-sm text-muted-foreground">Ready to make a decision?</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={updating}
                onClick={() => handleStatus("rejected")}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle size={14} className="mr-1.5" /> Reject
              </Button>
              <Button
                disabled={updating}
                onClick={() => handleStatus("accepted")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {updating ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />}
                Accept Application
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Undo dialog */}
      <AlertDialog open={showUndo} onOpenChange={setShowUndo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo your decision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert <strong>{app.applicantName}</strong>'s application back to pending. They won't be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatus("pending")} disabled={updating}>
              {updating ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <RotateCcw size={13} className="mr-1.5" />}
              Yes, undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationDetail;
