import { useState, useEffect } from "react";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Github, Linkedin, FileText, Clock, CheckCircle2,
  XCircle, RotateCcw, Users, Trophy, CalendarDays,
  Loader2, ExternalLink, ChevronDown, ChevronUp, X,
  Briefcase, AlertCircle,
} from "lucide-react";
import { applicationsApi, type Application, type AppStatus } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────
const statusMeta: Record<AppStatus, { label: string; bg: string; text: string; border: string }> = {
  pending:     { label: "Pending",             bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200" },
  selected:    { label: "Selected",            bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200" },
  finalised:   { label: "Finalised ✓",         bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300" },
  better_luck: { label: "Better Luck",         bg: "bg-gray-50",     text: "text-gray-500",    border: "border-gray-200" },
  accepted:    { label: "Accepted",            bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  rejected:    { label: "Better Luck",         bg: "bg-gray-50",     text: "text-gray-500",    border: "border-gray-200" },
};
const StatusBadge = ({ status }: { status: AppStatus }) => {
  const m = statusMeta[status] || statusMeta.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  );
};

// ── Meeting Scheduler Dialog ───────────────────────────────────────────────────
const MeetingDialog = ({
  open, app, onClose, onScheduled,
}: {
  open: boolean; app: Application | null; onClose: () => void; onScheduled: (meeting: any) => void;
}) => {
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const [date, setDate]         = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [saving, setSaving]     = useState(false);

  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM",
    "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM",
  ];

  const handleSchedule = async () => {
    if (!date || !timeSlot) { toast({ title: "Please select a date and time", variant: "destructive" }); return; }
    if (!app) return;
    setSaving(true);
    try {
      const result = await applicationsApi.scheduleMeeting(app._id, date, timeSlot);
      // The backend generates a room ID; build the full CoHustle meet link
      const meetLink = result.meeting?.link || '';
      const roomId = meetLink.split('/meeting/')[1] || meetLink.split('/').pop() || '';
      const fullLink = roomId ? `${window.location.origin}/meet/${roomId}` : meetLink;
      toast({ title: "Meeting scheduled! 📅", description: `${date} at ${timeSlot}` });
      onScheduled({ ...result.meeting, link: fullLink });
      onClose();
    } catch (err: any) {
      toast({ title: "Could not schedule", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a Meeting</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Schedule a call with <strong>{app?.applicantName}</strong> regarding <em>{app?.problemTitle}</em>.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time Slot *</Label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map(t => (
                <button
                  key={t}
                  onClick={() => setTimeSlot(t)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                    timeSlot === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50 text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {date && timeSlot && (
            <div className="rounded-lg bg-secondary px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Meeting preview</p>
              <p className="text-muted-foreground mt-1">{date} at {timeSlot} · Link generated on save</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSchedule} disabled={!date || !timeSlot || saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <CalendarDays size={14} className="mr-2" />}
            Schedule Meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Single Application Card (in grid) ─────────────────────────────────────────
const AppGridCard = ({
  app, isFinalised, onStatus, updating, onSchedule,
}: {
  app: Application;
  isFinalised: boolean;
  onStatus: (id: string, status: AppStatus) => void;
  updating: string | null;
  onSchedule: (app: Application) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const isUpdating = updating === app._id;
  const isThisFinalised = app.status === "finalised";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all ${
      isThisFinalised
        ? "border-emerald-300 ring-2 ring-emerald-200"
        : app.status === "better_luck" || app.status === "rejected"
        ? "border-gray-100 opacity-60"
        : "border-gray-100 hover:shadow-md"
    }`}>
      {/* Finalised banner */}
      {isThisFinalised && (
        <div className="bg-emerald-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-1.5">
          <Trophy size={12} /> Finalised Freelancer
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{app.applicantName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Skills */}
        {app.skills && app.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {app.skills.slice(0, 4).map(s => (
              <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 text-xs rounded-full">{s}</span>
            ))}
            {app.skills.length > 4 && <span className="text-xs text-muted-foreground self-center">+{app.skills.length - 4}</span>}
          </div>
        )}

        {/* Pitch preview */}
        {(app.pitch || app.coverNote) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pitch</p>
            <p className={`text-sm text-gray-700 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
              {app.pitch || app.coverNote}
            </p>
            {((app.pitch || app.coverNote) || "").length > 180 && (
              <button className="text-xs text-green-700 mt-1 hover:underline flex items-center gap-1" onClick={() => setExpanded(e => !e)}>
                {expanded ? <><ChevronUp size={11}/>Less</> : <><ChevronDown size={11}/>Read more</>}
              </button>
            )}
          </div>
        )}

        {/* Links row */}
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          {app.resumeLink && (
            <a href={app.resumeLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
              <FileText size={12} /> Resume
            </a>
          )}
          {app.githubLink && (
            <a href={app.githubLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
              <Github size={12} /> GitHub
            </a>
          )}
          {app.linkedinLink && (
            <a href={app.linkedinLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors">
              <Linkedin size={12} /> LinkedIn
            </a>
          )}
        </div>

        {/* Meta */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {app.deliveryTimeline && <span className="flex items-center gap-1"><Clock size={10}/>{app.deliveryTimeline}</span>}
          {app.expectedBudget   && <span>{app.expectedBudget}</span>}
        </div>

        {/* Meeting info if scheduled */}
        {app.meeting?.scheduled && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
            <p className="font-medium text-emerald-700 flex items-center gap-1.5 mb-1">
              <CalendarDays size={11}/> Meeting scheduled
            </p>
            <p className="text-emerald-600">{app.meeting.date} · {app.meeting.timeSlot}</p>
            <div className="flex gap-2 mt-1">
              <a href={app.meeting.link} target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 hover:underline flex items-center gap-1 text-xs">
                <ExternalLink size={10}/> Open link
              </a>
              {app.meeting.link.includes('/meet/') && (
                <button
                  onClick={() => {
                    const roomId = app.meeting!.link.split('/meet/')[1];
                    window.open(`/meet/${roomId}`, '_blank');
                  }}
                  className="text-emerald-700 underline flex items-center gap-1 text-xs"
                >
                  🎥 Join now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action row */}
      {app.status !== "finalised" && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 flex flex-wrap gap-2">
          {isUpdating ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground m-auto" />
          ) : (
            <>
              {/* Finalise — only when not already blocked by another finalised */}
              {!isFinalised && app.status !== "better_luck" && app.status !== "rejected" && (
                <Button size="sm" onClick={() => onStatus(app._id, "finalised")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                  <Trophy size={11} className="mr-1"/> Finalise
                </Button>
              )}
              {/* Select */}
              {app.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => onStatus(app._id, "selected")}
                  className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50 flex-1">
                  <CheckCircle2 size={11} className="mr-1"/> Select
                </Button>
              )}
              {/* Undo selected → pending */}
              {app.status === "selected" && (
                <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "pending")}
                  className="text-xs text-gray-500 hover:text-gray-700">
                  <RotateCcw size={11} className="mr-1"/> Undo
                </Button>
              )}
              {/* Better luck */}
              {app.status !== "better_luck" && app.status !== "rejected" && (
                <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "better_luck")}
                  className="text-xs text-gray-400 hover:text-gray-600">
                  <XCircle size={11} className="mr-1"/> Better Luck
                </Button>
              )}
              {/* Undo better luck */}
              {(app.status === "better_luck" || app.status === "rejected") && (
                <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "pending")}
                  className="text-xs text-amber-600 hover:text-amber-700 w-full">
                  <RotateCcw size={11} className="mr-1"/> Move to Pending
                </Button>
              )}
              {/* Schedule meeting */}
              {(app.status === "selected" || app.status === "pending") && !app.meeting?.scheduled && (
                <Button size="sm" variant="ghost" onClick={() => onSchedule(app)}
                  className="text-xs text-green-700 hover:text-green-700">
                  <CalendarDays size={11} className="mr-1"/> Schedule
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {/* Finalised card actions */}
      {app.status === "finalised" && (
        <div className="border-t border-emerald-200 bg-emerald-50/50 px-4 py-3 flex gap-2">
          {!app.meeting?.scheduled && (
            <Button size="sm" variant="outline" onClick={() => onSchedule(app)}
              className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-1">
              <CalendarDays size={11} className="mr-1"/> Schedule Meeting
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "pending")}
            className="text-xs text-gray-400 hover:text-gray-600">
            <RotateCcw size={11}/> Undo
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Main modal ─────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  problemId: string;
  problemTitle: string;
}

const ApplicationsDashboard = ({ open, onClose, problemId, problemTitle }: Props) => {
  const { toast }              = useToast();
  const [apps, setApps]        = useState<Application[]>([]);
  const [loading, setLoading]  = useState(false);
  const [updating, setUpdating]= useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [meetingFor, setMeetingFor]   = useState<Application | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<{ action: string; label: string } | null>(null);

  useEffect(() => {
    if (!open || !problemId) return;
    setLoading(true);
    applicationsApi.getByProblem(problemId)
      .then(({ applications }) => setApps(applications))
      .catch(err => toast({ title: "Could not load applications", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, problemId]);

  const handleStatus = async (id: string, status: AppStatus) => {
    setUpdating(id);
    try {
      await applicationsApi.updateStatus(id, status);
      setApps(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      toast({ title: status === "finalised" ? "Freelancer finalised! 🎉" : `Updated to ${statusMeta[status]?.label}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUpdating(null); }
  };

  const handleBulk = async (newStatus: AppStatus) => {
    const finalised = apps.find(a => a.status === "finalised");
    const excludeIds = finalised ? [finalised._id] : [];
    setBulkLoading(true);
    try {
      await applicationsApi.bulkStatus(problemId, newStatus, excludeIds);
      setApps(prev => prev.map(a =>
        a.status === "finalised" ? a : { ...a, status: newStatus }
      ));
      toast({ title: `All updated to ${statusMeta[newStatus]?.label}` });
    } catch (err: any) {
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    } finally { setBulkLoading(false); setConfirmBulk(null); }
  };

  const handleMeetingScheduled = (appId: string, meeting: any) => {
    setApps(prev => prev.map(a => a._id === appId ? { ...a, meeting } : a));
  };

  const finalised   = apps.find(a => a.status === "finalised");
  const selected    = apps.filter(a => a.status === "selected");
  const pending     = apps.filter(a => a.status === "pending");
  const betterLuck  = apps.filter(a => a.status === "better_luck" || a.status === "rejected");
  const isFinalised = !!finalised;

  const Section = ({ title, items, accent }: { title: string; items: Application[]; accent: string }) =>
    items.length > 0 ? (
      <div className="mb-6">
        <div className={`flex items-center gap-2 mb-3 px-1`}>
          <span className={`h-2.5 w-2.5 rounded-full ${accent}`}/>
          <h3 className="text-sm font-semibold text-gray-700">{title} <span className="text-muted-foreground font-normal">({items.length})</span></h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(a => (
            <AppGridCard
              key={a._id} app={a} isFinalised={isFinalised}
              onStatus={handleStatus} updating={updating}
              onSchedule={a => setMeetingFor(a)}
            />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-green-50 to-green-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Applications</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                <strong>{problemTitle}</strong> · {apps.length} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Stats chips */}
              <div className="hidden sm:flex gap-1.5">
                {[
                  { label: `${pending.length} pending`,    color: "bg-amber-100 text-amber-700" },
                  { label: `${selected.length} selected`,  color: "bg-blue-100 text-blue-700" },
                  { label: finalised ? "1 finalised" : "not finalised", color: finalised ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500" },
                ].map(s => (
                  <span key={s.label} className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                ))}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <X size={18}/>
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {apps.length > 0 && !loading && (
            <div className="px-6 py-3 border-b border-border bg-gray-50/60 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-muted-foreground mr-1">Bulk actions:</span>
              <Button size="sm" variant="outline" disabled={bulkLoading}
                onClick={() => setConfirmBulk({ action: "better_luck", label: "Better Luck Next Time for all remaining" })}
                className="text-xs h-7 text-gray-600 border-gray-200">
                <XCircle size={11} className="mr-1"/> Reject All Remaining
              </Button>
              <Button size="sm" variant="outline" disabled={bulkLoading}
                onClick={() => setConfirmBulk({ action: "pending", label: "Move all to Pending" })}
                className="text-xs h-7 text-gray-600 border-gray-200">
                <RotateCcw size={11} className="mr-1"/> Reset All to Pending
              </Button>
              {bulkLoading && <Loader2 size={13} className="animate-spin text-muted-foreground"/>}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-green-500"/>
              </div>
            ) : apps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users size={48} className="text-gray-200 mb-4"/>
                <p className="text-gray-500 font-medium">No applications yet</p>
                <p className="text-sm text-gray-400 mt-1">Applications will appear here once freelancers apply.</p>
              </div>
            ) : (
              <>
                {/* Finalised always first */}
                {finalised && (
                  <Section title="Finalised" items={[finalised]} accent="bg-emerald-500"/>
                )}
                <Section title="Selected"   items={selected}   accent="bg-blue-500"/>
                <Section title="Pending"    items={pending}    accent="bg-amber-400"/>
                <Section title="Better Luck Next Time" items={betterLuck} accent="bg-gray-400"/>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting scheduler */}
      <MeetingDialog
        open={!!meetingFor}
        app={meetingFor}
        onClose={() => setMeetingFor(null)}
        onScheduled={(meeting) => {
          if (meetingFor) handleMeetingScheduled(meetingFor._id, meeting);
        }}
      />

      {/* Bulk confirm */}
      <AlertDialog open={!!confirmBulk} onOpenChange={v => !v && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk action</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>{confirmBulk?.label}</strong>. Finalised freelancers are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmBulk && handleBulk(confirmBulk.action as AppStatus)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ApplicationsDashboard;
