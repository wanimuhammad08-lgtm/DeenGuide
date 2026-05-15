import { useEffect, useState } from "react";
import { Search, Loader2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ArrowLeft, Volume2, VolumeX, X, ChevronUp, ChevronDown } from "lucide-react";
import { hadith } from "@/lib/api";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export default function Hadith() {
  const [view, setView] = useState({ kind: "grid" }); // 'grid' | 'chapters' | 'chapter' | 'global-search'
  const navigate = useNavigate();
  const location = useLocation();
  const [books, setBooks] = useState([]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalData, setGlobalData] = useState({ total: 0, total_pages: 0, results: [] });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalPage, setGlobalPage] = useState(1);

  const [chaptersData, setChaptersData] = useState({ chapters: [], loading: false });
  const [chapterData, setChapterData] = useState({ total: 0, total_pages: 0, results: [], chapter: null, loading: false });
  const [chapterPage, setChapterPage] = useState(1);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);

  const { toggle, isBookmarked } = useBookmarks();
  const tts = useTTS();

  useEffect(() => {
    hadith.books().then((d) => setBooks(d.books));

    // Deep-link hook for search from dashboard
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    const book = params.get("book");
    const number = params.get("number");
    
    if (book && number) {
      setView({ kind: "single", loading: true });
      hadith.detail(book, number)
        .then(res => setView({ kind: "single", hadith: res, loading: false }))
        .catch(() => {
          toast.error("Hadith not found");
          setView({ kind: "grid" });
        });
    } else if (q) {
      setGlobalQuery(q);
      setView({ kind: "global-search" });
      // Manually fire standard search
      setGlobalLoading(true);
      hadith.searchV2({ q: q, page: 1, per_page: 20 })
        .then((d) => setGlobalData(d))
        .finally(() => setGlobalLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Live typing global search listener
  useEffect(() => {
    const t = setTimeout(() => {
      if (globalQuery.trim().length >= 2) {
        setLiveLoading(true);
        hadith.searchV2({ q: globalQuery, per_page: 10 })
          .then(d => setLiveResults(d.results || []))
          .catch(() => setLiveResults([]))
          .finally(() => setLiveLoading(false));
      } else {
        setLiveResults([]);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [globalQuery]);

  // Load chapters when a book is opened
  useEffect(() => {
    if (view.kind !== "chapters") return;
    setChaptersData({ chapters: [], loading: true });
    // Track collection open
    trackEvent('hadith_opened', 'hadith', { collection: view.book });
    hadith
      .chapters(view.book)
      .then((d) => setChaptersData({ chapters: d.chapters || [], loading: false }))
      .catch(() => {
        toast.error("Failed to load chapters");
        setChaptersData({ chapters: [], loading: false });
      });
  }, [view.kind, view.book]);

  // Load chapter hadiths
  useEffect(() => {
    if (view.kind !== "chapter") return;
    setChapterData((d) => ({ ...d, loading: true }));
    hadith
      .chapter(view.book, view.chapter, { page: chapterPage, per_page: 20 })
      .then((d) => setChapterData({ ...d, loading: false }))
      .catch(() => {
        toast.error("Failed to load hadiths");
        setChapterData((d) => ({ ...d, loading: false }));
      });
  }, [view, chapterPage]);

  // Global search
  useEffect(() => {
    if (view.kind !== "global-search") return;
    const q = globalQuery.trim();
    if (!q) {
      setGlobalData({ total: 0, total_pages: 0, results: [] });
      return;
    }
    setGlobalLoading(true);
    hadith
      .searchV2({ q, page: globalPage, per_page: 20 })
      .then((d) => {
        setGlobalData(d);
        if (d.total === 0) {
          trackEvent('search_failed', 'hadith', { query: q });
        } else {
          trackEvent('search_performed', 'hadith', { query: q, results: d.total });
        }
      })
      .catch(() => toast.error("Failed to load hadiths"))
      .finally(() => setGlobalLoading(false));
  }, [view.kind, globalQuery, globalPage]);


  const goPage = (p, max, setter) => {
    if (p < 1 || p > max) return;
    setter(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalHadiths = books.reduce((acc, b) => acc + (b.count || 0), 0);
  const displayCount = totalHadiths > 0 ? `${totalHadiths.toLocaleString()}+` : "36,390+";

  // ───────────────────────── GRID landing ─────────────────────────
  if (view.kind === "grid") {
    return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      <div className="relative mb-6 flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card mt-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="pr-10">
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{displayCount} Authentic Hadith</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Authentic prophetic traditions from the primary collections, organized by chapters and easily searchable.
          </p>
        </div>
        <button 
          onClick={() => setShowGlobalSearch(v => !v)} 
          className="absolute right-0 top-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showGlobalSearch ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
        </button>
      </div>
        {showGlobalSearch && (
          <div className="relative mb-8 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                data-testid="hadith-global-search"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalQuery.trim()) {
                    setGlobalPage(1);
                    setView({ kind: "global-search" });
                  }
                }}
                placeholder={`Search across all ${displayCount} hadiths… (e.g., 'patience')`}
                className="w-full rounded-full border-2 border-border bg-background py-4 pl-12 pr-5 text-sm shadow-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            {liveLoading && (
              <div className="mt-3 flex justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {liveResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 max-h-[350px] overflow-y-auto scroll-thin bg-card border border-border rounded-2xl shadow-2xl z-50 divide-y divide-border/40">
                {liveResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowGlobalSearch(false);
                      setView({ kind: "single", hadith: res });
                    }}
                    className="w-full p-4 hover:bg-accent/40 transition-colors text-left block"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-primary uppercase tracking-wider">
                      {res.collection_name} #{res.standard_number || res.number}
                    </div>
                    <p className="text-[13px] text-foreground/90 line-clamp-2 leading-relaxed">
                      {res.english}
                    </p>
                  </button>
                ))}
                <button 
                  onClick={() => { setGlobalPage(1); setView({ kind: "global-search" }); }}
                  className="w-full p-3 text-center text-xs font-semibold bg-accent/20 text-primary hover:bg-accent/40 transition-colors"
                >
                  View all matches →
                </button>
              </div>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((b) => (
            <CollectionCard key={b.slug} book={b} onOpen={() => setView({ kind: "chapters", book: b.slug })} testid={`hadith-book-card-${b.slug}`} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          More collections like Musnad Ahmad &amp; Sunan ad-Darimi coming soon.
        </p>
      </div>
    );
  }

  // ───────────────────────── Global search results ─────────────────────────
  if (view.kind === "global-search") {
    return (
      <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
        <button
          data-testid="hadith-back"
          onClick={() => { setView({ kind: "grid" }); setGlobalQuery(""); setGlobalData({ total: 0, total_pages: 0, results: [] }); }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All collections
        </button>
        <h1 className="mb-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Results for "{globalQuery}"</h1>
        {!globalLoading && (
          <p className="mb-4 text-xs text-muted-foreground">{globalData.total.toLocaleString()} hadiths · Page {globalPage} of {globalData.total_pages}</p>
        )}
        {globalLoading ? (
          <Spinner />
        ) : globalData.results.length === 0 ? (
          <Empty>No hadiths matched.</Empty>
        ) : (
          <div className="space-y-4">
            {globalData.results.map((h) => (
              <HadithCard key={h.id} h={h} toggle={toggle} isBookmarked={isBookmarked} />
            ))}
          </div>
        )}
        {!globalLoading && globalData.total_pages > 1 && (
          <Pager page={globalPage} total={globalData.total_pages} onPage={(p) => goPage(p, globalData.total_pages, setGlobalPage)} />
        )}
      </div>
    );
  }

  // ───────────────────────── Chapter list (inside a book) ─────────────────────────
  if (view.kind === "chapters") {
    const currentBook = books.find((b) => b.slug === view.book);
    return (
      <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
        <button
          data-testid="hadith-back"
          onClick={() => setView({ kind: "grid" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All collections
        </button>

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Collection</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{currentBook?.name}</h1>
            {currentBook?.name_ar && <p dir="rtl" className="mt-1 font-arabic text-2xl text-primary">{currentBook.name_ar}</p>}
          </div>
        </div>

        {chaptersData.loading ? (
          <Spinner />
        ) : chaptersData.chapters.length === 0 ? (
          <Empty>This collection has no chapter index — open a hadith via search.</Empty>
        ) : (
          <div className="space-y-3">
            {chaptersData.chapters.map((c) => (
              <button
                key={c.number}
                data-testid={`hadith-chapter-${c.number}`}
                onClick={() => { setChapterPage(1); setView({ kind: "chapter", book: view.book, chapter: c.number }); }}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">{c.number}</p>
                  <h3 className="mt-1 font-heading text-base font-semibold sm:text-lg">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">({c.first}–{c.last}) · {c.count} hadith{c.count !== 1 && "s"}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── Chapter hadith list ─────────────────────────
  if (view.kind === "chapter") {
    const currentBook = books.find((b) => b.slug === view.book);
    const resultsToShow = chapterData.results;

    return (
      <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
        <button
          data-testid="hadith-back"
          onClick={() => setView({ kind: "chapters", book: view.book })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {currentBook?.name} chapters
        </button>

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Chapter {chapterData.chapter?.number}</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{chapterData.chapter?.title}</h1>
            {chapterData.chapter && (
              <p className="mt-1 text-xs text-muted-foreground">({chapterData.chapter.first}–{chapterData.chapter.last}) · {chapterData.total} hadiths</p>
            )}
          </div>
        </div>



        {chapterData.loading ? (
          <Spinner />
        ) : resultsToShow.length === 0 ? (
          <Empty>No hadiths in this view.</Empty>
        ) : (
          <div className="space-y-4">
            {resultsToShow.map((h) => (
              <HadithCard key={h.id} h={h} toggle={toggle} isBookmarked={isBookmarked} />
            ))}
          </div>
        )}

        {!chapterData.loading && chapterData.total_pages > 1 && (
          <Pager page={chapterPage} total={chapterData.total_pages} onPage={(p) => goPage(p, chapterData.total_pages, setChapterPage)} />
        )}
      </div>
    );
  }

  // ───────────────────────── Single Hadith View ─────────────────────────
  if (view.kind === "single") {
    return (
      <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
        <button
          onClick={() => {
            const params = new URLSearchParams(location.search);
            if (params.has("book") || params.has("number") || params.has("q")) {
              navigate(-1);
            } else {
              setView({ kind: "grid" });
            }
          }}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        
        {view.loading ? (
          <Spinner />
        ) : view.hadith ? (
          <HadithCard h={view.hadith} toggle={toggle} isBookmarked={isBookmarked} />
        ) : (
          <Empty>Hadith could not be loaded.</Empty>
        )}
      </div>
    );
  }

  return null;
}

// ───────────────────────── Sub-components ─────────────────────────
const Spinner = () => (
  <div className="grid place-items-center py-16 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);

const Empty = ({ children }) => (
  <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{children}</div>
);

const Pager = ({ page, total, onPage }) => (
  <div className="mt-8 flex items-center justify-center gap-2">
    <button data-testid="hadith-prev-page" onClick={() => onPage(page - 1)} disabled={page === 1}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40">
      <ChevronLeft className="h-4 w-4" /> Prev
    </button>
    <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">{page} / {total}</div>
    <button data-testid="hadith-next-page" onClick={() => onPage(page + 1)} disabled={page >= total}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40">
      Next <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);


const CollectionCard = ({ book, onOpen, testid }) => {
  const c = book.color || "hsl(var(--primary))";
  return (
    <button
      data-testid={testid}
      onClick={onOpen}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <div className="pattern-dots h-full w-full" />
      </div>
      <div className="relative flex flex-col items-center gap-3 py-4 text-center">
        <p dir="rtl" className="font-arabic text-4xl leading-none sm:text-5xl" style={{ color: c }}>
          {book.name_ar || book.name}
        </p>
        <h3 className="font-heading text-xl font-semibold">{book.name}</h3>
        <p className="text-xs text-muted-foreground">
          {book.compiler}
          {book.count > 0 && <> · {book.count.toLocaleString()} hadiths</>}
        </p>
        {book.note && (
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80 italic">
            {book.note}
          </p>
        )}
      </div>
    </button>
  );
};

const HadithCard = ({ h, toggle, isBookmarked }) => {
  const saved = isBookmarked("hadiths", h.id);
  const [expanded, setExpanded] = useState(false);

  return (
    <article data-testid={`hadith-${h.id}`} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
        <span className="font-semibold text-foreground">{h.collection_name}</span>
        <span className="text-muted-foreground">#{h.standard_number || h.number}</span>
        {h.authenticity && <AuthenticityBadge level={h.authenticity} />}
        {h.grade_text && h.grade_text.toLowerCase() !== (h.authenticity || "").toLowerCase() && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground" title="Grade">
            {h.grade_text}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            data-testid={`bookmark-hadith-${h.id}`}
            onClick={() => { toggle("hadiths", h); toast.success(saved ? "Removed bookmark" : "Hadith saved"); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent"
          >
            {saved ? <BookmarkCheck className="h-3 w-3 text-primary" /> : <Bookmark className="h-3 w-3" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {h.arabic && (
        <p dir="rtl" className="mt-2 text-right font-arabic text-2xl leading-[2.2]">{h.arabic}</p>
      )}

      {expanded && (
        <div className="mt-5 pt-4 border-t border-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
          {h.narrator && <p className="mb-3 text-xs italic font-medium text-muted-foreground">{h.narrator}</p>}
          <p className="text-sm leading-relaxed text-foreground">{h.english}</p>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border/60 bg-accent/5 text-[12px] font-bold text-primary hover:bg-accent/10 transition-all"
        >
          {expanded ? "Show Less" : "View Translation"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </article>
  );
};


