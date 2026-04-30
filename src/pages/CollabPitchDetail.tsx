import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Building2, Handshake,
  Target, Clock, Globe, Linkedin, ExternalLink,
  MessageCircle, Check
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { collabPitchesApi, messagesApi, type CollabPitch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
    {children}
  </div>
);

const CollabPitchDetail = () => {
  const { pitchId } = useParams<{ pitchId: string }>();
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const { user }     = useAuth();

  const [pitch,      setPitch]      = useState<CollabPitch | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!pitchId) return;
    // Try sessionStorage cache first for instant load
    const stored = sessionStorage.getItem(`pitch_${pitchId}`);
    if (stored) {
      setPitch(JSON.parse(stored));
      setLoading(false);
      return;
    }
    // Fallback: fetch from API (handles direct URL / refresh)
    collabPitchesApi.getById(pitchId)
      .then(({ pitch }) => { setPitch(pitch); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pitchId]);

  const handleConnect = async () => {
    if (!pitch) return;
    setConnecting(true);
    try {
      await collabPitchesApi.connect(pitch._id);
      const myId = user?.id;
      const chatWithId = myId && myId === pitch.pitcherUserId
        ? pitch.receiverUserId
        : pitch.pitcherUserId;
      await messagesApi.startConversation(chatWithId);
      setPitch(p => p ? { ...p, status: "connected" } : p);
      toast({ title: "Connected! 🤝", description: `You're now connected.` });
      navigate(`/chat?userId=${chatWithId}`);
    } catch (err: any) {
      toast({ title: "Could not connect", description: err.message, variant: "destructive" });
    } finally { setConnecting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 to-background">
      <Navbar />
      <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-green-500"/></div>
    </div>
  );

  if (!pitch) return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 to-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <Building2 size={48} className="mx-auto text-gray-200 mb-4"/>
        <p className="text-gray-500 font-medium">Pitch not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-green-700 text-sm hover:underline flex items-center gap-1 mx-auto">
          <ArrowLeft size={14}/> Go back
        </button>
      </div>
    </div>
  );

  const isConnected = pitch.status === "connected";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/30 to-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16}/> Back to pitches
        </button>

        {/* Header card */}
        <div className={`rounded-2xl border p-6 mb-5 ${isConnected ? "border-green-300 bg-green-50/30" : "border-gray-100 bg-white"} shadow-sm`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-green-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {(pitch.startupName || pitch.pitcherName)[0]?.toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{pitch.startupName || pitch.pitcherName}</h1>
                  {pitch.tagline && <p className="text-sm text-gray-500 italic">"{pitch.tagline}"</p>}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-[52px]">Submitted {timeAgo(pitch.createdAt)}</p>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${
              isConnected ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {isConnected ? "✓ Connected" : "Pending"}
            </span>
          </div>

          {/* Key chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {pitch.sector   && <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium">{pitch.sector}</span>}
            {pitch.stage    && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">{pitch.stage}</span>}
            {pitch.teamSize && <span className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-xs">👥 {pitch.teamSize}</span>}
            {pitch.location && <span className="px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-xs">📍 {pitch.location}</span>}
          </div>
        </div>

        {/* Details sections */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">

          {pitch.collabType && (
            <div className="p-5">
              <Section title="Type of Collaboration">
                <div className="flex items-center gap-2">
                  <Handshake size={14} className="text-green-500"/>
                  <span className="text-sm font-semibold text-gray-800">{pitch.collabType}</span>
                </div>
              </Section>
            </div>
          )}

          {pitch.whatYouOffer && (
            <div className="p-5">
              <Section title="What They Bring to the Table">
                <p className="text-sm text-gray-700 leading-relaxed">{pitch.whatYouOffer}</p>
              </Section>
              {pitch.yourTech?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {pitch.yourTech.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-green-50 text-indigo-700 border border-indigo-100 rounded-full text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {pitch.collabGoal && (
            <div className="p-5">
              <Section title="Collaboration Goal">
                <p className="text-sm text-gray-700 leading-relaxed">{pitch.collabGoal}</p>
              </Section>
            </div>
          )}

          {(pitch.yourAsk || pitch.timeline) && (
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              {pitch.yourAsk && (
                <Section title="What They Need From You">
                  <p className="text-sm text-gray-700">{pitch.yourAsk}</p>
                </Section>
              )}
              {pitch.timeline && (
                <Section title="Expected Timeline">
                  <p className="text-sm text-gray-700 flex items-center gap-1.5"><Clock size={13} className="text-gray-400"/>{pitch.timeline}</p>
                </Section>
              )}
            </div>
          )}

          {pitch.pastWins && (
            <div className="p-5">
              <Section title="Key Achievements / Traction">
                <p className="text-sm text-gray-700 leading-relaxed">{pitch.pastWins}</p>
              </Section>
            </div>
          )}

          {(pitch.website || pitch.linkedin || pitch.demoLink) && (
            <div className="p-5">
              <Section title="Links">
                <div className="flex flex-wrap gap-2 mt-1">
                  {pitch.website && (
                    <a href={safeUrl(pitch.website)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 text-xs font-medium transition-colors">
                      <Globe size={12}/> Website
                    </a>
                  )}
                  {pitch.linkedin && (
                    <a href={safeUrl(pitch.linkedin)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-medium transition-colors">
                      <Linkedin size={12}/> LinkedIn
                    </a>
                  )}
                  {pitch.demoLink && (
                    <a href={safeUrl(pitch.demoLink)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-medium transition-colors">
                      <ExternalLink size={12}/> Demo / Deck
                    </a>
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-5">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 hover:bg-green-800 text-white text-base font-bold transition-colors shadow-sm disabled:opacity-60"
            >
              {connecting ? <Loader2 size={16} className="animate-spin"/> : <Handshake size={16}/>}
              {connecting ? "Connecting…" : "Connect & Start Chat"}
            </button>
          ) : (
            <button
              onClick={async () => {
                if (!pitch) return;
                // Determine who to chat with based on who is viewing
                const myId = user?.id;
                const chatWithId = myId && myId === pitch.pitcherUserId
                  ? pitch.receiverUserId
                  : pitch.pitcherUserId;
                if (!chatWithId) {
                  toast({ title: "Cannot open chat", description: "Could not determine the other user.", variant: "destructive" });
                  return;
                }
                try {
                  await messagesApi.startConversation(chatWithId);
                } catch (err: any) {
                  console.error("startConversation error:", err?.message);
                }
                navigate(`/chat?userId=${chatWithId}`);
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-100 hover:bg-green-200 text-green-700 text-base font-bold transition-colors"
            >
              <MessageCircle size={16}/> Open Chat
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CollabPitchDetail;
