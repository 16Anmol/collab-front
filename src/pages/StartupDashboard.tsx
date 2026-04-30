import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, MessageCircle, User, Handshake, Loader2,
  Bell, CheckCircle2, Star, RotateCcw, Clock,
  ChevronRight, Users, FileText, Briefcase,
  Trash2, ArrowUpRight, ExternalLink, Search, X, AlertTriangle, Shield
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  problemsApi, applicationsApi, collabApi,
  type Problem, type Application, type CollabRequest
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending:     "bg-amber-50 text-amber-700 border-amber-200",
    selected:    "bg-blue-50 text-blue-700 border-blue-200",
    accepted:    "bg-blue-50 text-blue-700 border-blue-200",
    finalised:   "bg-emerald-50 text-emerald-700 border-emerald-300",
    better_luck: "bg-gray-50 text-gray-500 border-gray-200",
    rejected:    "bg-gray-50 text-gray-500 border-gray-200",
  };
  const labels: Record<string, string> = {
    pending: "Pending", selected: "Selected", accepted: "Selected",
    finalised: "Finalised ✓", better_luck: "Better Luck", rejected: "Better Luck",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

// ── Compact Application Card ─────────────────────────────────────────────────
// Shows ONLY: name, status, skills, timeline, asks — NO pitch/description
// Full details are on the ApplicationDetail page
const AppCard = ({ app, onStatus, updating, navigate }: any) => {
  const [showUndo, setShowUndo] = useState(false);
  const isUpdating = updating === app._id;
  const isPending  = app.status === "pending";

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
        {/* Left: identity + status + skills */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{app.applicantName}</p>
            <StatusBadge status={app.status} />
            <span className="text-[10px] text-gray-400">{timeAgo(app.createdAt)}</span>
          </div>
          {app.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {app.skills.slice(0, 5).map((s: string) => (
                <span key={s} className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">{s}</span>
              ))}
              {app.skills.length > 5 && <span className="text-[10px] text-gray-400 self-center">+{app.skills.length - 5}</span>}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
            {app.deliveryTimeline && <span className="flex items-center gap-1"><Clock size={9}/>{app.deliveryTimeline}</span>}
            {app.expectedBudget && <span>Asks: <strong className="text-gray-600">{app.expectedBudget}</strong></span>}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Full Application — always visible */}
          <button
            onClick={() => navigate(`/applications/${app._id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-semibold transition-colors"
          >
            <ExternalLink size={11}/> View Application
          </button>

          {/* Accept / Reject for pending */}
          {isPending && (
            <>
              <button
                disabled={isUpdating}
                onClick={() => onStatus(app._id, "accepted")}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {isUpdating ? "…" : "Accept"}
              </button>
              <button
                disabled={isUpdating}
                onClick={() => onStatus(app._id, "better_luck")}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </>
          )}

          {/* Undo for decided */}
          {!isPending && (
            <button
              onClick={() => setShowUndo(true)}
              disabled={isUpdating}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
            >
              <RotateCcw size={11}/> Undo
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={showUndo} onOpenChange={setShowUndo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo decision?</AlertDialogTitle>
            <AlertDialogDescription>
              Revert <strong>{app.applicantName}</strong>'s application back to pending. They won't be notified.
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
const StartupDashboard = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab     = searchParams.get("tab") || "tasks";
  const { user, profile } = useAuth();
  const { toast }      = useToast();

  const [problems,      setProblems]      = useState<Problem[]>([]);
  const [applications,  setApplications]  = useState<Application[]>([]);
  const [collabs,       setCollabs]       = useState<CollabRequest[]>([]);
  const [loadingProbs,  setLoadingProbs]  = useState(true);
  const [loadingApps,   setLoadingApps]   = useState(true);
  const [loadingCollab, setLoadingCollab] = useState(true);
  const [updatingId,    setUpdatingId]    = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab,     setActiveTab]     = useState(defaultTab);
  const [search,        setSearch]        = useState("");

  useEffect(() => {
    problemsApi.getMine()
      .then(({ problems }) => setProblems(problems))
      .catch(err => toast({ title: "Could not load tasks", description: err.message, variant: "destructive" }))
      .finally(() => setLoadingProbs(false));
  }, []);

  useEffect(() => {
    applicationsApi.getReceived()
      .then(({ applications }) => setApplications(applications))
      .catch(err => toast({ title: "Could not load applications", description: err.message, variant: "destructive" }))
      .finally(() => setLoadingApps(false));
  }, []);

  useEffect(() => {
    collabApi.getMine()
      .then(({ requests }) => setCollabs(requests))
      .catch(() => {})
      .finally(() => setLoadingCollab(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cohustle_token");
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token } });
    socket.on("application:new", (app: Application) => {
      setApplications(prev => prev.find(a => a._id === app._id) ? prev : [app, ...prev]);
      toast({ title: "New application! 📬", description: `${app.applicantName} applied to "${app.problemTitle}"` });
    });
    socket.on("notification", (n: any) => setNotifications(prev => [{ id: Date.now().toString(), ...n }, ...prev]));
    return () => { socket.disconnect(); };
  }, [user]);

  const handleStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await applicationsApi.updateStatus(id, status as any);
      setApplications(prev => prev.map(a => a._id === id ? { ...a, status: status as any } : a));
      toast({ title: status === "pending" ? "Decision undone" : `Application ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUpdatingId(null); }
  };

  const deleteCollab = async (id: string) => {
    try {
      await collabApi.delete(id);
      setCollabs(prev => prev.filter(c => c._id !== id));
      toast({ title: "Collab post removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const pendingApps = applications.filter(a => a.status === "pending");

  // Group applications by task
  const appsByTask = applications.reduce<Record<string, { problemId: string; title: string; apps: Application[] }>>((acc, a) => {
    if (!acc[a.problemId]) acc[a.problemId] = { problemId: a.problemId, title: a.problemTitle, apps: [] };
    acc[a.problemId].apps.push(a);
    return acc;
  }, {});
  const taskGroups = Object.values(appsByTask);

  // Tab definitions
  const tabs = [
    { id: "tasks",        label: "My Tasks",       count: problems.length + collabs.length },
    { id: "applications", label: "Applications",   count: applications.length, badge: pendingApps.length },
    { id: "collabs",      label: "Collaboration",  count: collabs.length },
  ];

  const taskStatusStyle: Record<string, string> = {
    open:        "bg-green-50 text-green-700 border-green-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    closed:      "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #f3f0ff 60%, #fdf4ff 100%)" }}>
      <Navbar />

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-green-100 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={user.avatar} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-700 to-green-800 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                  {user?.fullName?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-green-700 font-medium">Startup Dashboard</p>
                <h1 className="text-2xl font-bold text-gray-900">Hey, {user?.fullName?.split(" ")[0]} 👋</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your tasks and collaborators</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {notifications.length > 0 && (
                <button onClick={() => setNotifications([])}
                  className="relative px-3 py-2 rounded-xl border border-green-200 bg-white text-gray-600 hover:bg-green-50 transition-colors">
                  <Bell size={16}/>
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{notifications.length}</span>
                </button>
              )}
              <button onClick={() => navigate("/post-problem")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-700 to-green-800 text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
                <Plus size={15}/> Post Task
              </button>
              <button onClick={() => navigate("/post-collab")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-200 text-green-700 bg-white hover:bg-green-50 text-sm font-semibold transition-colors">
                <Handshake size={15}/> Find Collaborator
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Active Tasks",   value: problems.filter(p => p.status === "open").length, color: "text-green-700", bg: "bg-green-50" },
              { label: "Applications",  value: applications.length,                                color: "text-gray-700",   bg: "bg-white" },
              { label: "Pending Review",value: pendingApps.length,                                 color: "text-amber-600",  bg: "bg-amber-50" },
              { label: "Accepted",      value: applications.filter(a => ["accepted","finalised","selected"].includes(a.status)).length, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-white/80 p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: User,          label: "Profile",    sub: "Edit info",             path: "/profile",    g: "from-green-700 to-green-800" },
            { icon: MessageCircle, label: "Messages",   sub: "Chat with freelancers", path: "/chat",       g: "from-blue-500 to-indigo-500" },
            { icon: CheckCircle2,  label: "Milestones", sub: "Track progress",        path: "/milestones", g: "from-green-700 to-green-600" },
            { icon: Star,          label: "Ratings",    sub: "View feedback",         path: "/ratings",    g: "from-orange-400 to-amber-500" },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left p-4">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.g} text-white mb-3`}>
                <item.icon size={17}/>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-gray-500 transition-colors"/>
            </button>
          ))}
        </div>

        {/* ── Document Upload Notification Banner ──────────────────────────────── */}
        {(profile as any)?.startupProfile && !((profile as any).startupProfile?.identityProof) && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Upload Verification Documents</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Freelancers and collaborators trust verified profiles more. Please upload your Founder Identity Proof and Company Document to build credibility.
              </p>
            </div>
            <button onClick={() => navigate("/profile")}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 border border-amber-300 bg-white px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
              Upload Now →
            </button>
          </div>
        )}

        {/* ── Tabs + Search ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-white/60 rounded-xl border border-gray-100 p-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-green-700 to-green-800 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                {tab.label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{tab.count}</span>
                {tab.badge ? (
                  <span className="bg-amber-400 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">{tab.badge} new</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === "tasks" ? "tasks & posts" : activeTab === "applications" ? "applications" : "collaboration posts"}…`}
              className="w-full h-10 pl-9 pr-8 text-sm rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-300 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13}/>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1 — MY TASKS: ALL tasks + collab posts unified, searchable */}
        {activeTab === "tasks" && (() => {
          const q = search.toLowerCase();
          const filteredProblems = problems.filter(p =>
            !q || p.title.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q)) ||
            p.description?.toLowerCase().includes(q)
          );
          const filteredCollabs = collabs.filter(c =>
            !q || c.title.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q)) ||
            c.description?.toLowerCase().includes(q)
          );
          const total = filteredProblems.length + filteredCollabs.length;

          if (loadingProbs || loadingCollab) return (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-green-500"/></div>
          );

          if (total === 0 && !search) return (
            <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
              <Briefcase size={40} className="mx-auto text-green-200 mb-3"/>
              <p className="text-gray-500 font-medium">Nothing posted yet</p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={() => navigate("/post-problem")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-700 to-green-800 text-white text-sm font-semibold">
                  <Plus size={14}/> Post Task
                </button>
                <button onClick={() => navigate("/post-collab")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-300 text-green-700 bg-white text-sm font-semibold">
                  <Handshake size={14}/> Post Collab
                </button>
              </div>
            </div>
          );

          if (total === 0 && search) return (
            <div className="text-center py-8 text-gray-400">
              <Search size={32} className="mx-auto mb-2 text-gray-200"/>
              <p>No results for "{search}"</p>
              <button onClick={() => setSearch("")} className="text-xs text-green-700 mt-2 hover:underline">Clear search</button>
            </div>
          );

          return (
            <div className="space-y-2.5">
              {/* Freelancer Tasks */}
              {filteredProblems.map(p => (
                <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wide">Task</span>
                        <h3 className="font-bold text-gray-900">{p.title}</h3>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${taskStatusStyle[p.status] || taskStatusStyle.open}`}>
                          {p.status.replace("_", " ")}
                        </span>
                      </div>
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-100">{t}</span>)}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {p.budget && <span className="font-semibold text-gray-700">{p.budget}</span>}
                        {p.timeline && <span className="flex items-center gap-1"><Clock size={10}/>{p.timeline}</span>}
                        {(p as any).location && <span>📍 {(p as any).location}</span>}
                        <span className="flex items-center gap-1"><Users size={10}/>{p.applicationCount} applicant{p.applicationCount !== 1 ? "s" : ""}</span>
                        <span>{timeAgo(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Collab Posts */}
              {filteredCollabs.map(col => (
                <div key={col._id} className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wide">Collab</span>
                        <h3 className="font-bold text-gray-900">{col.title}</h3>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200 capitalize">
                          {col.lookingFor}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${col.status === "open" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {col.status}
                        </span>
                      </div>
                      {col.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {col.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-100">{t}</span>)}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{timeAgo(col.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => navigate(`/collab-pitches/${col._id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-800 text-white text-xs font-bold transition-colors">
                        <Handshake size={12}/> View Pitches
                      </button>
                      <button onClick={() => deleteCollab(col._id)}
                        className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* TAB 2 — APPLICATIONS
            Shows ONLY task cards with applicant count.
            "View Applications" → opens full grid page for that task.
            No pitch/description/applicant details shown here. */}
        {activeTab === "applications" && (
          loadingApps ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-green-500"/></div>
          ) : taskGroups.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
              <FileText size={40} className="mx-auto text-green-200 mb-3"/>
              <p className="text-gray-500 font-medium">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Post a task to start receiving applications from freelancers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskGroups.filter(group =>
                !search || group.title.toLowerCase().includes(search.toLowerCase()) ||
                group.apps.some(a => a.applicantName.toLowerCase().includes(search.toLowerCase()) ||
                  (a.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase())))
              ).map(group => {
                const newCount = group.apps.filter(a => a.status === "pending").length;
                const task = problems.find(p => p._id === group.problemId);
                return (
                  <div key={group.problemId} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Task title + status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900">{group.title}</h3>
                          {task && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${taskStatusStyle[task.status] || taskStatusStyle.open}`}>
                              {task.status.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        {/* Tags */}
                        {task && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {task.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">{t}</span>)}
                          </div>
                        )}
                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {task?.budget && <span className="font-semibold text-gray-700">{task.budget}</span>}
                          {task?.timeline && <span className="flex items-center gap-1"><Clock size={9}/>{task.timeline}</span>}
                          <span className="flex items-center gap-2">
                            <Users size={9}/>
                            <span className="font-semibold text-gray-700">{group.apps.length} applicant{group.apps.length !== 1 ? "s" : ""}</span>
                            {newCount > 0 && (
                              <span className="bg-amber-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{newCount} new</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {/* View Applications button — opens grid page */}
                      <button
                        onClick={() => navigate(`/tasks/${group.problemId}/applications`)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-800 text-white text-sm font-bold transition-colors shadow-sm"
                      >
                        <Users size={13}/>
                        View Applications ({group.apps.length})
                        <ArrowUpRight size={12}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TAB 3 — COLLABORATION
            Shows collab posts as clean cards with tags + status.
            "View Pitches" → Messages (pitches land in chat via PitchDialog).
            Delete button to remove own posts. */}
        {activeTab === "collabs" && (
          loadingCollab ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-green-500"/></div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{collabs.length} collaboration post{collabs.length !== 1 ? "s" : ""}</p>
                <button onClick={() => navigate("/post-collab")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-700 to-green-600 text-white text-sm font-semibold shadow-sm hover:opacity-90">
                  <Plus size={14}/> New Post
                </button>
              </div>

              {collabs.length === 0 ? (
                <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
                  <Handshake size={40} className="mx-auto text-green-200 mb-3"/>
                  <p className="text-gray-500 font-medium">No collaboration posts yet</p>
                  <p className="text-sm text-gray-400 mt-1">Post to find co-founders, partners, mentors, or investors</p>
                  <button onClick={() => navigate("/post-collab")}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-700 to-green-600 text-white text-sm font-semibold">
                    Post Collaboration Request
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {collabs.filter(col =>
                    !search || col.title.toLowerCase().includes(search.toLowerCase()) ||
                    col.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
                  ).map(col => (
                    <div key={col._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title + badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900">{col.title}</h3>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200 capitalize">
                              Looking for: {col.lookingFor}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                              col.status === "open" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}>{col.status}</span>
                          </div>
                          {/* Tags only */}
                          {col.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {col.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">{t}</span>)}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400 mt-2">{timeAgo(col.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* View Pitches → Messages (pitches come in as chat messages) */}
                          <button
                            onClick={() => navigate(`/collab-pitches/${col._id}`)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-800 text-white text-sm font-bold transition-colors shadow-sm"
                          >
                            <MessageCircle size={13}/> View Pitches
                          </button>
                          <button onClick={() => deleteCollab(col._id)}
                            className="p-2.5 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StartupDashboard;
