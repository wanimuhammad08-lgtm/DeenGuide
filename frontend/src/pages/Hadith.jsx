import { useEffect, useState } from "react";
import { Search, Loader2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ArrowLeft, Volume2, VolumeX, Languages } from "lucide-react";
import { hadith } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANG_KEY = "deenguide:hadith-lang";
const LANGS = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "id", label: "Bahasa" },
  { code: "tr", label: "Türkçe" },
  { code: "bn", label: "বাংলা" },
];

export default function Hadith() {
  const [view, setView] = useState({ kind: "grid" }); // 'grid' | 'chapters' | 'chapter' | 'global-search'
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalData, setGlobalData] = useState({ total: 0, total_pages: 0, results: [] });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalPage, setGlobalPage] = useState(1);

  const [chaptersData, setChaptersData] = useState({ chapters: [], loading: false });
  const [chapterData, setChapterData] = useState({ total: 0, total_pages: 0, results: [], chapter: null, loading: false });
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterQuery, setChapterQuery] = useState("");
  const [debouncedChapterQ, setDebouncedChapterQ] = useState("");
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");

  const { toggle, isBookmarked } = useBookmarks();
  const tts = useTTS();

  useEffect(() => {
    hadith.books().then((d) => setBooks(d.books));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedChapterQ(chapterQuery), 350);
    return () => clearTimeout(t);
  }, [chapterQuery]);

  // Load chapters when a book is opened
  useEffect(() => {
    if (view.kind !== "chapters") return;
    setChaptersData({ chapters: [], loading: true });
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
      .chapter(view.book, view.chapter, { page: chapterPage, per_page: 20, lang: lang === "en" ? undefined : lang })
      .then((d) => setChapterData({ ...d, loading: false }))
      .catch(() => {
        toast.error("Failed to load hadiths");
        setChapterData((d) => ({ ...d, loading: false }));
      });
  }, [view, chapterPage, lang]);

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
      .then(setGlobalData)
      .catch(() => toast.error("Failed to load hadiths"))
      .finally(() => setGlobalLoading(false));
  }, [view.kind, globalQuery, globalPage]);

  const handleLangChange = (code) => {
    setLang(code);
    localStorage.setItem(LANG_KEY, code);
  };

  const goPage = (p, max, setter) => {
    if (p < 1 || p > max) return;
    setter(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ───────────────────────── GRID landing ─────────────────────────
  if (view.kind === "grid") {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card mt-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">38,000+ Authentic Hadith</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            The Kutub al-Sittah, Muwatta and Musnad Ahmad — organized by chapters, multilingual, with audio recitation.
          </p>
          </div>
        </div>
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="hadith-global-search"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && globalQuery.trim()) {
                setGlobalPage(1);
                setView({ kind: "global-search" });
              }
            }}
            placeholder="Search across all 38,000+ hadiths… (press Enter)"
            className="w-full rounded-full border-2 border-border bg-background py-4 pl-12 pr-5 text-sm shadow-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((b) => (
            <CollectionCard key={b.slug} book={b} onOpen={() => setView({ kind: "chapters", book: b.slug })} testid={`hadith-book-card-${b.slug}`} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          More collections like Silsila Sahiha &amp; Adab al-Mufrad coming soon.
        </p>
      </div>
    );
  }

  // ───────────────────────── Global search results ─────────────────────────
  if (view.kind === "global-search") {
    return (
      <div className="mx-auto max-w-4xl">
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
      <div className="mx-auto max-w-4xl">
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
          {["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"].includes(view.book) && (
            <LangSelect lang={lang} onChange={handleLangChange} />
          )}
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
                onClick={() => { setChapterPage(1); setChapterQuery(""); setView({ kind: "chapter", book: view.book, chapter: c.number }); }}
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
    const langDir = LANGS.find((l) => l.code === lang)?.dir;
    const filtered = debouncedChapterQ
      ? chapterData.results.filter((h) => (h.english + " " + (h.translation_text || "")).toLowerCase().includes(debouncedChapterQ.toLowerCase()))
      : chapterData.results;

    return (
      <div className="mx-auto max-w-4xl">
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
          {["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"].includes(view.book) && (
            <LangSelect lang={lang} onChange={handleLangChange} />
          )}
        </div>

        {/* Inline search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="hadith-chapter-search"
            value={chapterQuery}
            onChange={(e) => setChapterQuery(e.target.value)}
            placeholder="Search within this chapter…"
            className="w-full rounded-full border-2 border-border bg-background py-3 pl-12 pr-5 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        {chapterData.loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty>No hadiths in this view.</Empty>
        ) : (
          <div className="space-y-4">
            {filtered.map((h) => (
              <HadithCard key={h.id} h={h} toggle={toggle} isBookmarked={isBookmarked} langDir={langDir} />
            ))}
          </div>
        )}

        {!chapterData.loading && chapterData.total_pages > 1 && !chapterQuery && (
          <Pager page={chapterPage} total={chapterData.total_pages} onPage={(p) => goPage(p, chapterData.total_pages, setChapterPage)} />
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

const LangSelect = ({ lang, onChange }) => (
  <div className="flex items-center gap-2">
    <Languages className="h-4 w-4 text-muted-foreground" />
    <Select value={lang} onValueChange={onChange}>
      <SelectTrigger data-testid="hadith-lang-select" className="h-9 min-w-[120px] rounded-full border border-border bg-background text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

const HadithCard = ({ h, toggle, isBookmarked, langDir }) => {
  const saved = isBookmarked("hadiths", h.id);

  return (
    <article data-testid={`hadith-${h.id}`} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-foreground">{h.collection_name}</span>
        <span className="text-muted-foreground">#{h.number}</span>
        {h.narrator && <span className="hidden text-muted-foreground sm:inline">· {h.narrator}</span>}
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
        <p dir="rtl" className="mt-4 text-right font-arabic text-2xl leading-[2.2]">{h.arabic}</p>
      )}
      {h.narrator && <p className="mt-3 text-xs italic text-muted-foreground sm:hidden">{h.narrator}</p>}
      {/* Translation in alternate language if provided, else English */}
      {h.translation_text ? (
        <p
          dir={langDir || (h.translation_lang === "ur" || h.translation_lang === "ar" ? "rtl" : "ltr")}
          className={`mt-3 leading-relaxed text-foreground ${(h.translation_lang === "ur" || h.translation_lang === "ar") ? "text-right" : "text-sm"} ${h.translation_lang === "ur" ? "font-urdu text-xl leading-[2.6]" : h.translation_lang === "ar" ? "font-naskh text-lg leading-[2.2]" : ""}`}
        >
          {h.translation_text}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{h.english}</p>
      )}


    </article>
  );
};
