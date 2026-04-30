import React, { useState, useEffect, useCallback, memo } from "react";
import Navbar         from "@/components/Navbar";
import Footer         from "@/components/Footer";
import { Button }     from "@/components/ui/button";
import { Badge }      from "@/components/ui/badge";
import { Input }      from "@/components/ui/input";
import { Label }      from "@/components/ui/label";
import { Textarea }   from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search, SlidersHorizontal, X, Clock,
  Users, Calendar, Loader2, Send, ExternalLink, Handshake, MessageCircle,
} from "lucide-react";
import { useAuth }       from "@/contexts/AuthContext";
import { problemsApi, applicationsApi, collabApi, messagesApi, type Problem, type Application, type CollabRequest } from "@/lib/api";
import ApplyDialog from "@/components/ApplyDialog";
import { useToast }      from "@/hooks/use-toast";
import TagInput          from "@/components/TagInput";
import { useNavigate }   from "react-router-dom";
import PitchDialog from "@/components/PitchDialog";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 30)  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (days >= 1)  return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  return `${mins}m ago`;
};


// ── FilterPanel — user types tags, not pre-built list ─────────────────────────
interface FilterPanelProps {
  sortBy: string; setSortBy: (v: string) => void;
  selectedTags: string[]; setSelectedTags: (fn: (prev: string[]) => string[]) => void;
  hasActiveFilters: boolean; clearFilters: () => void;
}

const FilterPanel = ({
  sortBy, setSortBy, selectedTags, setSelectedTags,
  hasActiveFilters, clearFilters,
}: FilterPanelProps) => {
  const [tagInput, setTagInput] = React.useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="space-y-5">
      {/* Sort */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Sort by</label>
        <div className="flex gap-2">
          {[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                sortBy === opt.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags — user types */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
          Filter by Skill / Tag
          {selectedTags.length > 0 && (
            <span className="ml-2 text-primary font-normal normal-case">({selectedTags.length} active)</span>
          )}
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
            }}
            placeholder="Type a skill & press Enter…"
            className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <button
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim()}
            className="px-2.5 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-all flex-shrink-0"
          >
            Add
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Press Enter or comma to add multiple tags</p>

        {/* Active tag chips */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button
          className="w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 hover:bg-accent transition-colors"
          onClick={clearFilters}
        >
          ✕ Clear all filters
        </button>
      )}
    </div>
  );
};

