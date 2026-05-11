import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Activity, Users, Search, BookMarked, Play, TrendingUp, ArrowLeft, RefreshCw } from "lucide-react";
import {
  UserGrowthChart, PeakHoursChart, UserTypeChart, TopRecitersChart,
  BookmarkAnalytics, UserManagementTable, SearchQualityScore
} from "../components/admin/AnalyticsWidgets";

const COLORS = ["#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#ccfbf1"];
const fmt = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n;

function StatCard({ icon: Icon, label, value, sub, color="text-primary" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
      <div className="rounded-xl bg-primary/10 p-3 shrink-0">
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold font-heading">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="text-3xl">📊</span>
      <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
    </div>
  );
}

const timeAgo = iso => {
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

const feedLabel = row => {
  const m = row.metadata || {};
  const map = {
    quran_surah_opened: `📖 ${m.surah_name || "Surah"} opened`,
    ayah_bookmarked: `🔖 Ayah bookmarked`,
    hadith_opened: `📜 Hadith (${m.collection || ""}) opened`,
    dua_opened: `🤲 Dua "${m.category || ""}" opened`,
    audio_played: `🎵 Recitation played`,
    search_performed: `🔍 Searched "${m.query || ""}"`,
    search_failed: `❌ Failed search "${m.query || ""}"`,
  };
  return map[row.event_type] || row.event_type;
};

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({ totalUsers:0, totalEvents:0, totalBookmarks:0, totalSearches:0, failedSearches:0, audioPlays:0 });
  const [featureBreakdown, setFeatureBreakdown] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [topSearches, setTopSearches] = useState([]);
  const [failedSearchList, setFailedSearchList] = useState([]);
  const [topSurahs, setTopSurahs] = useState([]);
  const [recentFeed, setRecentFeed] = useState([]);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/more/profile"); return; }
    supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
      if (data?.role === "admin") setIsAdmin(true);
      else navigate("/");
      setCheckingRole(false);
    });
  }, [user, loading, navigate]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    // 1. Overview Stats (bypassing RLS via RPC)
    const { data: statsData } = await supabase.rpc("get_admin_overview_stats");
    if (statsData) {
      setStats({
        totalUsers: statsData.total_users || 0,
        totalEvents: statsData.total_events || 0,
        totalBookmarks: statsData.total_bookmarks || 0,
        totalSearches: statsData.total_searches || 0,
        failedSearches: statsData.failed_searches || 0,
        audioPlays: statsData.audio_plays || 0
      });
    }

    // Feature breakdown
    const { data: featRaw } = await supabase.from("analytics_events").select("feature").not("feature","is",null);
    if (featRaw) {
      const counts = featRaw.reduce((a,r) => { a[r.feature]=(a[r.feature]||0)+1; return a; }, {});
      setFeatureBreakdown(Object.entries(counts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value));
    }

    // Daily activity (14 days)
    const since = new Date(); since.setDate(since.getDate()-13);
    const { data: dayRaw } = await supabase.from("analytics_events").select("created_at").gte("created_at",since.toISOString());
    if (dayRaw) {
      const map = {};
      for (let i=13;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        map[d.toLocaleDateString("en-US",{month:"short",day:"numeric"})]=0;
      }
      dayRaw.forEach(r=>{const k=new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"});if(k in map)map[k]++;});
      setDailyActivity(Object.entries(map).map(([date,events])=>({date,events})));
    }

    // Top searches
    const { data: srchRaw } = await supabase.from("analytics_events").select("metadata").eq("event_type","search_performed").not("metadata","is",null).limit(300);
    if (srchRaw) {
      const qm = {};
      srchRaw.forEach(({metadata})=>{ const q=metadata?.query?.toLowerCase().trim(); if(q) qm[q]=(qm[q]||0)+1; });
      setTopSearches(Object.entries(qm).map(([query,count])=>({query,count})).sort((a,b)=>b.count-a.count).slice(0,10));
    }

    // Failed searches
    const { data: failRaw } = await supabase.from("analytics_events").select("metadata,created_at").eq("event_type","search_failed").order("created_at",{ascending:false}).limit(8);
    setFailedSearchList(failRaw||[]);

    // Top surahs
    const { data: surahRaw } = await supabase.from("analytics_events").select("metadata").eq("event_type","quran_surah_opened").not("metadata","is",null).limit(300);
    if (surahRaw) {
      const sm = {};
      surahRaw.forEach(({metadata})=>{ const n=metadata?.surah_name||`Surah ${metadata?.surah}`; if(n) sm[n]=(sm[n]||0)+1; });
      setTopSurahs(Object.entries(sm).map(([name,views])=>({name,views})).sort((a,b)=>b.views-a.views).slice(0,8));
    }

    // Recent feed
    const { data: feed } = await supabase.from("analytics_events").select("event_type,feature,metadata,created_at").order("created_at",{ascending:false}).limit(15);
    setRecentFeed(feed||[]);

    setRefreshing(false);
  }, []);

  useEffect(() => { if(isAdmin) fetchAll(); }, [isAdmin, fetchAll]);

  if (loading || checkingRole) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    </div>
  );
  if (!isAdmin) return null;

  const CHART_STYLE = { contentStyle:{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:12, fontSize:12 } };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/more/profile" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">DeenGuide Analytics</p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-accent disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing?"animate-spin":""}`} />
          Refresh
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 p-4 pt-6">

        {/* ── Overview Stats ── */}
        <section>
          <SectionHeader title="Overview" sub="Total lifetime metrics" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={Users} label="Total Users" value={fmt(stats.totalUsers)} />
            <StatCard icon={Activity} label="Total Events" value={fmt(stats.totalEvents)} />
            <StatCard icon={BookMarked} label="Bookmarks" value={fmt(stats.totalBookmarks)} />
            <StatCard icon={Search} label="Searches" value={fmt(stats.totalSearches)} />
            <StatCard icon={TrendingUp} label="Failed Searches" value={fmt(stats.failedSearches)} color="text-destructive" />
            <StatCard icon={Play} label="Audio Plays" value={fmt(stats.audioPlays)} />
          </div>
        </section>

        {/* ── Search Quality ── */}
        <SearchQualityScore totalSearches={stats.totalSearches} failedSearches={stats.failedSearches} />

        {/* ── User Growth + Daily Activity ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <UserGrowthChart />
          <section>
            <SectionHeader title="Daily Activity" sub="Events over the last 14 days" />
            <div className="rounded-2xl border border-border bg-card p-4">
              {dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:10 }} allowDecimals={false} />
                    <Tooltip {...CHART_STYLE} />
                    <Line type="monotone" dataKey="events" stroke="#0d9488" strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty text="Daily activity will appear as users use the app." />}
            </div>
          </section>
        </div>

        {/* ── Peak Hours + Guest Ratio ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <PeakHoursChart />
          <UserTypeChart />
        </div>

        {/* ── Feature Usage + Top Surahs ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <SectionHeader title="Feature Usage" sub="Which features are used most" />
            <div className="rounded-2xl border border-border bg-card p-4">
              {featureBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={featureBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={75}
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {featureBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...CHART_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {featureBreakdown.map((item,i)=>(
                      <span key={i} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background:COLORS[i%COLORS.length]+"22", color:COLORS[i%COLORS.length] }}>
                        {item.name} ({item.value})
                      </span>
                    ))}
                  </div>
                </>
              ) : <Empty text="Feature breakdown appears as users navigate the app." />}
            </div>
          </section>

          <section>
            <SectionHeader title="Top Surahs" sub="Most opened Surahs" />
            <div className="rounded-2xl border border-border bg-card p-4">
              {topSurahs.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSurahs} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={80} />
                    <Tooltip {...CHART_STYLE} />
                    <Bar dataKey="views" fill="#0d9488" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty text="Surah data appears as users read the Quran." />}
            </div>
          </section>
        </div>

        {/* ── Top Reciters ── */}
        <TopRecitersChart />

        {/* ── Bookmark Analytics ── */}
        <BookmarkAnalytics />

        {/* ── Search Analytics ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <SectionHeader title="Top Searches" sub="Most searched queries" />
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {topSearches.length > 0 ? (
                <ul className="divide-y divide-border">
                  {topSearches.map((item,i)=>(
                    <li key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i+1}</span>
                        <span className="text-sm font-medium truncate">{item.query}</span>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{item.count}×</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="Search queries appear as users search." />}
            </div>
          </section>

          <section>
            <SectionHeader title="Failed Searches" sub="Content gaps — queries with 0 results" />
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {failedSearchList.length > 0 ? (
                <ul className="divide-y divide-border">
                  {failedSearchList.map((item,i)=>(
                    <li key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-destructive truncate font-medium">❌ {item.metadata?.query||"Unknown"}</span>
                      <span className="ml-3 shrink-0 text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="No failed searches yet. Great!" />}
            </div>
          </section>
        </div>

        {/* ── Live Activity Feed ── */}
        <section>
          <SectionHeader title="Live Activity Feed" sub="Most recent 15 events" />
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {recentFeed.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentFeed.map((row,i)=>(
                  <li key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm truncate">{feedLabel(row)}</span>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">{timeAgo(row.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty text="Events will appear as users interact with the app." />}
          </div>
        </section>

        {/* ── User Management ── */}
        <UserManagementTable />

      </div>
    </div>
  );
}
