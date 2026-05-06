import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Bookmark, BookmarkCheck, Copy, Share2, Sun, Moon, Plane, Heart, Wind, Sprout, Hand, Users, Sparkles, MapPin, Trash2, Droplets, User, Home, Shirt, Utensils, Scale, Star, Shield, Cloud, Clock, Banknote, Book, Trees, Handshake, Compass } from "lucide-react";
import { duas } from "@/lib/api";
import { useBookmarks } from "@/lib/bookmarks";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { toast } from "sonner";

const iconMap = { 
  Sun, Moon, Plane, Heart, Wind, Sprout, Hand, Users, Sparkles, MapPin, 
  Trash: Trash2, Droplet: Droplets, User, Home, Shirt, Utensils, Scale, 
  Star, Shield, Cloud, Clock, Banknote, Book, Tree: Trees, Handshake, Compass 
};

export default function Duas() {
  const [categories, setCategories] = useState([]);
  const [allDuas, setAllDuas] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toggle, isBookmarked } = useBookmarks();

  useEffect(() => {
    Promise.all([duas.categories(), duas.list()])
      .then(([c, d]) => {
        setCategories(c);
        setAllDuas(d);
        setOpen(null); // Keep all categories closed by default
      })
      .finally(() => setLoading(false));
  }, []);

  const copyDua = (d) => {
    const text = `${d.title}\n\n${d.arabic}\n\n${d.transliteration}\n\n${d.translation}\n\nReference: ${d.reference}`;
    navigator.clipboard?.writeText(text);
    toast.success("Dua copied");
  };

  const shareDua = async (d) => {
    const text = `${d.title}\n${d.translation}\n— ${d.reference}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: d.title, text });
      } catch {}
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duas Library</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Supplications</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Authentic duas from the Qur'an and Sunnah, organized by life situations.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(
            categories.reduce((acc, cat) => {
              const g = cat.group || "Other";
              if (!acc[g]) acc[g] = [];
              acc[g].push(cat);
              return acc;
            }, {})
          ).map(([groupName, groupCategories]) => (
            <div key={groupName} className="space-y-4">
              <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">{groupName}</h2>
              <div className="space-y-3">
                {groupCategories.map((cat) => {
                  const items = allDuas.filter((d) => d.category === cat.slug);
                  const Icon = iconMap[cat.icon] || Sparkles;
                  const isOpen = open === cat.slug;
                  return (
                    <div
                      key={cat.slug}
                      data-testid={`dua-category-${cat.slug}`}
                      className={`overflow-hidden rounded-2xl border bg-card transition-all ${isOpen ? "border-primary/40" : "border-border"}`}
                    >
                      <button
                        data-testid={`dua-cat-trigger-${cat.slug}`}
                        onClick={() => setOpen(isOpen ? null : cat.slug)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <div className="flex-1">
                          <h3 className="font-heading text-base font-semibold">{cat.name}</h3>
                          <p className="text-xs text-muted-foreground">{items.length} dua{items.length !== 1 && "s"} {cat.description ? `· ${cat.description}` : ""}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="space-y-3 border-t border-border bg-muted/30 p-4 sm:p-5">
                          {items.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-4">No duas currently available in this category.</p>
                          ) : (
                            items.map((d) => {
                              const saved = isBookmarked("duas", d.id);
                              return (
                                <div key={d.id} data-testid={`dua-${d.id}`} className="rounded-xl border border-border bg-card p-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <h4 className="font-heading text-base font-semibold">{d.title}</h4>
                                    <AuthenticityBadge level={d.authenticity} />
                                  </div>
                                  <p dir="rtl" className="mt-4 text-right font-arabic text-2xl leading-[2.2] text-foreground">
                                    {d.arabic}
                                  </p>
                                  <p className="mt-2 text-xs italic text-muted-foreground">{d.transliteration}</p>
                                  <p className="mt-2 text-sm leading-relaxed text-foreground">{d.translation}</p>
                                  {d.meaning && (
                                    <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold">Meaning:</span> {d.meaning}</p>
                                  )}
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                                    <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Reference:</span> {d.reference}</span>
                                    <div className="flex items-center gap-1.5">
                                      <button data-testid={`copy-dua-${d.id}`} onClick={() => copyDua(d)} className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background hover:bg-accent" aria-label="Copy">
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                      <button data-testid={`share-dua-${d.id}`} onClick={() => shareDua(d)} className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background hover:bg-accent" aria-label="Share">
                                        <Share2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        data-testid={`bookmark-dua-${d.id}`}
                                        onClick={() => {
                                          toggle("duas", d);
                                          toast.success(saved ? "Removed bookmark" : "Dua saved");
                                        }}
                                        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background hover:bg-accent"
                                        aria-label="Bookmark"
                                      >
                                        {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
