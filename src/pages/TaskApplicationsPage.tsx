import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate }       from "react-router-dom";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Input }     from "@/components/ui/input";
import {
  ArrowLeft, Search, X,
  FileText, Clock, Trophy,
  Loader2, ExternalLink,
  RotateCcw, CheckCircle2, XCircle, Users,
  CalendarDays
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar        from "@/components/Navbar";
import { applicationsApi, type Application, type AppStatus } from "@/lib/api";
import { useToast }  from "@/hooks/use-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────
const safeUrl = (url: string) => {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
};

const statusMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:     { label: "Pending",         bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  selected:    { label: "Selected",        bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  accepted:    { label: "Selected",        bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  finalised:   { label: "Finalised ✓",    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  better_luck: { label: "Better Luck",    bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200" },
  rejected:    { label: "Better Luck",    bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const m = statusMeta[status] || statusMeta.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  );
};

// ── Single Application Card ────────────────────────────────────────────────────
const AppCard = ({
  app, isFinalised, onStatus, updating, navigate,
}: {
  app: Application;
  isFinalised: boolean;
  onStatus: (id: string, status: AppStatus) => void;
  updating: string | null;
  navigate: (path: string) => void;
}) => {
  const [showUndo, setShowUndo] = useState(false);
  const isUpdating = updating === app._id;
  const isThisFinalised = app.status === "finalised";
  const isBad = app.status === "better_luck" || app.status === "rejected";

  return (
    <>
      <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden transition-all shadow-sm ${
        isThisFinalised ? "border-emerald-300 ring-2 ring-emerald-200 shadow-emerald-100"
        : isBad         ? "border-gray-100 opacity-60"
        :                 "border-gray-100 hover:shadow-md hover:border-green-100"
      }`}>
        {/* Finalised banner */}
        {isThisFinalised && (
          <div className="bg-emerald-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-1.5">
            <Trophy size={12} /> Finalised Freelancer
          </div>
        )}

        <div className="p-5 flex flex-col gap-3 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-gray-900 text-sm">{app.applicantName}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(app.createdAt)}</p>
            </div>
            <StatusBadge status={app.status} />
          </div>

          {/* Skills */}
          {app.skills && app.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.skills.slice(0, 4).map(s => (
                <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[11px]">{s}</span>
              ))}
              {app.skills.length > 4 && <span className="text-[11px] text-muted-foreground self-center">+{app.skills.length - 4}</span>}
            </div>
          )}

          {/* Pitch — one line preview */}
          {((app as any).pitch || app.coverNote) && (
            <p className="text-xs text-gray-500 line-clamp-2 italic">
              "{(app as any).pitch || app.coverNote}"
            </p>
          )}

          {/* Resume link — direct access */}
          {app.resumeLink && (
            <a
              href={safeUrl(app.resumeLink)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors w-fit"
            >
              <FileText size={11}/> View Resume
            </a>
          )}

          {/* Meta */}
          <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap mt-auto">
            {app.deliveryTimeline && <span className="flex items-center gap-1"><Clock size={10}/>{app.deliveryTimeline}</span>}
            {app.expectedBudget   && <span>Asks: <strong className="text-gray-700">{app.expectedBudget}</strong></span>}
          </div>

          {/* View Full Application button */}
          <button
            onClick={() => navigate(`/applications/${app._id}`)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-semibold transition-colors mt-1"
          >
            <ExternalLink size={11}/> View Full Application
          </button>
        </div>

        {/* Action row */}
        {!isThisFinalised && (
          <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 flex flex-wrap gap-2">
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin text-muted-foreground m-auto" />
            ) : (
              <>
                {!isFinalised && !isBad && (
                  <Button size="sm" onClick={() => onStatus(app._id, "finalised")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                    <Trophy size={11} className="mr-1"/> Finalise
                  </Button>
                )}
                {app.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => onStatus(app._id, "selected")}
                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50 flex-1">
                    <CheckCircle2 size={11} className="mr-1"/> Select
                  </Button>
                )}
                {app.status === "selected" && (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "pending")}
                    className="text-xs text-gray-500">
                    <RotateCcw size={11} className="mr-1"/> Undo
                  </Button>
                )}
                {!isBad && (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "better_luck")}
                    className="text-xs text-gray-400 hover:text-gray-600">
                    <XCircle size={11} className="mr-1"/> Better Luck
                  </Button>
                )}
                {isBad && (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(app._id, "pending")}
                    className="text-xs text-amber-600 hover:text-amber-700 w-full">
                    <RotateCcw size={11} className="mr-1"/> Move to Pending
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        {isThisFinalised && (
          <div className="border-t border-emerald-200 bg-emerald-50/50 px-4 py-2.5 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowUndo(true)}
              className="text-xs text-gray-400 hover:text-gray-600">
              <RotateCcw size={11} className="mr-1"/> Undo finalise
            </Button>
          </div>
        )}
      </div>

      {/* Undo finalise dialog */}
      <AlertDialog open={showUndo} onOpenChange={setShowUndo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo finalisation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <strong>{app.applicantName}</strong> back to pending. Others can then be finalised.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowUndo(false); onStatus(app._id, "pending"); }}>
              <RotateCcw size={13} className="mr-1"/> Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const TaskApplicationsPage = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate       = useNavigate();
  const { toast }      = useToast();

  const [apps,       setApps]       = useState<Application[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [updating,   setUpdating]   = useState<string | null>(null);
  const [taskTitle,  setTaskTitle]  = useState("");

  // Search + filter
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilter,  setShowFilter]  = useState(false);

  // Bulk confirm
  const [confirmBulk, setConfirmBulk] = useState<{ action: string; label: string } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (!problemId) return;
    applicationsApi.getByProblem(problemId)
      .then(({ applications }) => {
        setApps(applications);
        if (applications.length > 0) setTaskTitle(applications[0].problemTitle);
      })
      .catch(err => toast({ title: "Could not load applications", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [problemId]);

  const handleStatus = async (id: string, status: AppStatus) => {
    setUpdating(id);
    try {
      await applicationsApi.updateStatus(id, status);
      setApps(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      toast({ title: status === "finalised" ? "Freelancer finalised! 🎉" : `Status updated` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUpdating(null); }
  };

  const handleBulk = async (newStatus: AppStatus) => {
    if (!problemId) return;
    setBulkLoading(true);
    const finalised = apps.find(a => a.status === "finalised");
    const excludeIds = finalised ? [finalised._id] : [];
    try {
      await applicationsApi.bulkStatus(problemId, newStatus, excludeIds);
      setApps(prev => prev.map(a =>
        a.status === "finalised" ? a : { ...a, status: newStatus }
      ));
      toast({ title: `All updated` });
    } catch (err: any) {
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    } finally { setBulkLoading(false); setConfirmBulk(null); }
  };

  // Normalize old statuses for backwards compatibility with "accepted"/"rejected"
  const normalizeStatus = (status: string): string => {
    if (status === "accepted") return "selected";
    if (status === "rejected") return "better_luck";
    return status;
  };

  // Filter + search
  const filtered = useMemo(() => {
    return apps.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        a.applicantName.toLowerCase().includes(q) ||
        ((a as any).pitch || a.coverNote || "").toLowerCase().includes(q) ||
        (a.skills || []).some(s => s.toLowerCase().includes(q));
      // Normalize accepted→selected, rejected→better_luck for filter matching
      const normalized = normalizeStatus(a.status);
      const matchStatus = statusFilter === "all" || normalized === statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [apps, search, statusFilter]);


  const isFinalised = apps.some(a => a.status === "finalised");

  const STATUS_OPTIONS = [
    { value: "all",         label: "All" },
    { value: "pending",     label: "Pending" },
    { value: "selected",    label: "Selected" },
    { value: "finalised",   label: "Finalised" },
    { value: "better_luck", label: "Better Luck" },
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/40 to-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Applications for task</p>
            <h1 className="text-xl font-bold text-gray-900 truncate">{taskTitle || "Loading…"}</h1>
          </div>
        </div>

        {/* Stats row */}
        {!loading && apps.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total",     count: apps.length,                                                                       color: "text-gray-700",   bg: "bg-white" },
              { label: "Pending",  count: apps.filter(a => a.status === "pending").length,                                        color: "text-amber-600",  bg: "bg-amber-50" },
              { label: "Selected", count: apps.filter(a => a.status === "selected" || a.status === "accepted").length,            color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "Finalised",count: apps.filter(a => a.status === "finalised").length,                                      color: "text-emerald-600",bg: "bg-emerald-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-white shadow-sm p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search by name, skill, or pitch…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {opt.label}
                {opt.value !== "all" && (
                  <span className="ml-1.5 opacity-60">
                    {apps.filter(a => {
                      const n = normalizeStatus(a.status);
                      return n === opt.value || a.status === opt.value;
                    }).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {apps.length > 0 && (
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button size="sm" variant="outline" disabled={bulkLoading}
                onClick={() => setConfirmBulk({ action: "better_luck", label: "mark all non-finalised as Better Luck" })}
                className="text-xs h-8">
                <XCircle size={11} className="mr-1"/> Reject All Remaining
              </Button>
              <Button size="sm" variant="outline" disabled={bulkLoading}
                onClick={() => setConfirmBulk({ action: "pending", label: "reset all non-finalised to Pending" })}
                className="text-xs h-8">
                <RotateCcw size={11} className="mr-1"/> Reset All to Pending
              </Button>
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length === apps.length
              ? `${apps.length} application${apps.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${apps.length} applications`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-500" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No applications yet</p>
            <p className="text-sm text-gray-400 mt-1">Applications will appear here once freelancers apply.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No results found</p>
            <button className="text-xs text-primary mt-2" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Render ALL applications, sorted by priority status */}
            {[
              ...filtered.filter(a => a.status === "finalised"),
              ...filtered.filter(a => a.status === "selected" || a.status === "accepted"),
              ...filtered.filter(a => a.status === "pending"),
              ...filtered.filter(a => a.status === "better_luck" || a.status === "rejected"),
            ].map(a => (
              <AppCard key={a._id} app={a} isFinalised={isFinalised} onStatus={handleStatus} updating={updating} navigate={navigate} />
            ))}
          </div>
        )}
      </main>

      {/* Bulk confirm dialog */}
      <AlertDialog open={!!confirmBulk} onOpenChange={v => !v && setConfirmBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk action</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>{confirmBulk?.label}</strong>. Finalised freelancers will not be affected.
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
    </div>
  );
};

export default TaskApplicationsPage;
