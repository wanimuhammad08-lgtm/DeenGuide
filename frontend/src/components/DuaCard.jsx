import React, { useState, useEffect, useRef } from "react";
import { Copy, Share2, Play, Pause, Check, ShieldCheck, ChevronDown, ChevronUp, Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useBookmarks } from "@/lib/bookmarks";

/* ── Grade badge ── */
const GradeBadge = ({ grade }) => {
  if (!grade) return null;
  const green = grade === "Sahih" || grade.startsWith("Sahih");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 20, flexShrink: 0,
      fontSize: "12px", fontWeight: "600",
      background: green ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.15)",
      color: green ? "#16a34a" : "#b45309",
      border: `1px solid ${green ? "rgba(34,197,94,0.3)" : "rgba(251,191,36,0.35)"}`,
    }}>
      <ShieldCheck size={12} strokeWidth={2.2} />
      {grade}
    </span>
  );
};

/* ── Bottom action button ── */
const ActionBtn = ({ onClick, active, title, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 38, height: 38, borderRadius: "50%",
      border: "1.5px solid var(--border)",
      background: active ? "rgba(13,148,136,0.1)" : "var(--secondary)",
      color: active ? "#0d9488" : "var(--muted-foreground)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s", opacity: disabled ? 0.4 : 1,
      flexShrink: 0
    }}
  >
    {children}
  </button>
);

export const DuaCard = ({ dua, topicTitle }) => {
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioErr, setAudioErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);
  const instanceId = useRef(Math.random().toString()).current;
  const { toggle, isBookmarked } = useBookmarks();
  const saved = isBookmarked("duas", dua.id);

  /* ── Audio Manager ── */
  useEffect(() => {
    const handleGlobalStop = (e) => {
      // Pause and reset state if the event was fired by a different instance
      if (e.detail !== instanceId && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("stop-all-dua-audio", handleGlobalStop);
    return () => window.removeEventListener("stop-all-dua-audio", handleGlobalStop);
  }, [instanceId]);

  /* ── Audio ── */
  useEffect(() => {
    if (!dua.audio) return;
    const a = new Audio(dua.audio);
    a.onended = () => setIsPlaying(false);
    a.onerror = () => { setAudioErr(true); setIsPlaying(false); };
    audioRef.current = a;
    return () => { a.pause(); audioRef.current = null; };
  }, [dua.audio]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || audioErr) { toast.error("Audio unavailable"); return; }
    
    if (isPlaying) { 
      a.pause(); 
      setIsPlaying(false); 
    } else { 
      // Tell all other components to stop their audio
      window.dispatchEvent(new CustomEvent("stop-all-dua-audio", { detail: instanceId }));
      
      a.play().catch(() => { setAudioErr(true); setIsPlaying(false); }); 
      setIsPlaying(true); 
    }
  };

  /* ── Copy / Share ── */
  const handleCopy = async () => {
    const text = [dua.arabic, dua.transliteration, dua.translation, dua.reference ? "Reference: " + dua.reference : ""]
      .filter(Boolean).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = [dua.arabic, dua.transliteration, dua.translation, dua.reference ? "Reference: " + dua.reference : ""]
      .filter(Boolean).join("\n\n");
    if (navigator.share) {
      try { await navigator.share({ title: "Dua from DeenGuide", text }); return; }
      catch (_) {}
    }
    handleCopy();
  };

  return (
    <div style={{
      margin: "0 14px 12px",
      borderRadius: 14,
      background: "var(--card)",
      border: "1px solid rgba(0,0,0,0.07)",
      boxShadow: "0 1px 5px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "15px 16px 0" }}>

        {/* ── Header: topic + grade ── */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 8, marginBottom: 14
        }}>
          <p className="font-heading" style={{
            margin: 0, fontSize: "16px", fontWeight: "700",
            color: "var(--foreground)", flex: 1, lineHeight: 1.4
          }}>
            {topicTitle}
          </p>
          {dua.grade && <GradeBadge grade={dua.grade} />}
        </div>

        {/* ── Arabic ── */}
        {dua.arabic && (
          <p style={{
            direction: "rtl", textAlign: "center",
            fontFamily: "'Amiri', 'Traditional Arabic', serif",
            fontSize: "clamp(20px, 5vw, 26px)",
            lineHeight: 2.05, color: "var(--foreground)",
            margin: "0 0 16px", fontWeight: 400,
          }}>
            {dua.arabic}
          </p>
        )}

        {/* ── Expanded content ── */}
        {expanded && (
          <div style={{ marginBottom: 4 }}>
            {dua.transliteration && (
              <p style={{
                margin: "0 0 10px", fontSize: "13px",
                fontStyle: "italic", color: "#6b7280", lineHeight: 1.7
              }}>
                ({dua.transliteration})
              </p>
            )}
            {dua.translation && (
              <p style={{
                margin: "0 0 10px", fontSize: "14px",
                color: "var(--foreground)", lineHeight: 1.75
              }}>
                ({dua.translation})
              </p>
            )}
            {dua.reference && (
              <div style={{
                marginTop: 16, padding: "10px 12px",
                borderRadius: 10, background: "rgba(0,0,0,0.03)",
                borderLeft: "3px solid var(--primary)"
              }}>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Source / Reference
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--foreground)", fontStyle: "italic" }}>
                  {dua.reference}
                </p>
              </div>
            )}
            {dua.repeat > 1 && (
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#0d9488", fontWeight: 600 }}>
                ↻ Repeat {dua.repeat}×
              </p>
            )}
          </div>
        )}

        {/* ── Show More / Less button ── */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 14px" }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 20px", borderRadius: 20,
              border: "1.5px solid var(--border)",
              background: expanded ? "var(--secondary)" : "var(--card)",
              cursor: "pointer", fontSize: "13px", fontWeight: "500",
              color: "var(--primary)", transition: "background 0.15s"
            }}
          >
            {expanded ? "Show Less" : "Show More"}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px 13px",
        borderTop: "1px solid var(--border)"
      }}>
        <ActionBtn onClick={handleCopy} active={copied} title="Copy">
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </ActionBtn>
        <ActionBtn onClick={handleShare} title="Share">
          <Share2 size={15} />
        </ActionBtn>
        <ActionBtn
          onClick={() => {
            toggle("duas", { id: dua.id, title: topicTitle, arabic: dua.arabic, translation: dua.translation, reference: dua.reference });
            toast.success(saved ? "Removed from bookmarks" : "Dua saved!");
          }}
          active={saved}
          title={saved ? "Remove bookmark" : "Bookmark"}
        >
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </ActionBtn>
        {dua.audio && (
          <ActionBtn onClick={togglePlay} active={isPlaying} title="Play audio">
            {isPlaying ? <Pause size={15} /> : <Play size={14} style={{ marginLeft: 1 }} />}
          </ActionBtn>
        )}
      </div>
    </div>
  );
};
