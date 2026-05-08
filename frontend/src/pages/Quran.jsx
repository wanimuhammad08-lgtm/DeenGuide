import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Loader2, ChevronDown, BookOpen, Headphones, 
  ChevronRight, Layers, Calendar, Star, Bookmark, BookmarkCheck 
} from "lucide-react";
import { quran } from "@/lib/api";
import { useBookmarks } from "@/lib/bookmarks";

const TABS = [
  { key: "surah", label: "Surah", icon: BookOpen },
  { key: "juz", label: "Juz", icon: Layers },
  { key: "revelation", label: "Revelation Order", icon: Calendar },
  { key: "favorites", label: "Favorites", icon: Star },
];

const LAST_SEEN_KEY = "deenguide:last-seen-surah";
const LAST_AUDIO_KEY = "deenguide:last-audio";
const FAV_KEY = "deenguide:fav-surahs";

// Standard Egyptian Chronological Order (Surah number to Revelation Order)
const REVELATION_ORDER = {
  1:5, 2:87, 3:89, 4:92, 5:112, 6:55, 7:39, 8:88, 9:113, 10:51,
  11:52, 12:53, 13:96, 14:72, 15:54, 16:70, 17:50, 18:69, 19:44, 20:45,
  21:73, 22:103, 23:74, 24:102, 25:42, 26:47, 27:48, 28:49, 29:85, 30:84,
  31:57, 32:75, 33:90, 34:58, 35:43, 36:41, 37:56, 38:38, 39:59, 40:60,
  41:61, 42:62, 43:63, 44:64, 45:65, 46:66, 47:95, 48:111, 49:106, 50:34,
  51:67, 52:76, 53:23, 54:37, 55:97, 56:46, 57:94, 58:105, 59:101, 60:91,
  61:109, 62:110, 63:104, 64:108, 65:99, 66:107, 67:77, 68:2, 69:78, 70:79,
  71:71, 72:40, 73:3, 74:4, 75:31, 76:98, 77:33, 78:80, 79:81, 80:24,
  81:7, 82:82, 83:86, 84:83, 85:27, 86:36, 87:8, 88:68, 89:10, 90:35,
  91:26, 92:9, 93:11, 94:12, 95:28, 96:1, 97:25, 98:100, 99:93, 100:14,
  101:30, 102:16, 103:13, 104:32, 105:19, 106:29, 107:17, 108:15, 109:18, 110:114,
  111:6, 112:22, 113:20, 114:21
};

