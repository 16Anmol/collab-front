import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import {
  Search, MessageCircle, User, Bell, Loader2,
  ExternalLink, Clock, Users, Star, Github, Linkedin,
  CheckCircle2, ChevronRight, FileText, BookOpen,
  Zap, ArrowUpRight, Trophy
} from "lucide-react";
import Navbar      from "@/components/Navbar";
import ApplyDialog from "@/components/ApplyDialog";
import { useAuth } from "@/contexts/AuthContext";
import { problemsApi, applicationsApi, type Problem, type Application } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

const ALL_SKILLS = [
  "React","Node.js","Python","TypeScript","Flutter","iOS","Android",
  "UI/UX Design","Figma","Machine Learning","DevOps","Data Science",
  "Copywriting","Marketing","SEO","Graphic Design","Video Editing",
  "Product Management","Blockchain","AWS","FastAPI","Next.js",
];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
};

// ── Status pill ────────────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; label: string }> = {
    pending:     { cls: "bg-amber-50 text-amber-700 border-amber-200",    label: "Pending" },
    selected:    { cls: "bg-blue-50 text-blue-700 border-blue-200",       label: "Selected 🎉" },
    finalised:   { cls: "bg-emerald-50 text-emerald-700 border-emerald-300", label: "Finalised ✓" },
    better_luck: { cls: "bg-gray-100 text-gray-500 border-gray-200",      label: "Better Luck Next Time" },
    accepted:    { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Accepted" },
    rejected:    { cls: "bg-gray-100 text-gray-500 border-gray-200",      label: "Better Luck Next Time" },
  };
  const m = map[status] || map.pending;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.cls}`}>{m.label}</span>;
};

// ── Main ───────────────────────────────────────────────────────────────────────
const FreelancerDashboard = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const defaultTab      = searchParams.get("tab") || "browse";
  const { user, profile } = useAuth();
  const { toast }       = useToast();

  const [problems,      setProblems]      = useState<Problem[]>([]);
  const [applications,  setApplications]  = useState<Application[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [loadingApps,   setLoadingApps]   = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [applyTarget,   setApplyTarget]   = useState<Problem | null>(null);
  const [activeTab,     setActiveTab]     = useState(defaultTab);

  const existingSkills    = profile?.freelancerProfile?.skills    || [];
  const existingPortfolio = profile?.freelancerProfile?.portfolioLink || "";

  useEffect(() => {
    problemsApi.getAll({ limit: 20 }).then(({ problems }) => setProblems(problems))
      .catch(() => toast({ title: "Could not load tasks", variant: "destructive" }))
      .finally(() => setLoadingProblems(false));
  }, []);

  useEffect(() => {
    applicationsApi.getMine().then(({ applications }) => setApplications(applications))
      .catch(err => toast({ title: "Could not load applications", description: err.message, variant: "destructive" }))
      .finally(() => setLoadingApps(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cohustle_token");
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token } });
    socket.on("problem:new", (p: any) => { setProblems(prev => [p, ...prev]); toast({ title: "New task posted!", description: p.title }); });
    socket.on("application:status", (d: any) => setApplications(prev => prev.map(a => a._id === d.applicationId ? {...a, status: d.status} : a)));
    socket.on("notification", (n: any) => setNotifications(prev => [{ id: Date.now().toString(), ...n }, ...prev]));
    return () => { socket.disconnect(); };
  }, [user]);

  const appliedIds = new Set(applications.map(a => a.problemId));

  const handleApplySuccess = (problemId: string) => {
    applicationsApi.getMine().then(({ applications }) => setApplications(applications));
    setProblems(prev => prev.map(p => p._id === problemId ? {...p, applicationCount: p.applicationCount + 1} : p));
  };

  const stats = {
    applied: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    accepted: applications.filter(a => a.status === "accepted").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0fdf9 0%, #e8f4f8 50%, #f0f9ff 100%)" }}>
      <Navbar />

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-purple-100 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={user.avatar} className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                  {user?.fullName?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-purple-600 font-medium">Freelancer Dashboard</p>
                <h1 className="text-2xl font-bold text-gray-900">Hey, {user?.fullName?.split(" ")[0]} 👋</h1>
                <p className="text-sm text-gray-500 mt-0.5">Find your next big collaboration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button size="sm" variant="outline" className="relative border-purple-200" onClick={() => setNotifications([])}>
                  <Bell size={15} />
                  <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{notifications.length}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Total Applied",  value: stats.applied,  color: "text-gray-700",   bg: "bg-white" },
              { label: "In Review",      value: stats.pending,  color: "text-amber-600",  bg: "bg-amber-50" },
              { label: "Accepted 🎉",    value: stats.accepted, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-white/80 p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick access ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: User,         label: "My Profile",   sub: "Edit info & skills",   path: "/profile",     gradient: "from-purple-600 to-purple-500" },
            { icon: MessageCircle, label: "Messages",    sub: "Chat with startups",    path: "/chat",        gradient: "from-blue-500 to-indigo-500" },
            { icon: CheckCircle2, label: "Milestones",  sub: "Track active projects", path: "/milestones",  gradient: "from-purple-600 to-purple-500" },
            { icon: Star,         label: "My Ratings",  sub: "View feedback",         path: "/ratings",     gradient: "from-orange-400 to-amber-500" },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left p-4"
            >
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white mb-3`}>
                <item.icon size={17} />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>

        {/* ── Tab navigation ────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white/60 rounded-xl border border-gray-100 p-1 mb-6 w-fit">
          {[
            { id: "browse",       label: "Browse Tasks",      icon: Search },
            { id: "applications", label: `My Applications (${applications.length})`, icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Document Upload Notification ─────────────────────────────────────── */}
        {(profile as any)?.freelancerProfile && !((profile as any).freelancerProfile?.identityProof) && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Upload Your Identity Proof</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Startups trust verified freelancers more and are more likely to shortlist you. Upload a Google Drive link of your government ID to your profile.
              </p>
            </div>
            <button onClick={() => navigate("/profile")}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 border border-amber-300 bg-white px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
              Upload Now →
            </button>
          </div>
        )}

        {/* ── Browse Tasks ──────────────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{problems.length} open tasks available</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/explore")} className="border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5">
                <Zap size={13} /> Advanced filters
              </Button>
            </div>

            {loadingProblems ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-purple-500" /></div>
            ) : problems.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
                <BookOpen size={40} className="mx-auto text-purple-200 mb-3" />
                <p className="text-gray-500">No open tasks right now.</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon — startups post new tasks daily!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {problems.map(p => {
                  const applied = appliedIds.has(p._id);
                  const startup = p.startupUserId as any;
                  return (
                    <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Startup info */}
                          {startup?.fullName && (
                            <div className="flex items-center gap-1.5 mb-2">
                              {startup.avatar
                                ? <img src={startup.avatar} className="h-5 w-5 rounded-full object-cover" />
                                : <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[10px] font-bold">{startup.fullName[0]}</div>
                              }
                              <button onClick={() => navigate(`/profile/${startup._id || startup.id}`)} className="text-xs text-gray-400 hover:text-primary hover:underline transition-colors">{startup.fullName}</button>
                            </div>
                          )}
                          <h3 className="font-semibold text-gray-900">{p.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">{t}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            {p.budget && <span className="font-semibold text-gray-700">{p.budget}</span>}
                            {p.timeline && <span className="flex items-center gap-1"><Clock size={10}/>{p.timeline}</span>}
                            <span className="flex items-center gap-1"><Users size={10}/>{p.applicationCount} applicants</span>
                            <span>{timeAgo(p.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {applied ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200">
                              <CheckCircle2 size={12} /> Applied
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setApplyTarget(p)}
                              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 shadow-sm"
                            >
                              Apply <ArrowUpRight size={13} className="ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── My Applications ───────────────────────────────────────────────── */}
        {activeTab === "applications" && (
          <div>
            {loadingApps ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-purple-500" /></div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
                <FileText size={40} className="mx-auto text-purple-200 mb-3" />
                <p className="text-gray-500">No applications yet.</p>
                <Button className="mt-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white border-0" onClick={() => setActiveTab("browse")}>
                  Browse Tasks
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(a => (
                  <div key={a._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{a.problemTitle}</h3>
                          <StatusPill status={a.status} />
                        </div>
                        {a.coverNote && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2 italic">"{a.coverNote}"</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {a.skills?.slice(0, 4).map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs border border-purple-100">{s}</span>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          {a.deliveryTimeline && <span className="flex items-center gap-1"><Clock size={10}/>{a.deliveryTimeline}</span>}
                          {a.expectedBudget && <span>{a.expectedBudget}</span>}
                          <span>{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {a.resumeLink && (
                            <a href={a.resumeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <FileText size={10}/> Resume
                            </a>
                          )}
                          {(a as any).githubLink && (
                            <a href={(a as any).githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-600 hover:underline">
                              <Github size={10}/> GitHub
                            </a>
                          )}
                          {(a as any).linkedinLink && (
                            <a href={(a as any).linkedinLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-sky-600 hover:underline">
                              <Linkedin size={10}/> LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/applications/${a._id}`)}
                          className="text-xs text-purple-600 hover:bg-purple-50"
                        >
                          View <ChevronRight size={13} />
                        </Button>
                        {a.status === "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => navigate("/chat")} className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50">
                            <MessageCircle size={12} className="mr-1"/> Message
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply dialog */}
      {applyTarget && (
        <ApplyDialog
          problem={applyTarget}
          open={!!applyTarget}
          onClose={() => setApplyTarget(null)}
          onSuccess={handleApplySuccess}
          existingSkills={existingSkills}
          existingPortfolio={existingPortfolio}
          existingGithub={profile?.freelancerProfile?.githubLink || ""}
          existingLinkedin={profile?.freelancerProfile?.linkedinLink || ""}
        />
      )}
    </div>
  );
};

export default FreelancerDashboard;
