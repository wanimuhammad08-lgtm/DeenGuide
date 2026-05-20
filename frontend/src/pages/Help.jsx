import { useState } from "react";
import { ArrowLeft, ChevronDown, Mail, MessageCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const FAQS = [
  { q: "What is DeenGuide?", a: "DeenGuide is an AI-powered Islamic knowledge companion that provides answers from the Quran and authentic Hadith with full source citations. It includes tools like a Quran reader, Hadith search, Duas library, Tasbih counter, and more." },
  { q: "Are the AI answers reliable?", a: "DeenGuide's AI is grounded in authentic Quran and Hadith sources. Every answer includes references to specific Surahs, Ayahs, and Hadith collections with grading. However, for critical religious matters, always consult a qualified scholar." },
  { q: "Which Hadith collections are included?", a: "We include Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud, Jami at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah, Muwatta Imam Malik, Musnad Ahmad, and several other collections — over 47,000 hadiths in total." },
  { q: "Is my data stored or shared?", a: "No. All bookmarks and preferences are stored locally on your device. We do not collect, store, or share any personal information. Your AI questions are processed in real-time and not stored permanently." },
  { q: "Can I use DeenGuide offline?", a: "Most features like the Duas library, Tasbih counter, Zakat calculator, and guides work offline. The Quran reader, Hadith search, and AI answers require an internet connection." },
  { q: "What madhab does DeenGuide follow?", a: "DeenGuide presents mainstream Sunni orthodox positions. Where there is scholarly difference (ikhtilaf), we present the views of all four madhahib (Hanafi, Maliki, Shafi'i, Hanbali) and note the strongest evidence." },
  { q: "How accurate is the Qibla finder?", a: "The Qibla direction is calculated mathematically based on your GPS coordinates. On mobile devices with a compass, it provides real-time direction. On desktop, it shows the bearing angle." },
  { q: "Is the Hijri calendar accurate?", a: "The calendar uses an algorithmic approximation. Actual Hijri dates may vary by 1-2 days depending on moon sighting in your region. For exact dates, follow your local Islamic authority." },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Support</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Help & About</h1>
        </div>
      </div>

      {/* About card */}
      <div className="mb-8 rounded-3xl border border-border bg-card p-8 text-center">
        <img src="/favicon.png" alt="DeenGuide Logo" className="mx-auto h-16 w-16 rounded-2xl shadow-lg" />
        <h2 className="mt-4 font-heading text-2xl font-bold">DeenGuide</h2>
        <p className="mt-1 text-sm text-muted-foreground">An AI-powered Islamic knowledge companion</p>
        <p className="mt-1 text-xs text-muted-foreground">Version 1.0.0</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs text-primary font-semibold">Quran · Authentic Sunnah · AI Guidance</span>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="mb-4 font-heading text-lg font-bold">Frequently Asked Questions</h2>
      <div className="mb-8 space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <span className="text-sm font-semibold">{faq.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        ⚠️ <strong>Disclaimer:</strong> DeenGuide is a tool for learning and reference. It is not a substitute for consulting qualified Islamic scholars. Always verify important religious rulings with knowledgeable authorities.
      </div>
    </div>
  );
}
