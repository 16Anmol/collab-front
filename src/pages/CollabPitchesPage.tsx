import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Building2, Handshake,
  ArrowUpRight, Users
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { collabPitchesApi, messagesApi, type CollabPitch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60000)}m ago`;
};

// ── Compact Pitch Card ─────────────────────────────────────────────────────────
// Shows only: name, tagline, sector/stage, collab type, status
// "View Full Pitch" → opens detail page
const PitchCard = ({
  pitch, onConnect, connecting, onView,
}: {
  pitch: CollabPitch;
  onConnect: (pitch: CollabPitch) => void;
  connecting: string | null;
  onView: (pitch: CollabPitch) => void;
}) => {
  const nav          = useNavigate();
  const isConnected  = pitch.status === "connected";
  const isConnecting = connecting === pitch._id;

  return (
    <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-all hover:shadow-md ${
      isConnected ? "border-green-300 ring-2 ring-teal-100" : "border-gray-100"
    }`}>
      {/* Connected banner */}
      {isConnected && (
        <div className="bg-green-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-1.5">
          <Handshake size={12}/> Connected Collaborator
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header: avatar + name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(pitch.startupName || pitch.pitcherName)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">{pitch.startupName || pitch.pitcherName}</p>
              {pitch.tagline && (
                <p className="text-xs text-gray-400 italic truncate">"{pitch.tagline}"</p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(pitch.createdAt)}</p>
            </div>
          </div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
            isConnected
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {isConnected ? "Connected" : "Pending"}
          </span>
        </div>

        {/* Sector / Stage chips — the only info shown on card */}
        <div className="flex flex-wrap gap-1.5">
          {pitch.sector   && <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-medium">{pitch.sector}</span>}
          {pitch.stage    && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-medium">{pitch.stage}</span>}
          {pitch.teamSize && <span className="px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-[10px]">👥 {pitch.teamSize}</span>}
        </div>

        {/* Collab type — single line only */}
        {pitch.collabType && (
          <div className="flex items-center gap-1.5">
            <Handshake size={11} className="text-green-500 flex-shrink-0"/>
            <span className="text-xs text-gray-600 font-medium truncate">{pitch.collabType}</span>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
        {/* View Full Pitch — always visible, opens detail page */}
        <button
          onClick={() => onView(pitch)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-semibold transition-colors"
        >
          <ArrowUpRight size={12}/> View Full Pitch
        </button>

        {/* Connect or Open Chat */}
        {!isConnected ? (
          <button
            onClick={() => onConnect(pitch)}
            disabled={isConnecting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-800 text-white text-xs font-bold transition-colors disabled:opacity-60"
          >
            {isConnecting
              ? <Loader2 size={11} className="animate-spin"/>
              : <Handshake size={11}/>}
            {isConnecting ? "…" : "Connect"}
          </button>
        ) : (
          <button
            onClick={async () => {
              try { await messagesApi.startConversation(pitch.pitcherUserId); } catch {}
              nav(`/chat?userId=${pitch.pitcherUserId}`);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold transition-colors"
          >
            Open Chat
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const CollabPitchesPage = () => {
  const { collabRequestId } = useParams<{ collabRequestId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pitches,    setPitches]    = useState<CollabPitch[]>([]);
  const [postTitle,  setPostTitle]  = useState("");
  const [loading,    setLoading]    = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!collabRequestId) return;
    collabPitchesApi.getForPost(collabRequestId)
      .then(({ pitches, postTitle }) => { setPitches(pitches); setPostTitle(postTitle); })
      .catch(err => toast({ title: "Could not load pitches", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [collabRequestId]);

  const handleConnect = async (pitch: CollabPitch) => {
    setConnecting(pitch._id);
    try {
      await collabPitchesApi.connect(pitch._id);
      await messagesApi.startConversation(pitch.pitcherUserId);
      setPitches(prev => prev.map(p => p._id === pitch._id ? { ...p, status: "connected" } : p));
      toast({ title: "Connected! 🤝", description: `You can now chat with ${pitch.pitcherName}.` });
      navigate(`/chat?userId=${pitch.pitcherUserId}`);
    } catch (err: any) {
      toast({ title: "Could not connect", description: err.message, variant: "destructive" });
    } finally { setConnecting(null); }
  };

  const handleView = (pitch: CollabPitch) => {
    // Store pitch data in sessionStorage so detail page can read it without an extra API call
    sessionStorage.setItem(`pitch_${pitch._id}`, JSON.stringify(pitch));
    navigate(`/collab-pitch/${pitch._id}`);
  };

  const pending   = pitches.filter(p => p.status === "pending");
  const connected = pitches.filter(p => p.status === "connected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 to-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16}/> Back
          </button>
          <div className="h-4 w-px bg-gray-200"/>
          <div>
            <p className="text-xs text-green-700 font-medium">Collaboration Pitches</p>
            <h1 className="text-xl font-bold text-gray-900">{postTitle || "Loading…"}</h1>
          </div>
        </div>

        {/* Stats */}
        {!loading && pitches.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total",     count: pitches.length,   color: "text-gray-700",  bg: "bg-white" },
              { label: "Pending",   count: pending.length,   color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Connected", count: connected.length, color: "text-green-700",  bg: "bg-green-50" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border border-white/80 p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-500"/>
          </div>
        ) : pitches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={48} className="text-gray-200 mb-4"/>
            <p className="text-gray-500 font-medium">No pitches yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Startups who want to collaborate with you will appear here when they pitch via Explore → Collab Posts.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Connected first */}
            {connected.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-green-500"/>
                  <h2 className="text-sm font-bold text-gray-700">Connected Collaborators ({connected.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {connected.map(p => (
                    <PitchCard key={p._id} pitch={p} onConnect={handleConnect} connecting={connecting} onView={handleView}/>
                  ))}
                </div>
              </div>
            )}
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-amber-400"/>
                  <h2 className="text-sm font-bold text-gray-700">New Pitches ({pending.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pending.map(p => (
                    <PitchCard key={p._id} pitch={p} onConnect={handleConnect} connecting={connecting} onView={handleView}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CollabPitchesPage;
