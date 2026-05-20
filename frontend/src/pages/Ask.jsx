import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Send, Mic, MicOff, Loader2, BookOpen, ScrollText, Bookmark, BookmarkCheck, Volume2, VolumeX, Quote, Brain, Scale, FileSearch, ArrowLeft, Trash2 } from "lucide-react";
import { ai } from "@/lib/api";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { useAI } from "@/context/AIContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const collectionLabels = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abu Dawood",
  abudawood: "Sunan Abu Dawood",
  tirmidhi: "Jami` at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Imam Malik",
  muwatta: "Muwatta Imam Malik",
  ahmad: "Musnad Ahmad",
};

// Normalize AI-returned collection names to API slugs
const collectionToSlug = {
  "sahih al-bukhari": "bukhari",
  "bukhari": "bukhari",
  "sahih muslim": "muslim",
  "muslim": "muslim",
  "sunan abu dawood": "abudawud",
  "sunan abu dawud": "abudawud",
  "abudawud": "abudawud",
  "abudawood": "abudawud",
  "jami` at-tirmidhi": "tirmidhi",
  "jami at-tirmidhi": "tirmidhi",
  "tirmidhi": "tirmidhi",
  "sunan an-nasa'i": "nasai",
  "sunan nasai": "nasai",
  "nasai": "nasai",
  "sunan ibn majah": "ibnmajah",
  "ibn majah": "ibnmajah",
  "ibnmajah": "ibnmajah",
  "muwatta imam malik": "malik",
  "muwatta malik": "malik",
  "malik": "malik",
  "muwatta": "malik",
};

const normalizeCollection = (c) => collectionToSlug[(c || "").toLowerCase()] || c;

const sampleQuestions = [
  "How do I pray Tahajjud step by step?",
  "What does Islam say about kindness to parents?",
  "Is music haram in Islam?",
  "How can I cure anxiety with dua?",
  "What are the conditions of a valid prayer?",
];

