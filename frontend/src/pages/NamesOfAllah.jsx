import { useState } from "react";
import { ArrowLeft, Search, X, BookOpen, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NAMES_DETAILS from "@/lib/namesData";

export default function NamesOfAllah() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = NAMES_DETAILS.filter(
    (n) =>
      n.en.toLowerCase().includes(search.toLowerCase()) ||
      n.tr.toLowerCase().includes(search.toLowerCase()) ||
      n.ar.includes(search)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Al-Asma ul-Husna</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">99 Names of Allah</h1>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or meaning..."
          className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((n) => (
          <button
            key={n.num}
            onClick={() => setSelected(n)}
            className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {n.num}
              </span>
              <p dir="rtl" className="font-arabic text-2xl text-primary leading-relaxed">{n.ar}</p>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="font-heading text-sm font-semibold">{n.tr}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.en}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No names match your search.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {selected.num}
              </span>
              <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p dir="rtl" className="font-arabic text-4xl text-primary text-center leading-loose mb-2">{selected.ar}</p>
            <h2 className="font-heading text-xl font-bold text-center">{selected.tr}</h2>
            <p className="text-center text-sm text-muted-foreground mb-4">{selected.en}</p>

            {selected.desc && (
              <div className="rounded-xl bg-muted/50 p-4 mb-4">
                <p className="text-sm leading-relaxed">{selected.desc}</p>
              </div>
            )}

            {selected.quran && selected.quran.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  <BookOpen className="h-3.5 w-3.5" /> Mentions in the Quran
                </h3>
                <div className="space-y-2">
                  {selected.quran.map((q, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-medium text-primary mb-1">{q.ref}</p>
                      <p className="text-sm leading-relaxed">{q.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.hadith && selected.hadith.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  📖 From the Hadith
                </h3>
                <div className="space-y-2">
                  {selected.hadith.map((h, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-medium text-primary mb-1">{h.ref}</p>
                      <p className="text-sm leading-relaxed">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
