import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { duas as duasApi } from "@/lib/api";
import { DuaCard } from "@/components/DuaCard";

export default function DuaCategory() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [siblingTopics, setSiblingTopics] = useState([]);

  useEffect(() => {
    setLoading(true);
    setSiblingTopics([]);
    setTopic(null);

    duasApi.topic(topicId).then(async (data) => {
      setTopic(data);
      if (data?.category_id) {
        const cat = await duasApi.category(data.category_id);
        setSiblingTopics(cat.topics || []);
      }
    }).finally(() => setLoading(false));
  }, [topicId]);

  const currentIdx = siblingTopics.findIndex(t => t.id === topicId);
  const nextTopic = currentIdx >= 0 && currentIdx < siblingTopics.length - 1
    ? siblingTopics[currentIdx + 1]
    : null;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#0d9488" }} />
      </div>
    );
  }

  if (!topic) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
        Topic not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", padding: "0 0 12px",
        gap: 6, marginBottom: 12
      }}>
        <button
          onClick={() => navigate("/duas")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            color: "var(--primary)", padding: "4px 0", flexShrink: 0
          }}
        >
          <ArrowLeft size={18} />
          <span style={{ fontSize: "15px" }}>Duas &amp; Dhikr</span>
        </button>
        <span style={{ color: "#9ca3af", fontSize: "14px" }}>›</span>
        <span style={{
          fontSize: "15px", fontWeight: "700", color: "var(--foreground)",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
        }}>
          {topic.title}
        </span>
      </div>

      {/* ── Page Header (Matching Ask AI) ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          TOPIC
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {topic.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {(topic.duas || []).length} authentic supplications for this topic.
        </p>
      </div>

      {/* ── Dua Cards ── */}
      <div className="max-w-3xl mx-auto" style={{ paddingBottom: 32 }}>
        {(topic.duas || []).map((dua, idx) => (
          <DuaCard
            key={dua.id}
            dua={dua}
            topicTitle={topic.title}
            isLast={idx === topic.duas.length - 1}
          />
        ))}
      </div>

      {/* ── Next Topic Footer ── */}
      {nextTopic && (
        <div style={{
          background: "var(--card)", borderTop: "1px solid var(--border)",
          padding: "16px 18px", marginTop: "32px"
        }}>
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => navigate(`/duas/topic/${nextTopic.id}`)}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                justifyContent: "flex-end",
                background: "none", border: "none", cursor: "pointer", padding: 0
              }}
            >
              <div style={{ textAlign: "right", marginRight: 12 }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Next Topic
                </p>
                <p className="font-heading mt-0.5 text-base font-bold text-foreground">
                  {nextTopic.title}
                </p>
              </div>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "hsl(var(--primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px hsl(var(--primary) / 0.2)"
              }}>
                <ArrowLeft size={18} style={{ color: "white", transform: "rotate(180deg)" }} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
