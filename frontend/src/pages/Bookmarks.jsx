import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ScrollText, Hand, Sparkles, Trash2, Bookmark, ArrowLeft } from "lucide-react";
import { useBookmarks } from "@/lib/bookmarks";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { toast } from "sonner";

const tabs = [
  { key: "ayahs", label: "Ayahs", icon: BookOpen },
  { key: "hadiths", label: "Hadiths", icon: ScrollText },
  { key: "duas", label: "Duas", icon: Hand },
  { key: "answers", label: "AI Answers", icon: Sparkles },
];

function getUser() {
  try { return JSON.parse(localStorage.getItem("deenguide_user")); } catch { return null; }
}

export default function Bookmarks() {
  const { data, remove, clearAll } = useBookmarks();
  const [tab, setTab] = useState("ayahs");
  const items = data[tab] || [];
  const hasAny = ["ayahs", "hadiths", "duas", "answers"].some((k) => (data[k] || []).length > 0);
  const user = getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
          <Bookmark className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold">Sign in to view Bookmarks</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create an account or sign in to save and access your bookmarks.</p>
        <Link
          to="/more/profile"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
        >
          Sign In / Register
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/more"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Saved</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your bookmarks</h1>
            <p className="mt-2 text-sm text-muted-foreground">Stored on this device only.</p>
          </div>
        </div>
        {hasAny && (
          <button
            data-testid="clear-bookmarks"
            onClick={() => { clearAll(); toast.success("All bookmarks cleared"); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto scroll-thin">
        {tabs.map((t) => (
          <button
            key={t.key}
            data-testid={`bookmark-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            <span className="ml-1 rounded-full bg-background/30 px-1.5 py-px text-[10px]">{(data[t.key] || []).length}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No saved items yet. Tap the bookmark icon anywhere to save.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "ayahs" && items.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <Link to={`/quran/${a.surah}`} className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {a.surah_name} ({a.surah}:{a.ayah})
                </Link>
                <RemoveBtn onClick={() => remove("ayahs", a.id)} testid={`remove-ayah-${a.id}`} />
              </div>
              <p dir="rtl" className="mt-3 text-right font-arabic text-2xl leading-[2.2]">{a.arabic}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a.translation}</p>
            </div>
          ))}
          {tab === "hadiths" && items.map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">{h.collection_name || h.collection}</span>
                <span className="text-muted-foreground">#{h.number}</span>
                <AuthenticityBadge level={h.authenticity} />
                <RemoveBtn className="ml-auto" onClick={() => remove("hadiths", h.id)} testid={`remove-hadith-${h.id}`} />
              </div>
              <p className="mt-3 text-sm">{h.english}</p>
            </div>
          ))}
          {tab === "duas" && items.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-base font-semibold">{d.title}</h3>
                <RemoveBtn onClick={() => remove("duas", d.id)} testid={`remove-dua-${d.id}`} />
              </div>
              <p dir="rtl" className="mt-3 text-right font-arabic text-2xl leading-[2.2]">{d.arabic}</p>
              <p className="mt-2 text-sm text-muted-foreground">{d.translation}</p>
              <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Reference:</span> {d.reference}</p>
            </div>
          ))}
          {tab === "answers" && items.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{new Date(a.created_at).toLocaleString()}</p>
                <RemoveBtn onClick={() => remove("answers", a.id)} testid={`remove-answer-${a.id}`} />
              </div>
              <p className="mt-2 text-sm font-medium">{a.question}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const RemoveBtn = ({ onClick, testid, className = "" }) => (
  <button
    data-testid={testid}
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-destructive/10 hover:text-destructive ${className}`}
  >
    <Trash2 className="h-3 w-3" /> Remove
  </button>
);