export default function Quran() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("surah");
  const [sortAsc, setSortAsc] = useState(true);
  const [lastSeen, setLastSeen] = useState(null);
  const [lastAudio, setLastAudio] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useBookmarks();

  useEffect(() => {
    quran
      .surahs()
      .then((d) => setList(d))
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
    refreshLocal();
    const sync = () => refreshLocal();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const refreshLocal = () => {
    try {
      setLastSeen(JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || "null"));
      setLastAudio(JSON.parse(localStorage.getItem(LAST_AUDIO_KEY) || "null"));
      setFavorites(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      setFavorites([]);
    }
  };

  const toggleFav = (n, e) => {
    e.preventDefault();
    e.stopPropagation();
    let next;
    if (favorites.includes(n)) next = favorites.filter((x) => x !== n);
    else next = [...favorites, n];
    setFavorites(next);
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const filteredSurahs = useMemo(() => {
    let base = [...list];
    
    if (tab === "favorites") {
      base = base.filter((s) => favorites.includes(s.number));
    }

    if (q) {
      const t = q.toLowerCase();
      base = base.filter(
        (s) =>
          s.englishName.toLowerCase().includes(t) ||
          s.englishNameTranslation.toLowerCase().includes(t) ||
          String(s.number) === t
      );
    }

    if (tab === "revelation") {
      base.sort((a, b) => {
        const revA = REVELATION_ORDER[a.number] || 999;
        const revB = REVELATION_ORDER[b.number] || 999;
        return revA - revB;
      });
    } else {
      base.sort((a, b) => a.number - b.number);
    }
    
    if (!sortAsc) {
      base.reverse();
    }
    return base;
  }, [list, tab, sortAsc, favorites, q]);

  const juzData = useMemo(() => {
    return [
      { id: 1, surahs: [1, 2] },
      { id: 2, surahs: [2] },
      { id: 3, surahs: [2, 3] },
      { id: 4, surahs: [3, 4] },
      { id: 5, surahs: [4] },
      { id: 6, surahs: [4, 5] },
      { id: 7, surahs: [5, 6] },
      { id: 8, surahs: [6, 7] },
      { id: 9, surahs: [7, 8] },
      { id: 10, surahs: [8, 9] },
      ...Array.from({ length: 20 }, (_, i) => ({ id: i + 11, surahs: [10 + i] }))
    ];
  }, []);

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      
      {/* Page Header (Matching Ask AI) */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">THE NOBLE QUR'AN</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">114 Surahs</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Beautiful Arabic, multiple translations, Tafsir Ibn Kathir, audio recitation, and bookmarks.
        </p>
      </div>



      {/* Underline Tabs */}
      <div className="mb-6 flex items-center border-b border-border/40 overflow-x-auto scroll-thin">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-3 text-[15px] font-medium transition-colors ${
              tab === t.key 
                ? "border-b-2 border-foreground text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {tab !== "juz" && (
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search surahs..."
            className="w-full rounded-2xl border border-border/80 bg-card py-4 pl-12 pr-5 text-[15px] shadow-sm outline-none transition-colors focus:border-[#178b50]/50 focus:ring-2 focus:ring-[#178b50]/10"
          />
        </div>
      )}

      {/* Sort By Toggle */}
      {tab !== "juz" && (
        <div className="mb-4 flex justify-end">
          <button 
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            SORT BY: {sortAsc ? "ASCENDING" : "DESCENDING"}
            <ChevronDown className={`h-4 w-4 transition-transform ${!sortAsc ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* Revelation Order Info */}
      {tab === "revelation" && (
        <div className="mb-6 rounded-lg border border-[#2ca4ab]/20 bg-[#2ca4ab]/5 p-4 text-[13px] leading-relaxed text-foreground/80">
          This view shows the chronological order of Surahs in the Quran based on when they were revealed to the Prophet Muhammad ﷺ. The chronology is a subject of scholarly opinion and some Surahs were revealed in parts at different times. The ordering here is based on the work of Tanzil.net. [Note: the compiled Mushaf order from al-Fatiha to al-Nas is a matter of consensus.]
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : tab === "juz" ? (
        // JUZ VIEW
        <div className="space-y-6">
          {juzData.map((juz) => (
            <div key={juz.id} className="rounded-xl bg-card p-4 sm:p-6 bg-accent/5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-[15px] text-foreground">Juz {juz.id}</h3>
                <Link to={`/quran/${juz.surahs[0]}`} className="text-[13px] font-medium text-foreground underline hover:no-underline hover:text-primary transition-colors">
                  Read Juz
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {juz.surahs.map((sNum) => {
                  const surah = list.find((s) => s.number === sNum);
                  if (!surah) return null;
                  return <SurahRow key={sNum} surah={surah} fav={favorites.includes(sNum)} toggleFav={toggleFav} />;
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // SURAH / REVELATION / FAVORITES VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSurahs.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-2xl border-border bg-card">
              {tab === "favorites" ? "No favorites yet. Tap the bookmark icon on any Surah to add it." : "No Surahs found."}
            </div>
          ) : (
            filteredSurahs.map((s) => (
              <SurahRow key={s.number} surah={s} fav={favorites.includes(s.number)} toggleFav={toggleFav} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Reusable Surah Row component mimicking Quran.com styling
function SurahRow({ surah, fav, toggleFav }) {
  return (
    <Link
      to={`/quran/${surah.number}`}
      className="group relative flex flex-col justify-between rounded border border-border/60 bg-card p-4 transition-all hover:border-border hover:bg-accent/10 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rotate-45 rounded-sm bg-muted/70 transition-colors group-hover:bg-primary/10" />
          <span className="relative text-[13px] font-bold text-foreground group-hover:text-primary">{surah.number}</span>
        </div>
        
        <div className="flex flex-col min-w-0 pr-2">
          <h3 className="font-bold text-[15px] text-foreground transition-colors group-hover:text-primary">{surah.englishName}</h3>
          <p className="text-[12px] font-medium text-muted-foreground">{surah.englishNameTranslation}</p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between sm:mt-0 sm:flex-col sm:items-end sm:gap-0 pl-14 sm:pl-0 sm:pr-10">
        <h3 dir="rtl" className="font-arabic text-[20px] text-foreground/90">{surah.name}</h3>
        <p className="text-[12px] font-medium text-muted-foreground">{surah.numberOfAyahs} Ayahs</p>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFav(surah.number, e);
        }}
        className="absolute right-3 top-4 sm:top-1/2 sm:-translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
      >
        {fav ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5 opacity-40 hover:opacity-100" />}
      </button>
    </Link>
  );
}