export default function Ask() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const { history, loading, ask, clearHistory } = useAI();
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const endRef = useRef(null);
  const { toggle, isBookmarked } = useBookmarks();
  const tts = useTTS();

  useEffect(() => {
    if (history.length === 0 && !loading) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const handleSubmit = async (q) => {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setQuestion("");
    ask(text);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      setQuestion((prev) => (prev ? prev + " " + transcript : transcript));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  };

  const stopVoice = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      <div className="relative mb-6 flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card mt-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Assistant</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ask anything about Islam
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Answers are drawn from the Qur'an and authentic Hadith. Always verify with a knowledgeable scholar.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => { clearHistory(); toast.success("Chat cleared"); }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card mt-1 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Conversation */}
      {history.length === 0 && !loading && (
        <div className="mb-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-heading text-lg font-semibold">Try a question</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {sampleQuestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {history.map((entry, i) => (
          <div key={i} className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm">
                {entry.q}
              </div>
            </div>
            {entry.error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {entry.error}
              </div>
            )}
            {entry.a && <AnswerCard data={entry.a} index={i} toggle={toggle} isBookmarked={isBookmarked} tts={tts} />}
          </div>
        ))}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Consulting Qur'an, Hadith, and authentic sources…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-16 z-30 mt-8 sm:bottom-4">
        <div className="rounded-3xl border border-border bg-card p-2 shadow-lg">
          <div className="flex items-end gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              placeholder="Ask about prayer, fasting, marriage, character…"
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={listening ? stopVoice : startVoice}
              className={`grid h-11 w-11 place-items-center rounded-2xl transition-all active:scale-95 ${
                listening ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={!question.trim() || loading}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const AnswerCard = ({ data, index, toggle, isBookmarked, tts }) => {
  const saved = isBookmarked("answers", data.id);
  return (
    <div data-testid={`answer-card-${index}`} className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-accent/10">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="Logo" className="h-7 w-7" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DeenGuide AI</span>
        </div>
        <button
          data-testid={`save-answer-btn-${index}`}
          onClick={() => {
            toggle("answers", { id: data.id, question: data.question, answer: data.detailed_answer || data.answer, created_at: data.created_at });
            toast.success(saved ? "Removed from saved" : "Saved to bookmarks");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Main Narrative Answer (Intro) */}
        <div className="prose prose-sm max-w-none text-foreground/90
          prose-p:leading-relaxed prose-p:mb-4 
          prose-headings:font-bold prose-headings:text-foreground prose-headings:mb-3 prose-headings:mt-6
          prose-h2:text-lg prose-h3:text-base
          prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-4 prose-ul:space-y-1.5
          prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-4 prose-ol:space-y-1.5
          prose-strong:text-primary prose-strong:font-bold"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.detailed_answer ? data.detailed_answer : data.answer}
          </ReactMarkdown>
        </div>

        {/* Fallback for legacy 'explanation' if any */}
        {data.explanation && !data.detailed_answer && (
          <div className="text-[15px] leading-[1.8] text-foreground/80 whitespace-pre-wrap">
            {data.explanation}
          </div>
        )}

        {/* Quran Evidence */}
        {data.quran_refs?.length > 0 && (
          <div className="space-y-2.5 pt-4 border-t border-border/40">
            <SectionLabel icon={BookOpen} label="Qur'an Evidence" />
            {data.quran_refs.map((q, i) => {
              const isLong = (q.arabic || "").length > 80;
              const arabicPreview = isLong ? q.arabic.slice(0, 70) + "..." : q.arabic;
              const isTransLong = (q.translation || "").length > 120;
              const transPreview = isTransLong ? q.translation.slice(0, 110).replace(/\s+\S*$/, "") + "..." : q.translation;
              return (
                <Link key={i} to={`/quran/${q.surah}#ayah=${q.ayah}`} className="block rounded-xl border border-border/50 bg-muted/10 p-3.5 transition-all hover:border-primary/30 hover:bg-accent/5" style={{ textDecoration: "none" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      Surah {q.surah_name} {q.surah}:{q.ayah}
                    </span>
                    <span className="text-[10px] font-semibold text-primary">
                      Read in App ↗
                    </span>
                  </div>
                  {q.arabic && (
                    <p dir="rtl" className="text-right font-arabic text-lg leading-[2] text-foreground/85 mb-2">{arabicPreview}</p>
                  )}
                  <p className="text-[13px] leading-relaxed text-muted-foreground italic">"{transPreview}"</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Hadith Evidence */}
        {data.hadith_refs?.length > 0 && (
          <div className="space-y-2.5 pt-4 border-t border-border/40">
            <SectionLabel icon={ScrollText} label="Hadith Evidence" />
            {data.hadith_refs.map((h, i) => {
              const collName = h.collection_name || collectionLabels[h.collection] || h.collection;
              const isLong = (h.english || "").length > 150;
              const englishPreview = isLong ? h.english.slice(0, 140).replace(/\s+\S*$/, "") + "..." : h.english;
              const slug = normalizeCollection(h.collection);
              const displayNum = h.standard_number || h.number;
              return (
                <Link key={i} to={`/hadith?book=${slug}&number=${h.number}`} className="block rounded-xl border border-border/50 bg-muted/10 p-3.5 transition-all hover:border-primary/30 hover:bg-accent/5" style={{ textDecoration: "none" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-foreground">{collName} {displayNum}</span>
                      {h.narrator && <span className="text-[11px] text-muted-foreground">· {h.narrator}</span>}
                      <AuthenticityBadge level={h.authenticity} />
                    </div>
                    <span className="text-[10px] font-semibold text-primary shrink-0">
                      Read Full ↗
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{englishPreview}</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Scholarly Insight / Fiqh Note */}
        {data.scholarly_notes && (
          <div className="space-y-3 pt-4 border-t border-border/40">
            <SectionLabel icon={Scale} label="Scholarly Insight" />
            <div className="rounded-xl border border-border/60 bg-primary/5 p-4 border-l-4 border-l-primary/50">
              <p className="text-[14px] leading-[1.7] text-foreground/90 italic">
                {data.scholarly_notes}
              </p>
            </div>
          </div>
        )}

        {/* Conclusion */}
        {data.conclusion && (
          <div className="pt-2 text-[15px] leading-[1.8] font-medium text-foreground/90 animate-in fade-in slide-in-from-bottom-1 duration-300">
            {data.conclusion}
          </div>
        )}
      </div>
    </div>
  );
};


const SectionLabel = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {label}
  </div>
);

const Section = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {label}
  </div>
);
