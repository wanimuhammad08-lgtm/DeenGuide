import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Mic, MicOff, Loader2, BookOpen, ScrollText, Bookmark, BookmarkCheck, Volume2, VolumeX, Quote, Brain, Scale, FileSearch } from "lucide-react";
import { ai } from "@/lib/api";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { toast } from "sonner";

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

const sampleQuestions = [
  "How do I pray Tahajjud step by step?",
  "What does Islam say about kindness to parents?",
  "Is music haram in Islam?",
  "How can I cure anxiety with dua?",
  "What are the conditions of a valid prayer?",
];

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("deep");
  const [history, setHistory] = useState([]); // {q, a, error}
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const endRef = useRef(null);
  const { toggle, isBookmarked } = useBookmarks();
  const tts = useTTS();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const submit = async (q) => {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setQuestion("");
    setHistory((h) => [...h, { q: text }]);
    setLoading(true);
    try {
      const data = await ai.ask({ question: text, mode });
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = { q: text, a: data };
        return copy;
      });
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Something went wrong";
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = { q: text, error: msg };
        return copy;
      });
      toast.error("Failed to get an answer", { description: msg });
    } finally {
      setLoading(false);
    }
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Assistant</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Ask anything about Islam
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Answers are drawn from the Qur'an and authentic Hadith. Always verify with a knowledgeable scholar.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Depth:</span>
        {["simple", "deep"].map((m) => (
          <button
            key={m}
            data-testid={`ask-mode-${m}`}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
              mode === m
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Conversation */}
      {history.length === 0 && !loading && (
        <div className="mb-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-heading text-lg font-semibold">Try a question</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {sampleQuestions.map((s) => (
              <button
                key={s}
                data-testid={`sample-q-${s.slice(0, 10).replace(/\s/g, "-")}`}
                onClick={() => submit(s)}
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
              <div data-testid={`question-bubble-${i}`} className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-5 py-3 text-sm text-primary-foreground shadow-sm">
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
              data-testid="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask about prayer, fasting, marriage, character…"
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              data-testid="ask-voice-btn"
              onClick={listening ? stopVoice : startVoice}
              className={`grid h-11 w-11 place-items-center rounded-2xl transition-all active:scale-95 ${
                listening ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground hover:bg-accent/70"
              }`}
              aria-label="Voice"
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              data-testid="ask-submit-btn"
              onClick={() => submit()}
              disabled={!question.trim() || loading}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40"
              aria-label="Send"
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
    <div data-testid={`answer-card-${index}`} className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">DeenGuide</span>
        </div>
        <button
          data-testid={`save-answer-btn-${index}`}
          onClick={() => {
            toggle("answers", { id: data.id, question: data.question, answer: data.answer, created_at: data.created_at });
            toast.success(saved ? "Removed from saved" : "Saved to bookmarks");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {data.notice && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {data.notice}
        </div>
      )}

      {/* 📌 Answer */}
      <div className="mt-4">
        <SectionLabel icon={Quote} label="Answer" />
        <h3 className="mt-2 font-heading text-xl font-semibold leading-snug">{data.answer}</h3>
      </div>

      {data.quran_refs?.length > 0 && (
        <div className="mt-5 space-y-3">
          <SectionLabel icon={BookOpen} label="Qur'an Evidence" />
          {data.quran_refs.map((q, i) => (
            <div key={i} data-testid={`quran-ref-${i}`} className="rounded-xl border border-border/60 bg-muted/30 p-4 border-l-4 border-l-primary">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Surah {q.surah_name} ({q.surah}:{q.ayah})
              </div>
              <p dir="rtl" className="mt-3 text-right font-arabic text-2xl leading-[2.2] text-foreground">
                {q.arabic}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{q.translation}</p>
            </div>
          ))}
        </div>
      )}

      {data.hadith_refs?.length > 0 && (
        <div className="mt-5 space-y-3">
          <SectionLabel icon={ScrollText} label="Hadith Evidence" />
          {data.hadith_refs.map((h, i) => {
            const hid = `${index}-h-${i}`;
            const speaking = tts?.speaking && tts?.activeId === hid;
            return (
            <div key={i} data-testid={`hadith-ref-${i}`} className="rounded-xl border border-border/60 bg-muted/30 p-4 border-l-4 border-l-primary">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">{collectionLabels[h.collection] || h.collection}</span>
                <span className="text-muted-foreground">#{h.number}</span>
                {h.narrator && <span className="text-muted-foreground">· {h.narrator}</span>}
                <AuthenticityBadge level={h.authenticity} />
                {tts?.supported && (h.arabic || h.english) && (
                  <button
                    data-testid={`ai-hadith-tts-${index}-${i}`}
                    onClick={() => {
                      if (speaking) tts.stop();
                      else tts.speak(h.arabic || h.english, { lang: h.arabic ? "ar-SA" : "en-US", id: hid });
                    }}
                    className={`ml-auto grid h-7 w-7 place-items-center rounded-full border border-border bg-background hover:bg-accent ${speaking ? "text-primary border-primary" : ""}`}
                    aria-label="Listen"
                    title={speaking ? "Stop" : "Listen"}
                  >
                    {speaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </button>
                )}
              </div>
              {h.arabic && (
                <p dir="rtl" className="mt-3 text-right font-arabic text-xl leading-[2.2]">
                  {h.arabic}
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.english}</p>
            </div>
            );
          })}
        </div>
      )}

      {data.explanation && (
        <div className="mt-5">
          <SectionLabel icon={Brain} label="Explanation" />
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{data.explanation}</p>
        </div>
      )}

      {data.scholarly_notes && (
        <div className="mt-5 rounded-xl border border-border/60 bg-accent/30 p-4 border-l-4 border-l-amber-500/60">
          <SectionLabel icon={Scale} label="Scholarly Notes" />
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{data.scholarly_notes}</p>
        </div>
      )}

      {data.evidence_type && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs">
          <FileSearch className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-muted-foreground">Evidence type:</span>
          <span className="font-medium text-foreground">{data.evidence_type}</span>
        </div>
      )}

      {data.related_duas?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {data.related_duas.map((d, i) => (
            <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
              {d}
            </span>
          ))}
        </div>
      )}
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
