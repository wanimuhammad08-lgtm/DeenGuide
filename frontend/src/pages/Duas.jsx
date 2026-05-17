import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import * as Icons from "lucide-react";
import { duas as duasApi } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

const SECTION_ORDER = ["Daily", "Azkar", "Worship", "Other Occasions"];

const DynIcon = ({ name, size = 20 }) => {
  const Comp = Icons[name] || Icons.BookOpen;
  return <Comp size={size} strokeWidth={1.5} />;
};

export default function Duas() {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [topicLists, setTopicLists] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [allCats, setAllCats] = useState([]);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const CATS_KEY = "dg_duas_cats_v2";
    const CATS_TS_KEY = "dg_duas_cats_ts";
    const CACHE_TTL = 86400000; // 24h
    const applyCategories = (cats) => {
      setAllCats(cats);
      const grouped = {};
      cats.forEach((cat) => {
        const s = cat.section || "Other Occasions";
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(cat);
      });
      setSections(grouped);
    };
    try {
      const cached = localStorage.getItem(CATS_KEY);
      const cachedTs = parseInt(localStorage.getItem(CATS_TS_KEY) || "0");
      if (cached && Date.now() - cachedTs < CACHE_TTL) {
        applyCategories(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch {}
    duasApi.categories().then((cats) => {
      applyCategories(cats);
      try {
        localStorage.setItem(CATS_KEY, JSON.stringify(cats));
        localStorage.setItem(CATS_TS_KEY, String(Date.now()));
      } catch {}
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
    else { setSearchResults([]); setSearchQuery(""); }
  }, [showSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        duasApi.search(searchQuery).then(setSearchResults).finally(() => setSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleToggle = async (catId) => {
    if (expanded === catId) { setExpanded(null); return; }
    setExpanded(catId);
    // Track dua category open
    const cat = allCats.find(c => c.id === catId);
    trackEvent('dua_opened', 'duas', { category: cat?.title || catId });
    if (!topicLists[catId]) {
      const data = await duasApi.category(catId);
      setTopicLists((prev) => ({ ...prev, [catId]: data.topics || [] }));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#06b6d4" }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      {/* Page Header (Matching Ask AI) */}
      <div className="relative mb-6">
        <button 
          onClick={() => setShowSearch(v => !v)} 
          style={{ position: "absolute", right: 0, top: 4, background: "none", border: "none", cursor: "pointer", color: "var(--foreground)" }}
        >
          {showSearch ? <X size={22} /> : <Search size={22} />}
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          DAILY SUPPLICATIONS
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Duas &amp; Dhikr
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Authentic supplications from the Quran and Sunnah, organized by category for daily remembrance and protection.
        </p>
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ padding: "10px 16px", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              ref={searchRef}
              placeholder="Search duas and topics..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 36px",
                borderRadius: "22px", border: "1px solid var(--border)",
                background: "var(--muted)", fontSize: "15px", color: "var(--foreground)", outline: "none"
              }}
            />
          </div>
          {searching && <div style={{ textAlign: "center", paddingTop: 10 }}><Loader2 size={16} className="animate-spin" style={{ color: "#9ca3af" }} /></div>}
          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)" }}>
              {searchResults.slice(0, 10).map((r, i) => (
                <button key={i}
                  onClick={() => navigate(`/duas/topic/${r.type === "topic" ? r.id : r.topic_id}`)}
                  style={{
                    width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "11px 16px", background: "none", border: "none",
                    borderBottom: i < searchResults.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer", textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--foreground)" }}>{r.title}</span>
                  <span style={{ fontSize: "12px", color: "#9ca3af", marginTop: 2 }}>{r.type === "topic" ? "Topic" : "Dua match"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      <div style={{ paddingBottom: 32 }}>
        {SECTION_ORDER.filter(s => sections[s]?.length > 0).map(sectionName => (
          <div key={sectionName} style={{ marginBottom: 24 }}>
            {/* Section label */}
            <p className="font-heading" style={{ margin: "0 0 12px 4px", fontSize: "18px", fontBold: "700", color: "var(--foreground)" }}>
              {sectionName}
            </p>

            {/* Category cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sections[sectionName].map(cat => {
                const isOpen = expanded === cat.id;
                const topics = topicLists[cat.id] || [];
                const totalDuas = topics.reduce((acc, t) => acc + (t.dua_count || 0), 0);

                return (
                  <div key={cat.id} style={{
                    borderRadius: 16, overflow: "hidden",
                    background: "var(--card)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    border: "1px solid rgba(0,0,0,0.05)"
                  }}>
                    {/* Card row */}
                    <button
                      onClick={() => handleToggle(cat.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        padding: "14px 16px", gap: 14,
                        background: "none", border: "none", cursor: "pointer", textAlign: "left"
                      }}
                    >
                      {/* Teal icon circle */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: "rgba(20,184,166,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#0d9488"
                      }}>
                        <DynIcon name={cat.icon} size={22} />
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1 }}>
                        <p className="font-heading" style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--foreground)" }}>
                          {cat.title}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "14px", color: "var(--muted-foreground)" }}>
                          {cat.topic_count} {cat.topic_count === 1 ? "topic" : "topics"}
                        </p>
                      </div>

                      {/* Chevron */}
                      {isOpen
                        ? <ChevronUp size={18} style={{ color: "#9ca3af", flexShrink: 0 }} />
                        : <ChevronDown size={18} style={{ color: "#9ca3af", flexShrink: 0 }} />}
                    </button>

                    {/* Topics list (expanded) */}
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)", background: "#fafafa" }}>
                        {topics.length === 0
                          ? <div style={{ padding: "16px", textAlign: "center" }}>
                              <Loader2 size={18} className="animate-spin" style={{ color: "#0d9488" }} />
                            </div>
                          : topics.map((topic, ti) => (
                            <button
                              key={topic.id}
                              onClick={() => navigate(`/duas/topic/${topic.id}`)}
                              style={{
                                width: "100%", display: "flex", alignItems: "center",
                                padding: "13px 16px 13px 20px",
                                background: "none", border: "none",
                                borderBottom: ti < topics.length - 1 ? "1px solid var(--border)" : "none",
                                cursor: "pointer", textAlign: "left", gap: 10
                              }}
                            >
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#0d9488", flexShrink: 0
                              }} />
                              <span className="font-heading" style={{ flex: 1, fontSize: "15px", color: "var(--foreground)", fontWeight: "600" }}>
                                {topic.title}
                              </span>
                              <span style={{ fontSize: "12px", color: "#9ca3af", flexShrink: 0 }}>
                                {topic.dua_count} duas
                              </span>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
