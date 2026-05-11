import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";

const COLORS = ["#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#0891b2","#0284c7","#7c3aed"];
const CHART_STYLE = {
  contentStyle: { background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:12, fontSize:12 }
};

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ children, className="" }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="text-3xl">📊</span>
      <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
    </div>
  );
}

// ── User Growth Chart ─────────────────────────────────────────────────────────
export function UserGrowthChart() {
  const [data, setData] = useState([]);
  useEffect(() => {
    supabase.rpc("get_weekly_signups").then(({ data: d }) => {
      if (d) setData(d.map(r => ({ week: r.week, signups: Number(r.signups) })));
    });
  }, []);

  return (
    <section>
      <SectionHeader title="User Growth" sub="New signups per week (last 12 weeks)" />
      <Card>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize:10 }} />
              <YAxis tick={{ fontSize:10 }} allowDecimals={false} />
              <Tooltip {...CHART_STYLE} />
              <Area type="monotone" dataKey="signups" stroke="#0d9488" strokeWidth={2} fill="url(#growthGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <Empty text="User signup data will appear as people register." />}
      </Card>
    </section>
  );
}

// ── Peak Usage Hours ──────────────────────────────────────────────────────────
export function PeakHoursChart() {
  const [data, setData] = useState([]);
  useEffect(() => {
    supabase.rpc("get_hourly_activity").then(({ data: d }) => {
      if (d) {
        // Fill all 24 hours
        const map = {};
        d.forEach(r => { map[r.hour] = Number(r.event_count); });
        const full = Array.from({ length: 24 }, (_, h) => ({
          hour: `${String(h).padStart(2,"0")}:00`,
          events: map[h] || 0
        }));
        setData(full);
      }
    });
  }, []);

  return (
    <section>
      <SectionHeader title="Peak Usage Hours" sub="When are users most active (UTC) — ideal for notification timing" />
      <Card>
        {data.some(d => d.events > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize:9 }} interval={2} />
              <YAxis tick={{ fontSize:10 }} allowDecimals={false} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="events" fill="#0d9488" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty text="Usage patterns appear as users interact with the app." />}
      </Card>
    </section>
  );
}

// ── Guest vs Signed-in ────────────────────────────────────────────────────────
export function UserTypeChart() {
  const [data, setData] = useState([]);
  useEffect(() => {
    supabase.rpc("get_user_type_ratio").then(({ data: d }) => {
      if (d) setData(d.map(r => ({ name: r.user_type, value: Number(r.event_count) })));
    });
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section>
      <SectionHeader title="Guest vs Signed-in" sub="Proportion of anonymous vs authenticated activity" />
      <Card>
        {data.length > 0 && total > 0 ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...CHART_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {data.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">({((item.value/total)*100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        ) : <Empty text="Ratio data appears as users interact with the app." />}
      </Card>
    </section>
  );
}

// ── Top Reciters ──────────────────────────────────────────────────────────────
export function TopRecitersChart() {
  const [data, setData] = useState([]);
  useEffect(() => {
    supabase.rpc("get_top_reciters").then(({ data: d }) => {
      if (d) setData(d.map(r => ({ name: r.reciter_name, plays: Number(r.play_count) })));
    });
  }, []);

  return (
    <section>
      <SectionHeader title="Top Reciters" sub="Most played reciters across all users" />
      <Card>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={100} />
              <Tooltip {...CHART_STYLE} />
              <Bar dataKey="plays" fill="#0891b2" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty text="Reciter data appears once users play audio recitations." />}
      </Card>
    </section>
  );
}

// ── Most Bookmarked Items ─────────────────────────────────────────────────────
export function BookmarkAnalytics() {
  const [ayahs, setAyahs] = useState([]);
  const [hadiths, setHadiths] = useState([]);
  const [tab, setTab] = useState("ayahs");

  useEffect(() => {
    supabase.rpc("get_top_bookmarks", { item_kind: "ayahs", lim: 8 })
      .then(({ data: d }) => { if (d) setAyahs(d); });
    supabase.rpc("get_top_bookmarks", { item_kind: "hadiths", lim: 8 })
      .then(({ data: d }) => { if (d) setHadiths(d); });
  }, []);

  const items = tab === "ayahs" ? ayahs : hadiths;

  return (
    <section>
      <SectionHeader title="Most Bookmarked Content" sub="Which content resonates most with users" />
      <div className="mb-3 flex gap-2">
        {["ayahs","hadiths"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${tab===t ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:bg-accent"}`}>
            {t === "ayahs" ? "📖 Ayahs" : "📜 Hadiths"}
          </button>
        ))}
      </div>
      <Card>
        {items.length > 0 ? (
          <ul className="divide-y divide-border">
            {items.map((item, i) => {
              const data = item.item_data || {};
              const label = tab === "ayahs"
                ? `${data.surahName || data.surah_name || ""} ${data.verse_key || data.number || item.item_id}`
                : `${data.collection_name || ""} #${data.number || item.item_id}`;
              return (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i+1}</span>
                    <span className="text-sm font-medium truncate">{label || item.item_id}</span>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{item.bookmark_count}×</span>
                </li>
              );
            })}
          </ul>
        ) : <Empty text="Bookmark data appears as users save Ayahs and Hadiths." />}
      </Card>
    </section>
  );
}

// ── User Management Table ─────────────────────────────────────────────────────
export function UserManagementTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  const fetchUsers = useCallback(async (p) => {
    setLoading(true);
    const { data } = await supabase.rpc("get_admin_user_list", { lim: PER_PAGE, offs: p * PER_PAGE });
    if (data) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(page); }, [page, fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const timeAgo = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  return (
    <section>
      <SectionHeader title="User Management" sub="All registered users — change roles or review accounts" />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No users yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">← Prev</button>
              <span className="text-xs text-muted-foreground">Page {page+1}</span>
              <button onClick={() => setPage(p => p+1)} disabled={users.length < PER_PAGE}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">Next →</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Search Quality Score ──────────────────────────────────────────────────────
export function SearchQualityScore({ totalSearches, failedSearches }) {
  const successRate = totalSearches > 0
    ? (((totalSearches - failedSearches) / totalSearches) * 100).toFixed(1)
    : null;

  const color = successRate >= 80 ? "text-emerald-500" : successRate >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <section>
      <SectionHeader title="Search Quality Score" sub="% of searches that return results" />
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
        <div className="text-center shrink-0">
          <p className={`text-5xl font-heading font-bold ${color}`}>{successRate ?? "—"}{successRate && "%"}</p>
          <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Total Searches</span>
            <span className="font-semibold">{totalSearches}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Failed</span>
            <span className="font-semibold text-destructive">{failedSearches}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Successful</span>
            <span className="font-semibold text-emerald-500">{totalSearches - failedSearches}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
