import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Globe, Linkedin, Github, MapPin, Clock,
  Shield, FileText, ExternalLink, Building2, Users,
  Briefcase, MessageCircle, Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { profileApi, messagesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const safeUrl = (url: string) => {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
};

const LinkBtn = ({ href, icon: Icon, label, color = "gray" }: any) => {
  if (!href) return null;
  const colors: any = {
    gray:   "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    green:  "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    purple: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    blue:   "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    sky:    "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
  };
  return (
    <a href={safeUrl(href)} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${colors[color]}`}>
      <Icon size={12}/>{label}
    </a>
  );
};

const Section = ({ title, children }: any) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</h3>
    {children}
  </div>
);

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { toast }   = useToast();

  const [data,    setData]    = useState<any>(null);
  const [tasks,   setTasks]   = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    profileApi.getPublic(userId)
      .then(res => { setData(res); setTasks(res.tasks || []); setCollabs(res.collabPosts || []); })
      .catch(() => toast({ title: "Could not load profile", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleMessage = async () => {
    setStarting(true);
    try {
      await messagesApi.startConversation(userId!);
      navigate(`/chat?userId=${userId}`);
    } catch (err: any) {
      toast({ title: "Could not open chat", description: err.message, variant: "destructive" });
    } finally { setStarting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar/>
      <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary"/></div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background"><Navbar/>
      <div className="text-center py-20 text-gray-400">Profile not found</div>
    </div>
  );

  const { user: u, profile: p } = data;
  const isStartup    = u.role === "startup";
  const isFreelancer = u.role === "freelancer";
  const isOwnProfile = user?.id === userId;
  const accentColor  = isStartup ? "green" : "purple";
  const accentClass  = isStartup
    ? "bg-green-700 text-white"
    : "bg-purple-700 text-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Navbar/>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16}/> Back
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {u.avatar ? (
                <img src={u.avatar} className="h-16 w-16 rounded-2xl object-cover shadow-sm"/>
              ) : (
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${accentClass}`}>
                  {u.fullName?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{u.fullName}</h1>
                {isStartup && p?.startupName && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <Building2 size={13}/>{p.startupName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${accentClass}`}>
                    {isStartup ? "Startup" : "Freelancer"}
                  </span>
                  {p?.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={11}/>{p.location}
                    </span>
                  )}
                  {isFreelancer && p?.availability && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11}/>{p.availability}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {!isOwnProfile && (
              <button onClick={handleMessage} disabled={starting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  isStartup ? "bg-green-700 hover:bg-green-800" : "bg-purple-700 hover:bg-purple-800"
                } disabled:opacity-60`}>
                {starting ? <Loader2 size={14} className="animate-spin"/> : <MessageCircle size={14}/>}
                Send Message
              </button>
            )}
          </div>

          {/* Bio / Description */}
          {(p?.bio || p?.description) && (
            <p className="text-sm text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-100">
              {p.bio || p.description}
            </p>
          )}

          {/* Tags */}
          {u.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {u.tags.map((t: string) => (
                <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isStartup ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-purple-50 text-purple-700 border border-purple-100"
                }`}>{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {/* ── Startup specific ── */}
          {isStartup && p && (
            <>
              <Section title="Startup Details">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {p.industry     && <div><p className="text-xs text-gray-400 mb-0.5">Industry</p><p className="font-medium text-gray-800">{p.industry}</p></div>}
                  {p.fundingStage && <div><p className="text-xs text-gray-400 mb-0.5">Funding Stage</p><p className="font-medium text-gray-800">{p.fundingStage}</p></div>}
                  {p.teamSize     && <div><p className="text-xs text-gray-400 mb-0.5">Team Size</p><p className="font-medium text-gray-800 flex items-center gap-1"><Users size={13}/>{p.teamSize}</p></div>}
                  {p.location     && <div><p className="text-xs text-gray-400 mb-0.5">Location</p><p className="font-medium text-gray-800 flex items-center gap-1"><MapPin size={13}/>{p.location}</p></div>}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <LinkBtn href={p.website}      icon={Globe}    label="Website"  color="green"/>
                  <LinkBtn href={p.linkedinPage} icon={Linkedin} label="LinkedIn" color="sky"/>
                  {p.pitchDeck && <LinkBtn href={p.pitchDeck} icon={FileText} label="Pitch Deck" color="purple"/>}
                </div>
              </Section>

              {/* Verification */}
              <Section title="Verification Documents">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Shield size={15} className={p.identityProof ? "text-green-600" : "text-gray-300"}/>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Founder Identity Proof</p>
                        <p className="text-xs text-gray-400">Government-issued ID</p>
                      </div>
                    </div>
                    {p.identityProof ? (
                      <a href={safeUrl(p.identityProof)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline">
                        <ExternalLink size={11}/> View
                      </a>
                    ) : <span className="text-xs text-gray-300">Not uploaded</span>}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className={p.companyDocument ? "text-green-600" : "text-gray-300"}/>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Company Document</p>
                        <p className="text-xs text-gray-400">GST / Incorporation / MSME</p>
                      </div>
                    </div>
                    {p.companyDocument ? (
                      <a href={safeUrl(p.companyDocument)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline">
                        <ExternalLink size={11}/> View
                      </a>
                    ) : <span className="text-xs text-gray-300">Not uploaded</span>}
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── Freelancer specific ── */}
          {isFreelancer && p && (
            <>
              <Section title="Skills & Expertise">
                {p.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.skills.map((s: string) => (
                      <span key={s} className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                )}
                <div className="grid sm:grid-cols-3 gap-4 text-sm mt-2">
                  {p.experience  && <div><p className="text-xs text-gray-400 mb-0.5">Experience</p><p className="font-medium text-gray-800 flex items-center gap-1"><Briefcase size={12}/>{p.experience}</p></div>}
                  {p.availability&& <div><p className="text-xs text-gray-400 mb-0.5">Availability</p><p className="font-medium text-gray-800 flex items-center gap-1"><Clock size={12}/>{p.availability}</p></div>}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <LinkBtn href={p.portfolioLink} icon={Globe}    label="Portfolio" color="purple"/>
                  <LinkBtn href={p.githubLink}    icon={Github}   label="GitHub"    color="gray"/>
                  <LinkBtn href={p.linkedinLink}  icon={Linkedin} label="LinkedIn"  color="sky"/>
                  {p.resumeLink && <LinkBtn href={p.resumeLink} icon={FileText} label="Resume" color="purple"/>}
                </div>
              </Section>

              {/* Verification */}
              <Section title="Verification Documents">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Shield size={15} className={p.identityProof ? "text-purple-600" : "text-gray-300"}/>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Identity Proof</p>
                        <p className="text-xs text-gray-400">Government-issued ID</p>
                      </div>
                    </div>
                    {p.identityProof ? (
                      <a href={safeUrl(p.identityProof)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-purple-700 font-semibold hover:underline">
                        <ExternalLink size={11}/> View
                      </a>
                    ) : <span className="text-xs text-gray-300">Not uploaded</span>}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className={p.resumeLink ? "text-purple-600" : "text-gray-300"}/>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Resume / CV</p>
                        <p className="text-xs text-gray-400">Professional resume</p>
                      </div>
                    </div>
                    {p.resumeLink ? (
                      <a href={safeUrl(p.resumeLink)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-purple-700 font-semibold hover:underline">
                        <ExternalLink size={11}/> View
                      </a>
                    ) : <span className="text-xs text-gray-300">Not uploaded</span>}
                  </div>
                </div>
              </Section>
            </>
          )}
          {/* ── Startup: Posted Tasks ── */}
          {isStartup && tasks.length > 0 && (
            <Section title="Posted Tasks">
              <div className="space-y-3">
                {tasks.map((t: any) => (
                  <div key={t._id} className="border border-gray-100 rounded-xl p-4 hover:border-green-200 hover:bg-green-50/30 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{t.title}</h4>
                      {t.budget && <span className="text-xs font-bold text-green-700 flex-shrink-0">{t.budget}</span>}
                    </div>
                    {t.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(t.tags || []).slice(0, 4).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-medium">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                      {t.timeline && <span className="flex items-center gap-1"><Clock size={9}/>{t.timeline}</span>}
                      <span className="flex items-center gap-1"><Users size={9}/>{t.applicationCount || 0} applicant{t.applicationCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Startup: Collab Posts ── */}
          {isStartup && collabs.length > 0 && (
            <Section title="Collaboration Posts">
              <div className="space-y-3">
                {collabs.map((col: any) => (
                  <div key={col._id} className="border border-gray-100 rounded-xl p-4 hover:border-green-200 hover:bg-green-50/30 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{col.title}</h4>
                      {col.lookingFor && (
                        <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0 capitalize">{col.lookingFor}</span>
                      )}
                    </div>
                    {col.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{col.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(col.tags || []).slice(0, 4).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {isStartup && tasks.length === 0 && collabs.length === 0 && (
            <Section title="Activity">
              <p className="text-sm text-gray-400 text-center py-4">No public posts yet.</p>
            </Section>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
