import { useState, useRef, useEffect, useCallback } from "react";
import { Button }      from "@/components/ui/button";
import { ScrollArea }  from "@/components/ui/scroll-area";
import { Badge }       from "@/components/ui/badge";
import { Input }       from "@/components/ui/input";
import {
  Send, MessageCircle, ArrowLeft, Loader2, Circle,
  Lock, CalendarDays, Video, X, Clock, ChevronRight,
  Check, Bell
} from "lucide-react";
import Navbar          from "@/components/Navbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth }     from "@/contexts/AuthContext";
import {
  messagesApi, type Conversation, type Message, type ChatMeeting
} from "@/lib/api";
import { useToast }    from "@/hooks/use-toast";
import { io, Socket }  from "socket.io-client";
import { useNavigate, useSearchParams } from "react-router-dom";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (iso: string) => {
  const d         = new Date(iso);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const getUserId = (u: any): string =>
  u?._id?.toString() || u?.id?.toString() || "";

/** Returns ms until the meeting starts; negative if past */
const msUntilMeeting = (meeting: ChatMeeting): number => {
  const [year, month, day] = meeting.date.split("-").map(Number);
  const [timePart, ampm]   = meeting.timeSlot.split(" ");
  let [hr, min]            = timePart.split(":").map(Number);
  if (ampm === "PM" && hr !== 12) hr += 12;
  if (ampm === "AM" && hr === 12) hr = 0;
  const meetingMs = new Date(year, month - 1, day, hr, min).getTime();
  return meetingMs - Date.now();
};

const Avatar = ({ user, size = "md" }: { user: any; size?: "sm" | "md" | "lg" }) => {
  const s = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  const name: string = user?.fullName || "?";
  return user?.avatar ? (
    <img src={user.avatar} alt={name} className={`${s} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${s} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0`}>
      {name[0]?.toUpperCase() || "?"}
    </div>
  );
};

// ── Pitch Message Card ────────────────────────────────────────────────────────
// Detects structured pitch messages (sent by PitchDialog) and renders them nicely
const isPitchMessage = (content: string) =>
  content.includes("Startup Collaboration Pitch from") || content.includes("**Startup Collaboration Pitch");

const PitchMessageCard = ({ content, senderName }: { content: string; senderName: string }) => {
  // Parse key fields from the pitch message
  const get = (label: string) => {
    const match = content.match(new RegExp(`${label}[:\s]+([^\n*]+)`));
    return match ? match[1].trim().replace(/\*\*/g, "") : null;
  };

  const startupName = content.match(/Pitch from ([^*\n]+)\*\*/)?.[1]?.trim() || senderName;
  const tagline     = content.match(/\*\*About us\*\*\n([^\n*]+)/)?.[1]?.trim() || get("Sector");
  const sector      = get("Sector");
  const stage       = get("Stage");
  const team        = get("Team");
  const goal        = get("Goal");
  const collabType  = get("Type");
  const whatOffer   = content.match(/\*\*What we bring[^*]*\*\*\n([^\n*]+)/)?.[1]?.trim();
  const postTitle   = content.match(/your post: "([^"]+)"/)?.[1];

  return (
    <div className="max-w-sm rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/3 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r bg-primary px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <p className="text-white font-bold text-sm">{startupName}</p>
            <p className="text-green-200 text-[10px]">Collaboration Pitch</p>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {tagline && <p className="text-xs text-gray-600 italic">"{tagline}"</p>}
        <div className="flex flex-wrap gap-1.5">
          {sector     && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">{sector}</span>}
          {stage      && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">{stage}</span>}
          {team       && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">Team: {team}</span>}
        </div>
        {collabType && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">Looking for:</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">{collabType}</span>
          </div>
        )}
        {goal && (
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Goal</p>
            <p className="text-xs text-gray-700 line-clamp-2">{goal}</p>
          </div>
        )}
        {postTitle && (
          <p className="text-[10px] text-green-700 italic">Re: "{postTitle}"</p>
        )}
      </div>
    </div>
  );
};

// ── Render message content with clickable links ──────────────────────────────
const renderContent = (text: string, isMine: boolean) => {
  // URL regex - matches http/https URLs and bare www. URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (!part) return null;
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);
    if (isUrl) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 break-all ${
            isMine ? "text-white/90 hover:text-white" : "text-primary hover:text-primary/80"
          }`}
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ── Meeting Card (appears in message thread as a special message) ──────────────
const MeetingCard = ({ meeting, myUserId, schedulerName, onEndMeeting, isEnded }: {
  meeting: ChatMeeting; myUserId: string; schedulerName: string;
  onEndMeeting?: (roomId: string) => void; isEnded?: boolean;
}) => {
  const [timeLeft, setTimeLeft] = useState(msUntilMeeting(meeting));
  const isMine = meeting.scheduledBy === myUserId ||
                 (meeting as any).scheduledBy?._id === myUserId ||
                 (meeting as any).scheduledBy?.toString() === myUserId;

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(msUntilMeeting(meeting)), 10000);
    return () => clearInterval(t);
  }, [meeting]);

  const isLive    = !isEnded && timeLeft <= 0 && timeLeft > -3600000;
  const soon      = !isEnded && timeLeft > 0 && timeLeft <= 30 * 60000;
  const isPast    = isEnded || timeLeft < -3600000;

  const formatCountdown = () => {
    if (isPast)   return "Meeting ended";
    if (isLive)   return "🔴 Live now";
    const mins  = Math.floor(timeLeft / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days > 0)  return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${mins % 60}m`;
    return `in ${mins}m`;
  };

  const joinMeeting = () => {
    sessionStorage.setItem("nexmeet_name", schedulerName);
    // Store meeting context so Room.jsx can mark it ended via backend
    sessionStorage.setItem("nexmeet_roomId", meeting.roomId);
    sessionStorage.setItem("nexmeet_conversationId", (meeting as any).conversationId || "");
    window.open(meeting.joinLink, "_blank");
  };

  return (
    <div className={`rounded-2xl border p-4 max-w-xs ${
      isLive  ? "bg-green-50 border-green-300 shadow-md shadow-green-100" :
      soon    ? "bg-amber-50 border-amber-300" :
      isPast  ? "bg-gray-50 border-gray-200 opacity-60" :
                "bg-blue-50 border-blue-200"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          isLive ? "bg-green-500" : soon ? "bg-amber-500" : isPast ? "bg-gray-400" : "bg-blue-500"
        } text-white`}>
          <Video size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">
            {isLive ? "Meeting is Live!" : soon ? "Meeting Soon!" : isPast ? "Past Meeting" : "Meeting Scheduled"}
          </p>
          <p className={`text-xs font-bold ${
            isLive ? "text-green-600" : soon ? "text-amber-600" : isPast ? "text-gray-400" : "text-blue-600"
          }`}>{formatCountdown()}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <CalendarDays size={11} />
          <span>{new Date(meeting.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={11} />
          <span>{meeting.timeSlot}</span>
        </div>
        {!isMine && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Scheduled by {schedulerName}</span>
          </div>
        )}
      </div>

      {/* Join button */}
      {!isPast && (
        <button
          onClick={joinMeeting}
          disabled={!isLive && !soon && timeLeft > 60 * 60000}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all ${
            isLive
              ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
              : soon
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              : "bg-blue-100 text-blue-400 cursor-not-allowed"
          }`}
        >
          <Video size={14} />
          {isLive ? "Join Now" : soon ? "Join Meeting" : "Opens at meeting time"}
        </button>
      )}

      {/* End Meeting button — only for host (scheduler) when live */}
      {isMine && isLive && onEndMeeting && (
        <button
          onClick={() => onEndMeeting(meeting.roomId)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2 mt-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all"
        >
          End Meeting
        </button>
      )}

      {isEnded && (
        <p className="text-[10px] text-center mt-2 text-gray-400 font-medium">
          Meeting ended by host
        </p>
      )}

      {(isLive || soon) && !isEnded && (
        <p className="text-[10px] text-center mt-1.5 text-gray-400">
          Room: {meeting.roomId}
        </p>
      )}
    </div>
  );
};

// ── Calendar mini-component ────────────────────────────────────────────────────
const CalendarPicker = ({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) => {
  const today        = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  const dayNames   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  // Build calendar grid
  const cells: { day: number; month: "prev"|"curr"|"next"; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, daysInPrev - i);
    cells.push({ day: daysInPrev - i, month: "prev", date: d });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: "curr", date: new Date(viewYear, viewMonth, d) });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: d, month: "next", date: new Date(viewYear, viewMonth + 1, d) });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isoStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const isPast  = (d: Date) => d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="select-none">
      {/* Month/Year navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">‹</button>
        <span className="text-sm font-semibold text-foreground">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          const iso       = isoStr(cell.date);
          const isSelected = value === iso;
          const past      = isPast(cell.date);
          const isToday   = iso === isoStr(today);
          const isCurr    = cell.month === "curr";

          return (
            <button
              key={i}
              disabled={past || !isCurr}
              onClick={() => { if (!past && isCurr) onChange(iso); }}
              className={`h-7 w-full rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday && isCurr
                  ? "border border-primary text-primary"
                  : past || !isCurr
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "text-foreground hover:bg-accent cursor-pointer"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Schedule Meeting Picker (pops in the chat box area) ───────────────────────
const MeetingPicker = ({
  onSchedule, onClose, loading,
}: {
  onSchedule: (date: string, timeSlot: string) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [date, setDate]           = useState("");
  const [timeSlot, setTimeSlot]   = useState("");
  const [customTime, setCustomTime] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const presetSlots = [
    "08:00 AM","08:30 AM","09:00 AM","09:30 AM","10:00 AM","10:30 AM",
    "11:00 AM","11:30 AM","12:00 PM","12:30 PM","01:00 PM","01:30 PM",
    "02:00 PM","02:30 PM","03:00 PM","03:30 PM","04:00 PM","04:30 PM",
    "05:00 PM","05:30 PM","06:00 PM","07:00 PM","08:00 PM",
  ];

  const handleCustomAdd = () => {
    if (!customTime) return;
    // Convert HH:MM (24hr) → "hh:mm AM/PM"
    const [h, m] = customTime.split(":").map(Number);
    const ampm   = h >= 12 ? "PM" : "AM";
    const hr12   = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const fmt    = `${String(hr12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
    setTimeSlot(fmt);
    setShowCustom(false);
    setCustomTime("");
  };

  const effectiveSlot = timeSlot;

  return (
    <div className="border-t border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Schedule a Meeting</span>
        </div>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-4 max-h-[420px] overflow-y-auto">
        {/* Calendar */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
            Select Date *
          </label>
          <div className="rounded-xl border border-border bg-card p-3">
            <CalendarPicker value={date} onChange={setDate} />
          </div>
          {date && (
            <p className="text-xs text-blue-600 font-medium mt-1.5 text-center">
              ✓ {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Time slots — only show after date selected */}
        {date && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Select Time *
              </label>
              <button
                onClick={() => setShowCustom(v => !v)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                + Custom time
              </button>
            </div>

            {/* Custom time input */}
            {showCustom && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-accent border border-border">
                <input
                  type="time"
                  value={customTime}
                  onChange={e => setCustomTime(e.target.value)}
                  className="flex-1 h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleCustomAdd}
                  disabled={!customTime}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              {presetSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setTimeSlot(slot)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    effectiveSlot === slot
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border text-foreground hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {date && effectiveSlot && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 border border-blue-200">
            <Check size={14} className="text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-800 font-medium">
              {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              {" at "}
              {effectiveSlot}
              {" — a video meeting link will be shared"}
            </p>
          </div>
        )}

        {/* Confirm */}
        <button
          disabled={!date || !effectiveSlot || loading}
          onClick={() => onSchedule(date, effectiveSlot)}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
            date && effectiveSlot && !loading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> Scheduling…</span>
            : <span className="flex items-center justify-center gap-2"><Video size={13} /> Confirm & Generate Meeting Link</span>}
        </button>
      </div>
    </div>
  );
};



// ── Meeting Reminder Banner ────────────────────────────────────────────────────
// Only renders when a meeting is genuinely < 30min away or live
const MeetingReminderBanner = ({ meeting, onJoin, onDismiss, onEndMeeting }: {
  meeting: ChatMeeting; onJoin: () => void; onDismiss: () => void; onEndMeeting?: () => void;
}) => {
  const ms       = msUntilMeeting(meeting);
  const isLive   = ms <= 0 && ms > -3600000;
  const minsLeft = Math.max(0, Math.floor(ms / 60000));

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${
      isLive ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
    }`}>
      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
        isLive ? "bg-green-500" : "bg-amber-500"
      } text-white`}>
        {isLive ? <Video size={14} /> : <Bell size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${isLive ? "text-green-800" : "text-amber-800"}`}>
          {isLive ? "🔴 Meeting is live now!" : `Meeting starts in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""}`}
        </p>
        <p className="text-[10px] text-gray-500 truncate">
          {meeting.date} · {meeting.timeSlot}
        </p>
      </div>
      <button
        onClick={onJoin}
        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
          isLive ? "bg-green-500 hover:bg-green-600" : "bg-amber-500 hover:bg-amber-600"
        }`}
      >
        {isLive ? "Join Now" : "Open"}
      </button>
      {onEndMeeting && isLive && (
        <button
          onClick={onEndMeeting}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all"
        >
          End
        </button>
      )}
      <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  );
};

// ── Main Chat Page ─────────────────────────────────────────────────────────────
const Chat = () => {
  const isMobile        = useIsMobile();
  const { user }        = useAuth();
  const { toast }       = useToast();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [connections,    setConnections]    = useState<any[]>([]);
  const [selected,       setSelected]       = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [meetings,       setMeetings]       = useState<ChatMeeting[]>([]);
  const [newMsg,         setNewMsg]         = useState("");
  const [loadingConvos,  setLoadingConvos]  = useState(true);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const [sending,        setSending]        = useState(false);
  const [startingConvo,  setStartingConvo]  = useState<string | null>(null);

  // Meeting state
  const [showMeetingPicker, setShowMeetingPicker] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  // Tracks which meetings have been manually ended (by roomId) — persisted in localStorage
  const [endedMeetings, setEndedMeetings] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("cohustle_ended_meetings");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Persist endedMeetings to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cohustle_ended_meetings", JSON.stringify([...endedMeetings]));
  }, [endedMeetings]);
  // Track ALL dismissed meeting banners (Set of roomIds)
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("cohustle_dismissed_reminders");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  // Reminder timers — keyed by roomId so we never double-schedule
  const reminderTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Typing / online
  const [typingInfo,    setTypingInfo]    = useState<{ name: string; convoId: string } | null>(null);
  const [onlineUsers,   setOnlineUsers]   = useState<Set<string>>(new Set());

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const socketRef       = useRef<Socket | null>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const selectedRef     = useRef<Conversation | null>(null);
  const typingTimeout   = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);



  // ── Load conversations + connections ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      messagesApi.getConversations(),
      messagesApi.getConnections(),
    ]).then(([{ conversations }, { connections }]) => {
      setConversations(conversations);
      setConnections(connections);

      // Auto-open conversation if ?userId= param is in URL (must be valid MongoDB ObjectId)
      const targetUserId = searchParams.get("userId");
      if (targetUserId && /^[a-f0-9]{24}$/i.test(targetUserId)) {
        // Use setTimeout so openConversation is safely called after render
        setTimeout(async () => {
          try {
            const existing = conversations.find((cv: any) =>
              cv.otherUser?._id?.toString() === targetUserId
            );
            if (existing) {
              await openConversation(existing);
            } else {
              const conv = await messagesApi.startConversation(targetUserId);
              if (!conv?._id) return;
              setConversations((prev: any) => {
                if (prev.find((c: any) => c._id === conv._id)) return prev;
                return [conv, ...prev];
              });
              await openConversation(conv);
            }
          } catch (err: any) {
            console.error("Auto-open chat failed:", err?.message);
          }
        }, 150);
      }
    }).catch((err) => {
      console.error("Load conversations failed:", err);
      // Only show toast if conversations truly failed to load (not auto-open issues)
      if (!err?.message?.includes("openConversation")) {
        toast({ title: "Could not load messages", variant: "destructive" });
      }
    }).finally(() => setLoadingConvos(false));
  }, []);

  // ── Socket.io ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cohustle_token");
    if (!token) return;

    const socket: Socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("meeting:ended", ({ conversationId, roomId }: any) => {
      // When host ends a meeting, mark it as ended on the participant's side too
      setEndedMeetings(prev => {
        const next = new Set([...prev, roomId]);
        localStorage.setItem("cohustle_ended_meetings", JSON.stringify([...next]));
        return next;
      });
      // Also hide the reminder banner for this meeting
      setDismissedReminders(prev => {
        const next = new Set([...prev, roomId]);
        localStorage.setItem("cohustle_dismissed_reminders", JSON.stringify([...next]));
        return next;
      });
    });

    socket.on("message:received", (msg: any) => {
      if (selectedRef.current?._id === msg.conversationId) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
      setConversations(prev => prev.map(c => {
        if (c._id === msg.conversationId) {
          const isOpen = selectedRef.current?._id === msg.conversationId;
          return { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt, unreadCount: isOpen ? 0 : (c.unreadCount || 0) + 1 };
        }
        return c;
      }));
    });

    // Meeting scheduled by other party — add to meetings list + set reminder
    socket.on("meeting:scheduled", ({ conversationId, meeting, scheduledByName }: any) => {
      if (selectedRef.current?._id === conversationId) {
        setMeetings(prev => [...prev, meeting]);
          scheduleReminders(meeting);
        toast({
          title: "📅 Meeting Scheduled",
          description: `${scheduledByName} scheduled a meeting on ${meeting.date} at ${meeting.timeSlot}`,
        });
      }
    });

    socket.on("typing:start", ({ fromUserId, fromName, conversationId }: any) => {
      if (selectedRef.current?._id === conversationId)
        setTypingInfo({ name: fromName, convoId: conversationId });
    });

    socket.on("typing:stop", ({ conversationId }: any) => {
      if (selectedRef.current?._id === conversationId) setTypingInfo(null);
    });

    socket.on("user:online",  ({ userId }: any) => setOnlineUsers(prev => new Set([...prev, userId])));
    socket.on("user:offline", ({ userId }: any) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));

    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, meetings]);

  // ── Reminder timers ──────────────────────────────────────────────────────────
  // THE FIX: only schedule toasts when meeting is < 24hr away.
  // Meetings that are months away never get a timer, so there's no false "starting now".
  const scheduleReminders = useCallback((meeting: ChatMeeting) => {
    const ms = msUntilMeeting(meeting);

    // Guard: if the meeting is more than 24 hours away, do NOT schedule any timers.
    // This is the root cause fix — previously timers were set for month-away meetings
    // which could fire immediately if ms calculation was off, or drain memory.
    if (ms > 24 * 60 * 60 * 1000) return;

    // Guard: if already past, nothing to schedule
    if (ms < 0) return;

    // Already scheduled for this room? skip
    if (reminderTimers.current.has(meeting.roomId)) return;

    // 30-minute reminder (only if we have more than 30min remaining)
    const thirtyMin = ms - 30 * 60 * 1000;
    if (thirtyMin > 0) {
      const t = setTimeout(() => {
        toast({
          title: "📅 Meeting in 30 minutes",
          description: `${meeting.date} at ${meeting.timeSlot}`,
        });
      }, thirtyMin);
      reminderTimers.current.set(`${meeting.roomId}-30`, t);
    }

    // At-meeting-time reminder
    if (ms > 0) {
      const t = setTimeout(() => {
        toast({
          title: "🔴 Your meeting is starting!",
          description: `${meeting.date} at ${meeting.timeSlot} — click to join`,
        });
      }, ms);
      reminderTimers.current.set(`${meeting.roomId}-0`, t);
    }
  }, [toast]);

  // ── Open conversation ────────────────────────────────────────────────────────
  const openConversation = async (convo: Conversation) => {
    if (!convo?._id) { console.error("openConversation: no _id on convo", convo); return; }
    setSelected(convo);
    setLoadingMsgs(true);
    setMessages([]);
    setMeetings([]);
    setShowMeetingPicker(false);

    try {
      const [{ messages }, { meetings }] = await Promise.all([
        messagesApi.getMessages(convo._id),
        messagesApi.getMeetings(convo._id).catch(() => ({ meetings: [] })),
      ]);
      setMessages(messages);
      setMeetings(meetings);
      // Sync meetings that were ended in DB (status="ended") into local endedMeetings state
      const dbEnded = meetings.filter((m: any) => m.status === "ended").map((m: any) => m.roomId);
      if (dbEnded.length > 0) {
        setEndedMeetings(prev => {
          const next = new Set([...prev, ...dbEnded]);
          localStorage.setItem("cohustle_ended_meetings", JSON.stringify([...next]));
          return next;
        });
      }
      // Clear dismissed reminder if it belongs to a different conversation's meeting

      // Set up reminder timers for upcoming meetings

      setConversations(prev => prev.map(c => c._id === convo._id ? { ...c, unreadCount: 0 } : c));
    } catch (err: any) {
      console.error("openConversation error:", err?.message || err);
      // Don't show toast here - conversations loaded fine, only message fetch failed
    } finally {
      setLoadingMsgs(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const startConversation = async (connectionUser: any) => {
    const otherId = getUserId(connectionUser);
    if (!otherId) { toast({ title: "Could not identify user", variant: "destructive" }); return; }
    setStartingConvo(otherId);
    try {
      const convo = await messagesApi.startConversation(otherId);
      setConversations(prev => {
        if (prev.find(c => c._id === convo._id)) return prev;
        return [convo, ...prev];
      });
      openConversation(convo);
    } catch (err: any) {
      toast({ title: "Cannot start conversation", description: err.message, variant: "destructive" });
    } finally { setStartingConvo(null); }
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || sending) return;
    const content = newMsg.trim();
    setNewMsg("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId, conversationId: selected._id,
      senderId: user!.id, content, read: false, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const saved = await messagesApi.sendMessage(selected._id, content);
      setMessages(prev => prev.map(m => m._id === tempId ? saved : m));
      const toUserId = getUserId(selected.otherUser);
      socketRef.current?.emit("typing:stop", { toUserId, conversationId: selected._id });
      setConversations(prev =>
        prev.map(c => c._id === selected._id
          ? { ...c, lastMessage: content, lastMessageAt: saved.createdAt }
          : c
        ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMsg(content);
      toast({ title: "Message failed to send", variant: "destructive" });
    } finally { setSending(false); }
  };

  // ── Schedule meeting ─────────────────────────────────────────────────────────
  const handleScheduleMeeting = async (date: string, timeSlot: string) => {
    if (!selected) return;
    setSchedulingMeeting(true);
    try {
      const { meeting } = await messagesApi.scheduleMeetingInChat(selected._id, date, timeSlot);
      setMeetings(prev => [...prev, meeting]);
      setShowMeetingPicker(false);
      scheduleReminders(meeting);
      toast({
        title: "Meeting scheduled! 📅",
        description: `${date} at ${timeSlot} · Link ready to join`,
      });
    } catch (err: any) {
      toast({ title: "Could not schedule meeting", description: err.message, variant: "destructive" });
    } finally { setSchedulingMeeting(false); }
  };

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setNewMsg(value);
    if (!selected || !socketRef.current || !user) return;
    const toUserId = getUserId(selected.otherUser);
    if (value) {
      socketRef.current.emit("typing:start", { toUserId, conversationId: selected._id });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current?.emit("typing:stop", { toUserId, conversationId: selected._id });
      }, 2000);
    } else {
      socketRef.current?.emit("typing:stop", { toUserId, conversationId: selected._id });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    }
  };

  // ── Group messages + meetings by date for rendering ──────────────────────────
  type ThreadItem =
    | { kind: "message"; data: Message }
    | { kind: "meeting"; data: ChatMeeting };

  const buildThread = (): { date: string; items: ThreadItem[] }[] => {
    const all: { ts: string; item: ThreadItem }[] = [
      ...messages.map(m => ({ ts: m.createdAt, item: { kind: "message" as const, data: m } })),
      ...meetings.map(m => ({
        ts: m.scheduledAt || m.date,
        item: { kind: "meeting" as const, data: m },
      })),
    ];
    all.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    const groups: { date: string; items: ThreadItem[] }[] = [];
    for (const { ts, item } of all) {
      const date = formatDate(ts);
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.items.push(item);
      else groups.push({ date, items: [item] });
    }
    return groups;
  };

  // ── Upcoming meeting for reminder banner ─────────────────────────────────────
  // THE FIX: only show the banner when:
  //   1. A conversation is open (selected)
  //   2. That conversation has meetings
  //   3. A meeting is within 30min before start OR has started but < 1hr ago
  //   4. User hasn't dismissed it
  // A meeting that is DAYS or MONTHS away never satisfies condition 3.
  const upcomingMeeting = (selected && meetings.length > 0)
    ? meetings.find(m => {
        const ms      = msUntilMeeting(m);
        const isLive  = ms <= 0 && ms > -3600000;      // started, < 1hr ago
        const isSoon  = ms > 0  && ms <= 30 * 60000;   // < 30min away
        return (isLive || isSoon) && !dismissedReminders.has(m.roomId) && !endedMeetings.has(m.roomId);
      })
    : undefined;

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const existingConvoUserIds = new Set(conversations.map(c => getUserId(c.otherUser)));
  const newConnections       = connections.filter(cn => !existingConvoUserIds.has(getUserId(cn)));
  const showList             = !isMobile || !selected;
  const showChat             = !isMobile || !!selected;
  const otherUserId          = getUserId(selected?.otherUser);
  const otherIsOnline        = otherUserId ? onlineUsers.has(otherUserId) : false;
  const thread               = buildThread();

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
        {showList && (
          <div className={`flex flex-col border-r border-border bg-background ${isMobile ? "w-full" : "w-80"}`}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Messages</h2>
                {totalUnread > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs h-5 px-1.5">{totalUnread}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock size={11} /> Connections only
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingConvos ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {conversations.map(c => {
                    const other    = c.otherUser;
                    const otherId  = getUserId(other);
                    const isOnline = otherId ? onlineUsers.has(otherId) : false;
                    const isActive = selected?._id === c._id;
                    const convoMeetings: any[] = [];

                    return (
                      <button
                        key={c._id}
                        onClick={() => openConversation(c)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors text-left ${isActive ? "bg-accent" : ""}`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar user={other} />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${(c.unreadCount || 0) > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                              {other?.fullName || "User"}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-1">

                              {c.lastMessageAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTime(c.lastMessageAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className={`text-xs truncate ${(c.unreadCount || 0) > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                              {c.lastMessage || "Start the conversation"}
                            </p>
                            {(c.unreadCount || 0) > 0 && (
                              <span className="ml-1 flex-shrink-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {newConnections.length > 0 && (
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        Start a conversation
                      </p>
                    </div>
                  )}
                  {newConnections.map(cn => {
                    const cnId    = getUserId(cn);
                    const isOnline = cnId ? onlineUsers.has(cnId) : false;
                    const loading  = startingConvo === cnId;
                    return (
                      <button
                        key={cnId}
                        disabled={loading}
                        onClick={() => startConversation(cn)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/40 transition-colors text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar user={cn} />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{cn.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {cn.role} · {cn.problemTitle || "Connected"}
                          </p>
                        </div>
                        {loading
                          ? <Loader2 size={14} className="animate-spin text-muted-foreground" />
                          : <ChevronRight size={14} className="text-muted-foreground" />}
                      </button>
                    );
                  })}

                  {conversations.length === 0 && newConnections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <MessageCircle size={36} className="text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No connections yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Apply to tasks or accept applications to start messaging
                      </p>
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ── CHAT AREA ──────────────────────────────────────────────────────── */}
        {showChat && (
          <div className="flex flex-1 flex-col min-w-0">
            {selected ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-background">
                  {isMobile && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setSelected(null)}>
                      <ArrowLeft size={18} />
                    </Button>
                  )}
                  <div className="relative flex-shrink-0">
                    <Avatar user={selected.otherUser} />
                    {otherIsOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/profile/${selected.otherUser?._id}`)} className="font-semibold text-foreground text-sm hover:text-primary hover:underline transition-colors">{selected.otherUser?.fullName || "User"}</button>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {otherIsOnline
                        ? <><Circle size={7} className="fill-green-500 text-green-500" /> Online</>
                        : <span className="capitalize">{selected.otherUser?.role || ""}</span>}
                    </p>
                  </div>
                  {/* Schedule meeting button in header */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMeetingPicker(v => !v)}
                    className={`flex-shrink-0 gap-1.5 text-xs ${showMeetingPicker ? "bg-blue-50 border-blue-300 text-blue-700" : ""}`}
                  >
                    <CalendarDays size={13} />
                    {!isMobile && "Schedule Meeting"}
                  </Button>
                </div>



                {/* Reminder banner — only shown when meeting is genuinely < 30min or live */}
                {upcomingMeeting && (
                  <MeetingReminderBanner
                    meeting={upcomingMeeting}
                    onJoin={() => {
                      sessionStorage.setItem("nexmeet_name", user?.fullName || "Guest");
                      sessionStorage.setItem("nexmeet_roomId", upcomingMeeting.roomId);
                      sessionStorage.setItem("nexmeet_conversationId", (upcomingMeeting as any).conversationId || "");
                      window.open(upcomingMeeting.joinLink, "_blank");
                    }}
                    onDismiss={() => {
                      const next = new Set([...dismissedReminders, upcomingMeeting.roomId]);
                      setDismissedReminders(next);
                      localStorage.setItem("cohustle_dismissed_reminders", JSON.stringify([...next]));
                    }}
                  />
                )}

                {/* Messages + meetings thread */}
                <ScrollArea className="flex-1 px-4 py-3">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-primary" /></div>
                  ) : thread.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <Avatar user={selected.otherUser} size="lg" />
                      <p className="mt-3 font-semibold text-foreground">{selected.otherUser?.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{selected.otherUser?.role}</p>
                      <p className="text-sm text-muted-foreground mt-4">Say hello! 👋</p>
                      <button
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                        onClick={() => setShowMeetingPicker(true)}
                      >
                        <CalendarDays size={14} /> Schedule a meeting
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {thread.map(({ date, items }) => (
                        <div key={date}>
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground px-2 flex-shrink-0">{date}</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>

                          {items.map((item, i) => {
                            if (item.kind === "meeting") {
                              const schedulerId = typeof item.data.scheduledBy === "string"
                                ? item.data.scheduledBy
                                : (item.data.scheduledBy as any)?._id?.toString();
                              const scheduledByMe = schedulerId === user?.id;
                              return (
                                <div
                                  key={item.data.roomId}
                                  className={`flex mb-3 ${scheduledByMe ? "justify-end" : "justify-start"}`}
                                >
                                  {!scheduledByMe && (
                                    <div className="w-7 mr-1.5 self-end flex-shrink-0">
                                      <Avatar user={selected.otherUser} size="sm" />
                                    </div>
                                  )}
                                  <MeetingCard
                                    meeting={item.data}
                                    myUserId={user?.id || ""}
                                    schedulerName={scheduledByMe ? (user?.fullName || "You") : (selected.otherUser?.fullName || "Other")}
                                    isEnded={endedMeetings.has(item.data.roomId)}
                                    onEndMeeting={async (roomId) => {
                                      const next = new Set([...endedMeetings, roomId]);
                                      setEndedMeetings(next);
                                      localStorage.setItem("cohustle_ended_meetings", JSON.stringify([...next]));
                                      if (selected) {
                                        // Persist to database so freelancer sees it on load
                                        try { await messagesApi.endMeeting(selected._id, roomId); } catch {}
                                        // Also notify via socket for real-time update
                                        socketRef.current?.emit("meeting:ended", {
                                          conversationId: selected._id,
                                          roomId,
                                          otherUserId: selected.otherUser?._id,
                                        });
                                      }
                                      toast({ title: "Meeting ended", description: "The meeting has been closed." });
                                    }}
                                  />
                                </div>
                              );
                            }

                            // Regular message — skip pitch messages (they live in CollabPitches page)
                            const m = item.data as Message;
                            if (isPitchMessage(m.content)) return null;
                            const isMine   = m.senderId === user?.id;
                            const nextItem = items[i + 1];
                            const nextSame = nextItem?.kind === "message" &&
                                             (nextItem.data as Message).senderId === m.senderId;
                            return (
                              <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${nextSame ? "mb-0.5" : "mb-2"}`}>
                                {!isMine && (
                                  <div className="w-7 flex-shrink-0 mr-1.5 self-end">
                                    {!nextSame && <Avatar user={selected.otherUser} size="sm" />}
                                  </div>
                                )}
                                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[70%]`}>
                                  {isPitchMessage(m.content) ? (
                                    <PitchMessageCard content={m.content} senderName={selected.otherUser?.fullName || "Startup"} />
                                  ) : (
                                    <div className={`px-3.5 py-2 text-sm leading-relaxed break-words ${
                                      isMine
                                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                        : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                                    } ${m._id.startsWith("temp-") ? "opacity-70" : ""}`}>
                                      {renderContent(m.content, isMine)}
                                    </div>
                                  )}
                                  {!nextSame && (
                                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                                      {formatTime(m.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {typingInfo?.convoId === selected._id && (
                        <div className="flex justify-start mb-2">
                          <div className="w-7 mr-1.5 self-end flex-shrink-0">
                            <Avatar user={selected.otherUser} size="sm" />
                          </div>
                          <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Meeting picker (expands above input) */}
                {showMeetingPicker && (
                  <MeetingPicker
                    onSchedule={handleScheduleMeeting}
                    onClose={() => setShowMeetingPicker(false)}
                    loading={schedulingMeeting}
                  />
                )}

                {/* Message input */}
                {!showMeetingPicker && (
                  <div className="border-t border-border px-4 py-3 bg-background">
                    <div className="flex items-end gap-2">
                      <Input
                        ref={inputRef}
                        value={newMsg}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                        }}
                        placeholder={`Message ${selected.otherUser?.fullName || ""}…`}
                        className="flex-1"
                        disabled={sending}
                      />
                      <Button size="icon" disabled={!newMsg.trim() || sending} onClick={sendMessage} className="flex-shrink-0">
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <p className="text-[10px] text-muted-foreground">Press Enter to send</p>
                      <button
                        onClick={() => setShowMeetingPicker(true)}
                        className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <CalendarDays size={10} /> Schedule a meeting
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
                <MessageCircle className="h-16 w-16 text-muted-foreground/20" />
                <p className="text-lg font-semibold text-foreground">Your Messages</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Select a conversation, or click a connection to start chatting.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                  <Lock size={11} /> Only connected users can message each other
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
