// Entry point for /meet/:roomId
// ALWAYS shows name entry form before joining — ensures both parties enter with their name
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Room from "./Room";

const MeetEntry = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const savedName = sessionStorage.getItem("nexmeet_name") || "";
  
  // Pre-fill with CoHustle user's name if logged in, but ALWAYS show the form
  const [name, setName]   = useState(savedName || user?.fullName || "");
  const [ready, setReady] = useState(false);

  const join = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    sessionStorage.setItem("nexmeet_name", trimmed);
    setReady(true);
  };

  if (ready) return <Room />;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "2.5rem",
        width: "100%", maxWidth: 420, textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎥</div>
        <h2 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
          Ready to join?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 28 }}>
          Room: <strong style={{ color: "rgba(255,255,255,0.75)" }}>{roomId}</strong>
        </p>

        <label style={{ display: "block", textAlign: "left", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          Your display name
        </label>
        <input
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)", color: "white",
            fontSize: 15, marginBottom: 16, outline: "none", boxSizing: "border-box",
          }}
          placeholder="Enter your name..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && join()}
          autoFocus
        />

        <button
          disabled={!name.trim()}
          style={{
            width: "100%", padding: "13px", borderRadius: 10, border: "none",
            background: name.trim() ? "linear-gradient(135deg, #8b5cf6, #06b6d4)" : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 15, fontWeight: 700,
            cursor: name.trim() ? "pointer" : "not-allowed",
            transition: "opacity 0.2s",
          }}
          onClick={join}
        >
          Join Meeting →
        </button>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 16 }}>
          Your camera and mic will turn on after joining
        </p>
      </div>
    </div>
  );
};

export default MeetEntry;