// ── Main ExploreProblems page ──────────────────────────────────────────────────
const ExploreProblems = () => {
  const isMobile       = useIsMobile();
  const navigate       = useNavigate();
  const { user, profile, signInWithGoogle } = useAuth();
  const { toast }      = useToast();

  const [problems,      setProblems]      = useState<Problem[]>([]);
  const [allTags,       setAllTags]       = useState<string[]>([]);
  const [selected,      setSelected]      = useState<Problem | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);

  // Applied problem IDs
  const [appliedIds,    setAppliedIds]    = useState<Set<string>>(new Set());

  // Apply dialog
  const [applyTarget,   setApplyTarget]   = useState<Problem | null>(null);

  // Filters
  const [search,        setSearch]        = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTags,  setSelectedTags]  = useState<string[]>([]);
  const [sortBy,        setSortBy]        = useState("newest");
  const [showFilters,   setShowFilters]   = useState(false);

  // Collab contact state
  const [contactingId,   setContactingId]   = useState<string | null>(null);
  const [pitchTarget,    setPitchTarget]     = useState<{ userId: string; name: string; title: string } | null>(null);

  const handleContactStartup = async (posterUserId: string) => {
    setContactingId(posterUserId);
    try {
      await messagesApi.startConversation(posterUserId);
      navigate("/chat");
    } catch (err: any) {
      toast({ title: "Could not start conversation", description: err.message, variant: "destructive" });
    } finally {
      setContactingId(null);
    }
  };

  // Explore mode toggle (startups can switch between Tasks and Collab Posts)
  const [exploreMode,   setExploreMode]   = useState<"tasks" | "collabs">("tasks");
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);

  const LIMIT = 15;
  const isStartupUser = profile?.role === "startup";

  // Load collab requests when startup switches to Collabs view
  useEffect(() => {
    if (exploreMode !== "collabs") return;
    setLoadingCollabs(true);
    collabApi.getAll()
      .then(({ requests }) => setCollabRequests(requests))
      .catch(() => {})
      .finally(() => setLoadingCollabs(false));
  }, [exploreMode]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch problems
  const fetchProblems = useCallback(async (p: number, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params: any = { page: p, limit: LIMIT, sortBy };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedTags.length) params.tags = selectedTags.join(",");

      const res = await problemsApi.getAll(params);
      setProblems(prev => append ? [...prev, ...res.problems] : res.problems);
      setTotal(res.total);
      if (res.allTags?.length)      setAllTags(res.allTags);

      // Select first on fresh load
      if (!append && res.problems.length && !isMobile) {
        setSelected(res.problems[0]);
      }
    } catch {
      toast({ title: "Could not load problems", variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedTags, sortBy]);

  // Reset + refetch on filter change
  useEffect(() => {
    setPage(1);
    fetchProblems(1, false);
  }, [fetchProblems]);

  // Load applied IDs for freelancers
  useEffect(() => {
    // Only fetch for logged-in freelancers - guests and startups don't apply
    if (!user || isStartupUser) return;
    applicationsApi.getMine()
      .then(({ applications }) => setAppliedIds(new Set(applications.map(a => a.problemId))))
      .catch(() => {});
  }, [user, isStartupUser]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProblems(next, true);
  };

  const handleApplySuccess = (problemId: string) => {
    setAppliedIds(prev => new Set([...prev, problemId]));
    setProblems(prev =>
      prev.map(p => p._id === problemId
        ? { ...p, applicationCount: p.applicationCount + 1 }
        : p
      )
    );
  };

  const clearFilters = () => {
    setSearch(""); setSelectedTags([]); setSortBy("newest");
  };
  const hasActiveFilters = !!(search || selectedTags.length || sortBy !== "newest");

  // ── Problem list card ──────────────────────────────────────────────────────
  const ProblemCard = ({ problem, compact = false }: { problem: Problem; compact?: boolean }) => {
    const isSelected = selected?._id === problem._id;
    const applied    = appliedIds.has(problem._id);
    const startup    = problem.startupUserId as any;

    return (
      <button
        onClick={() => { setSelected(problem); }}
        className={`group w-full text-left rounded-xl border p-4 transition-all ${
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        {/* Startup */}
        {startup?.fullName && (
          <div className="flex items-center gap-1.5 mb-2">
            {startup.avatar
              ? <img src={startup.avatar} className="h-5 w-5 rounded-full object-cover" />
              : <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-semibold">{startup.fullName[0]}</div>
            }
            <span className="text-xs text-muted-foreground">{startup.fullName}</span>
          </div>
        )}

        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {problem.title}
        </h3>

        {!compact && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{problem.description}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-1">
          {problem.tags.slice(0, 3).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">{t}</span>
          ))}
          {problem.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground self-center">+{problem.tags.length - 3}</span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {problem.budget && (
              <span className="font-medium text-foreground">{problem.budget}</span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock size={10} /> {timeAgo(problem.createdAt)}
            </span>
            <span className="flex items-center gap-0.5">
              <Users size={10} /> {problem.applicationCount}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Applied</span>
          )}
        </div>
      </button>
    );
  };

  // ── Detail panel content ───────────────────────────────────────────────────
  const DetailPanel = ({ p }: { p: Problem }) => {
    const applied  = appliedIds.has(p._id);
    const startup  = p.startupUserId as any;

    return (
      <div className="space-y-5">
        {/* Header */}
        {startup?.fullName && (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/profile/${startup._id || startup.id}`)} className="flex-shrink-0">
              {startup.avatar
                ? <img src={startup.avatar} className="h-8 w-8 rounded-full object-cover hover:opacity-80 transition-opacity" />
                : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary font-semibold hover:bg-primary/20 transition-colors">{startup.fullName[0]}</div>
              }
            </button>
            <div>
              <button onClick={() => navigate(`/profile/${startup._id || startup.id}`)}
                className="text-sm font-medium text-foreground hover:text-primary hover:underline transition-colors">
                {startup.fullName}
              </button>
              <p className="text-xs text-muted-foreground">Startup</p>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-foreground">{p.title}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={12} /> Posted {timeAgo(p.createdAt)}</span>
            <span className="flex items-center gap-1"><Users size={12} /> {p.applicationCount} applicant{p.applicationCount !== 1 ? "s" : ""}</span>
            {p.timeline && <span className="flex items-center gap-1"><Clock size={12} /> {p.timeline}</span>}
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{p.description}</p>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Skills Required</p>
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>

        {p.budget && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Budget / Compensation</p>
            <p className="text-lg font-bold text-primary">{p.budget}</p>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2">
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <button className="text-primary underline" onClick={() => navigate("/")}>Sign in</button> to apply
            </p>
          ) : isStartupUser ? (
            <p className="text-sm text-muted-foreground italic">Startups cannot apply to problems.</p>
          ) : applied ? (
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <span className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</span>
              You've already applied
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setApplyTarget(p)}>
              <Send size={15} className="mr-2" /> Apply for this Problem
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Explore Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${total} open task${total !== 1 ? "s" : ""}`}
            </p>
          </div>

          {isStartupUser && (
            <Button onClick={() => navigate("/post-problem")}>Post a Task</Button>
          )}
        </div>

        {/* ── Search + filter bar ───────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-10"
              placeholder="Search by title, skill, or keyword…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile: Sheet filter */}
          {isMobile ? (
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 px-3 relative">
                  <SlidersHorizontal size={15} />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <FilterPanel
                sortBy={sortBy} setSortBy={setSortBy}
                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
                hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
              />
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="outline"
              className={`h-10 px-3 relative ${showFilters ? "bg-accent" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={15} />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
              )}
            </Button>
          )}
        </div>

        {/* Toggle: Tasks vs Collab Posts — visible to all logged-in users */}
        {user && (
          <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-4 w-fit">
            <button
              onClick={() => setExploreMode("tasks")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                exploreMode === "tasks"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search size={14} /> Explore Tasks
            </button>
            <button
              onClick={() => setExploreMode("collabs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                exploreMode === "collabs"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Handshake size={14} /> Collab Posts
            </button>
          </div>
        )}

        {/* ── Guest hero banner — shown when not signed in ───────────────── */}
        {!user && !loading && (
          <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-primary/5 via-primary/10 to-green-50 border border-primary/20">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none"/>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-200/40 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none"/>

            <div className="relative px-8 py-10 text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold mb-4 border border-primary/20">
                🚀 Where Startups & Freelancers Collaborate
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Find your next collaboration,<br/>
                <span className="text-primary">right here.</span>
              </h2>
              <p className="text-muted-foreground text-base mb-2">
                CoHustle connects startups with skilled freelancers. Browse real tasks, apply with your portfolio, and build something great together.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-7 mt-4">
                {[
                  { icon: "🎯", text: "Real tasks from funded startups" },
                  { icon: "💼", text: "Apply with your portfolio & pitch" },
                  { icon: "🤝", text: "Collaborate & get paid" },
                ].map(f => (
                  <div key={f.text} className="flex items-center gap-1.5">
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2.5 bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 text-base"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="white" fillOpacity="0.9"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="white" fillOpacity="0.9"/>
                </svg>
                Join CoHustle with Google
              </button>
              <p className="text-xs text-muted-foreground mt-3">Free to join · No credit card needed</p>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {tag}
                <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="hover:text-primary/60">
                  <X size={10} />
                </button>
              </span>
            ))}
            {sortBy !== "newest" && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                ↕ {sortBy === "oldest" ? "Oldest first" : sortBy}
                <button onClick={() => setSortBy("newest")}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="flex gap-6">

          {/* Desktop filter sidebar */}
          {!isMobile && showFilters && (
            <aside className="w-56 flex-shrink-0">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground mb-4">Filters</p>
                <FilterPanel
                sortBy={sortBy} setSortBy={setSortBy}
                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
                hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
              />
              </div>
            </aside>
          )}

          {/* Collab Posts view — visible to all logged-in users */}
          {user && exploreMode === "collabs" && (
            <div className="flex-1">
              {loadingCollabs ? (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
              ) : collabRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Handshake size={40} className="text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground">No collaboration posts yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to post a collaboration request</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collabRequests.map(req => {
                    const poster = req.userId as any;
                    return (
                      <div key={req._id} className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow">
                        {poster?.fullName && (
                          <div className="flex items-center gap-2 mb-2">
                            {poster.avatar
                              ? <img src={poster.avatar} className="h-6 w-6 rounded-full object-cover" />
                              : <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] text-primary font-semibold">{poster.fullName[0]}</div>
                            }
                            <button onClick={() => navigate(`/profile/${poster._id || poster.id}`)} className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">{poster.fullName}</button>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground capitalize">{poster.role}</span>
                          </div>
                        )}
                        <h3 className="font-semibold text-foreground">{req.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{req.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                            Looking for: {req.lookingFor}
                          </span>
                          {req.tags.map(t => (
                            <span key={t} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          {/* Actions — only for other users' posts */}
                          {user && poster?._id && poster._id !== (user as any).id && (
                            <div className="flex items-center gap-2">
                              {/* Message button — start chat */}
                              <button
                                disabled={contactingId === poster._id}
                                onClick={() => handleContactStartup(poster._id)}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-60"
                              >
                                {contactingId === poster._id
                                  ? <><Loader2 size={11} className="animate-spin"/> Connecting…</>
                                  : <><MessageCircle size={11}/> Message</>}
                              </button>
                              {/* Pitch button — only startups can pitch to other startups */}
                              {isStartupUser && (
                                <button
                                  onClick={() => setPitchTarget({ userId: req._id, name: poster.fullName, title: req.title })}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                  🚀 Pitch to Collaborate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Problem list — shown when in tasks mode (or freelancers always) */}
          {(!user || exploreMode === "tasks") && (
          <div className={`flex flex-col gap-3 ${!isMobile && selected ? "w-[360px] flex-shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto pr-1" : "flex-1"}`}>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : problems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search size={40} className="text-muted-foreground/30 mb-3" />
                <p className="font-medium text-foreground">No tasks found</p>
                <p className="text-sm text-muted-foreground mt-1">Try different filters</p>
                {hasActiveFilters && (
                  <Button variant="ghost" className="mt-3" onClick={clearFilters}>Clear filters</Button>
                )}
              </div>
            ) : (
              <>
                {problems.map(p => <ProblemCard key={p._id} problem={p} />)}

                {/* Load more */}
                {problems.length < total && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loadingMore}
                    onClick={loadMore}
                  >
                    {loadingMore
                      ? <><Loader2 size={14} className="animate-spin mr-2" />Loading…</>
                      : `Load more (${total - problems.length} remaining)`}
                  </Button>
                )}
              </>
            )}
          </div>

          )} {/* end tasks mode conditional */}

          {/* Desktop detail panel — only in tasks mode */}
          {(!user || exploreMode === "tasks") && !isMobile && selected && (
            <div className="flex-1 min-w-0">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 max-h-[calc(100vh-160px)] overflow-y-auto">
                {DetailPanel({ p: selected })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile detail dialog */}
      <Dialog open={isMobile && !!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selected && DetailPanel({ p: selected })}
        </DialogContent>
      </Dialog>

      {/* Startup Pitch dialog */}
      {pitchTarget && (
        <PitchDialog
          open={!!pitchTarget}
          recipientId={pitchTarget.userId}
          recipientName={pitchTarget.name}
          postTitle={pitchTarget.title}
          onClose={() => setPitchTarget(null)}
          onSuccess={() => { setPitchTarget(null); toast({ title: 'Pitch submitted! 🚀', description: 'The startup will review your pitch.' }); }}
        />
      )}

      {/* Apply proposal dialog */}
      {applyTarget && (
        <ApplyDialog
          problem={applyTarget}
          open={!!applyTarget}
          onClose={() => setApplyTarget(null)}
          onSuccess={(problemId: string) => handleApplySuccess(problemId)}
        />
      )}

      <Footer />
    </div>
  );
};

export default ExploreProblems;
