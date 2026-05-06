import { Link } from "react-router-dom";
import { Sparkles, BookOpen, ScrollText, Hand, ArrowRight, ShieldCheck } from "lucide-react";

const cards = [
  {
    to: "/ask",
    title: "Ask AI",
    desc: "Get answers from Qur'an & authentic Hadith with full citations.",
    icon: Sparkles,
    accent: "primary",
    testid: "home-card-ask",
  },
  {
    to: "/quran",
    title: "Quran Reader",
    desc: "All 114 Surahs with Arabic, translation, and audio recitation.",
    icon: BookOpen,
    accent: "muted",
    testid: "home-card-quran",
  },
  {
    to: "/hadith",
    title: "Hadith Search",
    desc: "Browse Bukhari, Muslim, Sunan, Muwatta & Musnad with grading.",
    icon: ScrollText,
    accent: "muted",
    testid: "home-card-hadith",
  },
  {
    to: "/duas",
    title: "Duas Library",
    desc: "Authentic supplications by category: daily, sleep, travel, more.",
    icon: Hand,
    accent: "muted",
    testid: "home-card-duas",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card pattern-geometric">
        <div className="px-6 py-14 sm:px-12 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <ShieldCheck className="h-3 w-3" /> Quran · Authentic Sunnah · AI guidance
          </span>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Trusted Islamic answers,
            <span className="block text-primary">always with references.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            DeenGuide combines the Qur'an and authentic Hadith with thoughtful AI to give you
            grounded, source-backed guidance — never guesses, never silence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/ask"
              data-testid="home-cta-ask"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:scale-95"
            >
              <Sparkles className="h-4 w-4" /> Ask a question
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/quran"
              data-testid="home-cta-quran"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-transparent px-6 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/5 active:scale-95"
            >
              <BookOpen className="h-4 w-4" /> Read the Qur'an
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 sm:max-w-md">
            <Stat label="Surahs" value="114" />
            <Stat label="Hadith" value="30k+" />
            <Stat label="Dua categories" value="10+" />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Cards */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Explore</p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need in one place
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              data-testid={c.testid}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div
                className={`mb-5 grid h-11 w-11 place-items-center rounded-xl ${
                  c.accent === "primary"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                <c.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <h3 className="font-heading text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="rounded-3xl border border-border bg-accent/40 p-8 sm:p-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Authenticity layer</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Every answer carries its sources.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We never fabricate verses or hadith. AI answers cite Surah + Ayah and Hadith collection +
              number, with grading badges (Sahih, Hasan, Da'if). When no direct evidence exists, we say so —
              and offer the closest sound guidance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Pill label="Sahih" tone="sahih" />
            <Pill label="Hasan" tone="hasan" />
            <Pill label="Da'if" tone="daif" />
          </div>
        </div>
      </section>
    </div>
  );
}

const Stat = ({ value, label }) => (
  <div className="rounded-2xl border border-border bg-background/60 p-4">
    <div className="font-heading text-2xl font-bold text-primary">{value}</div>
    <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
  </div>
);

const Pill = ({ label, tone }) => {
  const styles = {
    sahih: "bg-[hsl(var(--sahih-bg))] text-[hsl(var(--sahih-text))]",
    hasan: "bg-[hsl(var(--hasan-bg))] text-[hsl(var(--hasan-text))]",
    daif: "bg-[hsl(var(--daif-bg))] text-[hsl(var(--daif-text))]",
  };
  return (
    <div
      className={`flex items-center justify-center rounded-2xl py-6 text-base font-semibold ${styles[tone]}`}
    >
      {label}
    </div>
  );
};
