import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, Play, Pause, Bookmark, BookmarkCheck,
  Languages, Mic2, Sparkles, ChevronDown, ChevronRight, BookText, Volume2, MessageSquareText,
  Music, Settings, Share2, Copy, MoreHorizontal, List, FileText, PlayCircle, Info, X, Search,
  Rewind, FastForward, Download, RefreshCw, Zap, User, GraduationCap, Lightbulb
} from "lucide-react";
import { quran } from "@/lib/api";
import { qurancom } from "@/lib/qurancom";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const RECITER_KEY = "deenguide:v4-reciter";
const TRANSLATION_KEY = "deenguide:v4-translation";
const TAFSIR_KEY = "deenguide:tafsir-edition";
const AUDIO_MIX_KEY = "deenguide:audio-mix"; // {recite,translate,tafsir}

// BCP-47 hints for SpeechSynthesis per API language_code
const LANG_TO_BCP47 = {
  en: "en-US", ar: "ar-SA", ur: "ur-PK", id: "id-ID", bn: "bn-BD",
  tr: "tr-TR", fr: "fr-FR", ru: "ru-RU", es: "es-ES", ku: "ckb",
};

const DEFAULT_MIX = { recite: true, translate: false, tafsir: false };

export default function SurahReader() {
  const { number } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [viewMode, setViewMode] = useState("verse"); // 'verse' or 'reading'
  const [sidebarTab, setSidebarTab] = useState("surah"); // 'surah', 'verse', 'juz', 'page'
  const [juzsList, setJuzsList] = useState([]);
  const [navSurah, setNavSurah] = useState(null); // selected surah in sidebar for navigation
  const [openMoreMenu, setOpenMoreMenu] = useState(null); // ayah number with open ... menu
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTajweedLegend, setShowTajweedLegend] = useState(false);
  const [settingsTab, setSettingsTab] = useState("wbw");
  const [surahsList, setSurahsList] = useState([]);
  const [isTranslationSelectorOpen, setIsTranslationSelectorOpen] = useState(false);
  const [translationSearch, setTranslationSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('deenguide:font-size') || '3', 10));
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [readingView, setReadingView] = useState("arabic"); // "arabic" or "translation"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 250);
      
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [reciters, setReciters] = useState([]);
  const [editions, setEditions] = useState([]);
  const [tafsirEditions, setTafsirEditions] = useState([]);

  const [reciter, setReciter] = useState(() => parseInt(localStorage.getItem(RECITER_KEY) || "7", 10));
  const [translationEditions, setTranslationEditions] = useState(() => {
    try { 
      const val = JSON.parse(localStorage.getItem(TRANSLATION_KEY));
      if (Array.isArray(val)) return val;
      if (typeof val === 'number' || typeof val === 'string') return [parseInt(val, 10)];
      return [131];
    }
    catch { return [131]; }
  });
  const [tafsirEdition, setTafsirEdition] = useState(() => localStorage.getItem(TAFSIR_KEY) || "en-tafisr-ibn-kathir");

  const [wbwSettings, setWbwSettings] = useState(() => {
    try {
      return { ...{ translation: true, transliteration: false }, ...JSON.parse(localStorage.getItem('deenguide:wbw') || '{}') };
    } catch {
      return { translation: true, transliteration: false };
    }
  });

  const [arabicScript, setArabicScript] = useState(() => localStorage.getItem('deenguide:script') || "tajweed");


  const toggleWbw = (key) => {
    const next = { ...wbwSettings, [key]: !wbwSettings[key] };
    setWbwSettings(next);
    localStorage.setItem('deenguide:wbw', JSON.stringify(next));
  };

  const [audioMix, setAudioMix] = useState(() => {
    try {
      return { ...DEFAULT_MIX, ...JSON.parse(localStorage.getItem(AUDIO_MIX_KEY) || "{}") };
    } catch {
      return DEFAULT_MIX;
    }
  });

  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const audioRef = useRef(null);
  const bismillahPlayedRef = useRef(false);
  const mixRef = useRef(audioMix); // for closures in playback chain
  
  // Surah Info Modal
  const [isSurahInfoOpen, setIsSurahInfoOpen] = useState(false);
  const [surahInfoData, setSurahInfoData] = useState(null);
  const [loadingSurahInfo, setLoadingSurahInfo] = useState(false);
  
  // Translation Dropdown
  const [isTranslationDropdownOpen, setIsTranslationDropdownOpen] = useState(false);

  // Audio Player State
  const [audioProgress, setAudioProgress] = useState({ currentTime: 0, duration: 0 });
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);

  useEffect(() => {
    mixRef.current = audioMix;
  }, [audioMix]);

  // tafsir per ayah: { [ayahNumber]: { open: bool, text: string, loading: bool } }
  const [tafsir, setTafsir] = useState({});

  const { toggle, isBookmarked } = useBookmarks();
  const tts = useTTS();

  // initial static lists
  useEffect(() => {
    qurancom.reciters().then(setReciters).catch(() => {});
    qurancom.translations().then(setEditions).catch(() => {});
    quran.tafsirs().then((d) => setTafsirEditions(d.tafsirs || [])).catch(() => {});
    qurancom.chapters().then(setSurahsList).catch(() => {});
    qurancom.juzs().then(list => {
    // deduplicate by juz_number
    const seen = new Set();
    const unique = list.filter(j => {
      if (seen.has(j.juz_number)) return false;
      seen.add(j.juz_number);
      return true;
    });
    setJuzsList(unique);
  }).catch(() => {});
  }, []);

  // Handle URL hash for auto-scrolling to Ayah
  useEffect(() => {
    if (data && location.hash) {
      const match = location.hash.match(/#ayah=(\d+)/);
      if (match) {
        const ayahNum = match[1];
        setTimeout(() => {
          const el = document.querySelector(`[data-ayah-row="${ayahNum}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add('bg-primary/10', 'transition-colors', 'duration-1000');
            setTimeout(() => el.classList.remove('bg-primary/10'), 2000);
          }
        }, 150); // slight delay to ensure DOM is fully rendered
      }
    }
  }, [data, location.hash]);

  // load surah when number / reciter / translation edition changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    stopPlayback();
    setTafsir({});
    bismillahPlayedRef.current = false;
    Promise.all([
      qurancom.chapter(number),
      qurancom.verses(number, translationEditions, reciter)
    ])
      .then(([chapter, verses]) => {
        const adapted = {
          number: chapter.number,
          name: chapter.name,
          englishName: chapter.englishName,
          englishNameTranslation: chapter.englishNameTranslation,
          bismillah_pre: chapter.bismillah_pre,
          ayahs: verses.map(v => ({
            id: v.id,
            number: v.verse_number,
            verse_key: v.verse_key,
            page: v.v1_page,
            arabic: v.text_uthmani,
            tajweed: v.text_uthmani_tajweed,
            indopak: v.text_indopak,
            translations: v.translations?.map(t => ({ id: t.resource_id, text: t.text?.replace(/<[^>]+>/g, '') })) || [], // Multi-translation array
            audio: v.audio?.url ? (
              v.audio.url.startsWith('http') ? v.audio.url :
              v.audio.url.startsWith('//') ? `https:${v.audio.url}` :
              `https://verses.quran.com/${v.audio.url}`
            ) : null,
            words: v.words.map(w => ({
              id: w.id,
              position: w.position,
              arabic: w.text_uthmani,
              tajweed: w.text_uthmani_tajweed || w.text_uthmani,
              translation: w.translation?.text,
              transliteration: w.transliteration?.text,
              audio: w.audio_url ? (
                w.audio_url.startsWith('http') ? w.audio_url :
                w.audio_url.startsWith('//') ? `https:${w.audio_url}` :
                `https://audio.qurancdn.com/${w.audio_url}`
              ) : null,
              char_type_name: w.char_type_name
            }))
          }))
        };
        setData(adapted);
        // Save Last Seen
        try {
          localStorage.setItem("deenguide:last-seen-surah", JSON.stringify({
            number: adapted.number,
            englishName: adapted.englishName,
            ayah: 1,
          }));
          window.dispatchEvent(new Event("storage"));
        } catch (err) {
          // ignore
        }
      })
      .catch((e) => setError(e?.response?.data?.detail || e.message || "Failed to load Surah"))
      .finally(() => setLoading(false));
      
    // Clear info cache when changing surah
    setSurahInfoData(null);
    return () => stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, reciter, translationEditions.join(',')]);

  // derive language bcp47 for TTS based on edition metadata
  const translationLang = useMemo(() => {
    const e = editions.find((x) => x.id === translationEditions[0]);
    return LANG_TO_BCP47[e?.language_code] || "en-US";
  }, [editions, translationEditions]);

  const tafsirLang = useMemo(() => {
    const e = tafsirEditions.find((x) => x.id === tafsirEdition);
    return LANG_TO_BCP47[e?.language_code] || "en-US";
  }, [tafsirEditions, tafsirEdition]);

  const tafsirLangs = useMemo(() => {
    return [...new Set(tafsirEditions.map(t => t.language).filter(Boolean))];
  }, [tafsirEditions]);

  const activeTafsirLang = useMemo(() => {
    return tafsirEditions.find(t => (t.id || t.slug) === tafsirEdition)?.language || 'English';
  }, [tafsirEditions, tafsirEdition]);

  // ── playback chain ────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    tts.stop();
    setPlaying(false);
    setCurrentIdx(-1);
  }, [tts]);

  const speakAsync = useCallback((text, lang) =>
    new Promise((resolve) => {
      if (!text || !text.trim() || !tts.supported) {
        resolve();
        return;
      }
      const w = window.speechSynthesis;
      w.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.92;
      const voices = w.getVoices();
      const match = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
      if (match) u.voice = match;
      u.onend = resolve;
      u.onerror = resolve;
      w.speak(u);
    }), [tts.supported]);

  const playAudioAsync = useCallback((url) =>
    new Promise((resolve) => {
      if (!url) return resolve(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const a = new Audio(url);
      a.onended = () => resolve(true);
      a.onerror = () => resolve(false);
      
      a.addEventListener("timeupdate", () => {
        setAudioProgress({ currentTime: a.currentTime, duration: a.duration });
      });
      a.addEventListener("loadedmetadata", () => {
        setAudioProgress({ currentTime: 0, duration: a.duration });
      });

      a.play().catch(() => resolve(false));
      audioRef.current = a;
    }), []);

  const translationAudioUrl = useCallback((surahNum, ayahNum) => {
    const e = editions.find((x) => x.id === translationEditions[0]);
    if (!e?.audio_base) return null;
    const s = String(surahNum).padStart(3, "0");
    const a = String(ayahNum).padStart(3, "0");
    return `${e.audio_base}/${s}${a}.mp3`;
  }, [editions, translationEditions]);

  const fetchAyahTafsir = useCallback(async (ayahNum) => {
    try {
      const res = await quran.tafsir(parseInt(number, 10), ayahNum, tafsirEdition);
      return res?.text || "";
    } catch {
      return "";
    }
  }, [number, tafsirEdition]);

  const toggleTafsir = useCallback(async (ayahNum) => {
    const current = tafsir[ayahNum] || { open: false, loading: false, text: "" };
    if (current.open) {
      setTafsir(prev => ({ ...prev, [ayahNum]: { ...current, open: false } }));
      return;
    }
    
    if (current.text) {
      setTafsir(prev => ({ ...prev, [ayahNum]: { ...current, open: true } }));
      return;
    }
    
    setTafsir(prev => ({ ...prev, [ayahNum]: { open: true, loading: true, text: "" } }));
    const text = await fetchAyahTafsir(ayahNum);
    setTafsir(prev => ({ ...prev, [ayahNum]: { open: true, loading: false, text } }));
  }, [tafsir, fetchAyahTafsir]);

  const playFromIndex = useCallback((idx) => {
    if (!data || idx < 0 || idx >= data.ayahs.length) {
      stopPlayback();
      return;
    }
    const ayah = data.ayahs[idx];
    setCurrentIdx(idx);
    setPlaying(true);
    setIsAudioPlayerVisible(true);
    const el = document.querySelector(`[data-ayah-row="${ayah.number}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const continueChain = async () => {
      const mix = mixRef.current;
      if (mix.translate && ayah.translations?.length > 0) {
        const text = ayah.translations[0].text;
        const url = translationAudioUrl(data.number, ayah.number);
        let played = false;
        if (url) played = await playAudioAsync(url);
        if (!played) await speakAsync(text, translationLang);
      }
      if (mix.tafsir) {
        const existing = tafsir[ayah.number]?.text;
        const text = existing || (await fetchAyahTafsir(ayah.number));
        if (text) {
          setTafsir((t) => ({ ...t, [ayah.number]: { open: true, loading: false, text } }));
          await speakAsync(text, tafsirLang);
        }
      }
      playFromIndex(idx + 1);
    };

    const playArabicThenChain = async () => {
      try {
        const currentReciter = reciters.find((r) => r.id === (localStorage.getItem(RECITER_KEY) || "ar.alafasy"));
        localStorage.setItem("deenguide:last-audio", JSON.stringify({
          surah: data.number,
          surah_name: data.englishName,
          reciter_name: currentReciter ? currentReciter.name : "Reciter",
        }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}

      if (idx === 0 && mixRef.current.recite && data.bismillah_audio && !bismillahPlayedRef.current) {
        bismillahPlayedRef.current = true;
        await playAudioAsync(data.bismillah_audio);
      }
      if (mixRef.current.recite && ayah.audio) {
        const ok = await playAudioAsync(ayah.audio);
        if (!ok) toast.error("Recitation audio failed");
      }
      await continueChain();
    };
    playArabicThenChain();
  }, [data, stopPlayback, speakAsync, playAudioAsync, translationAudioUrl, translationLang, tafsirLang, tafsir, fetchAyahTafsir, reciters]);

  const togglePlayAll = () => {
    if (playing) stopPlayback();
    else {
      if (!audioMix.recite && !audioMix.translate && !audioMix.tafsir) {
        toast.error("Enable at least one audio option (Recite / Translate / Tafsir)");
        return;
      }
      bismillahPlayedRef.current = false;
      playFromIndex(0);
    }
  };

  const playSingle = (idx) => {
    if (currentIdx === idx && playing) stopPlayback();
    else {
      bismillahPlayedRef.current = true;
      playFromIndex(idx);
    }
  };

  const handleReciterChange = (val) => {
    setReciter(val);
    localStorage.setItem(RECITER_KEY, val);
  };
  const handleTranslationChange = (val) => {
    setTranslationEdition(val);
    localStorage.setItem(TRANSLATION_KEY, val);
  };

  const num = parseInt(number, 10);
  const selectedTranslation = editions.find((e) => e.id === translationEditions[0]);
  
  // Minimal juz mapping approximation for UI display
  const getJuzNum = (surahNum) => {
    if (surahNum <= 2) return 1;
    if (surahNum <= 4) return 3;
    if (surahNum <= 6) return 6;
    if (surahNum <= 10) return 9;
    return Math.min(30, Math.ceil(surahNum / 4) + 1);
  };

  const ayahsByPage = useMemo(() => {
    if (!data?.ayahs) return {};
    const groups = {};
    data.ayahs.forEach((a) => {
      const p = a.page || 1;
      if (!groups[p]) groups[p] = [];
      groups[p].push(a);
    });
    return groups;
  }, [data]);

  const editionsByLanguage = useMemo(() => {
    const filtered = editions.filter(e => (e.author_name || e.name || "").toLowerCase().includes(translationSearch.toLowerCase()) || (e.language_name || "").toLowerCase().includes(translationSearch.toLowerCase()));
    return groupBy(filtered, 'language_name');
  }, [editions, translationSearch]);

  const openSurahInfo = async () => {
    setIsSurahInfoOpen(true);
    if (!surahInfoData && !loadingSurahInfo) {
      setLoadingSurahInfo(true);
      try {
        const info = await qurancom.chapterInfo(number);
        setSurahInfoData(info);
      } catch (e) {
        toast.error("Failed to load Surah Info");
      } finally {
        setLoadingSurahInfo(false);
      }
    }
  };

  const getArabicFontSize = () => `${36 + (fontSize - 3) * 6}px`;
  const getTranslationFontSize = () => `${19 + (fontSize - 3) * 2}px`;

  return (
    <>
      {/* Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-[320px] max-w-[85vw] h-full bg-card border-r border-border shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <Link to="/quran" className="flex items-center gap-2 font-bold text-foreground hover:text-[#178b50]">
                <ArrowLeft className="h-4 w-4" /> All Surahs
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-4 pt-3 pb-0 border-b border-border/40">
              <div className="flex gap-4 text-[14px] font-semibold mb-0">
                <button onClick={() => setSidebarTab('surah')} className={`pb-3 border-b-2 transition-all ${sidebarTab === 'surah' || sidebarTab === 'verse' ? 'border-[#178b50] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Surah</button>
                <button onClick={() => setSidebarTab('verse')} className={`pb-3 border-b-2 transition-all ${sidebarTab === 'verse' ? 'border-[#178b50] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Verse</button>
                <button onClick={() => setSidebarTab('juz')} className={`pb-3 border-b-2 transition-all ${sidebarTab === 'juz' ? 'border-[#178b50] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Juz</button>
                <button onClick={() => setSidebarTab('page')} className={`pb-3 border-b-2 transition-all ${sidebarTab === 'page' ? 'border-[#178b50] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Page</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-thin">
              {/* ── SURAH TAB: full-width surah list ── */}
              {sidebarTab === 'surah' && (
                <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
                  <div className="p-3 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search Surah"
                        className="w-full bg-accent/20 border border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#178b50]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {surahsList
                      .filter(s => s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || String(s.number).includes(searchQuery))
                      .map((s) => (
                        <Link
                          key={s.number}
                          to={`/quran/${s.number}`}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                            s.number === num
                              ? 'bg-[#178b50]/10 text-foreground border-l-2 border-[#178b50]'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                          }`}
                        >
                          <span className={`w-6 text-xs shrink-0 ${s.number === num ? 'text-[#178b50] font-bold' : ''}`}>{s.number}</span>
                          <span className="truncate">{s.englishName}</span>
                        </Link>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* ── VERSE TAB: full-width number grid for current surah ── */}
              {sidebarTab === 'verse' && (() => {
                const activeSurah = navSurah ?? surahsList.find(s => s.number === num);
                const count = activeSurah?.number === num ? (data?.ayahs?.length ?? 0) : (activeSurah?.numberOfAyahs ?? 0);
                return (
                  <div className="p-4">
                    {activeSurah && (
                      <p className="text-[12px] font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                        {activeSurah.englishName} · {count} verses
                      </p>
                    )}
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          onClick={() => {
                            if (!activeSurah || activeSurah.number === num) {
                              setIsSidebarOpen(false);
                              setTimeout(() => {
                                const el = document.querySelector(`[data-ayah-row="${v}"]`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('bg-primary/10');
                                  setTimeout(() => el.classList.remove('bg-primary/10'), 2000);
                                }
                              }, 100);
                            } else {
                              setIsSidebarOpen(false);
                              navigate(`/quran/${activeSurah.number}#ayah=${v}`);
                            }
                          }}
                          className="aspect-square flex items-center justify-center rounded-lg border border-border/50 bg-accent/20 text-[13px] font-medium text-foreground hover:bg-[#178b50]/15 hover:border-[#178b50]/50 hover:text-[#178b50] transition-all"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}



              {sidebarTab === 'juz' && (
                <div className="p-4">
                  {juzsList
                    .filter(j => String(j.juz_number).includes(searchQuery))
                    .map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          setIsSidebarOpen(false);
                          const firstSurah = Object.keys(j.verse_mapping)[0];
                          const firstAyah = j.verse_mapping[firstSurah].split('-')[0];
                          if (parseInt(firstSurah) === num) {
                            const el = document.querySelector(`[data-ayah-row="${firstAyah}"]`);
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              el.classList.add('bg-primary/10');
                              setTimeout(() => el.classList.remove('bg-primary/10'), 2000);
                            }
                          } else {
                            navigate(`/quran/${firstSurah}#ayah=${firstAyah}`);
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors mb-1"
                      >
                        <span className="font-bold text-foreground">Juz {j.juz_number}</span>
                        <span className="text-xs">Verses: {j.verses_count}</span>
                      </button>
                    ))
                  }
                </div>
              )}

              {sidebarTab === 'page' && (
                <div className="p-4 grid grid-cols-4 gap-2">
                  {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={async () => {
                        const tid = toast.loading(`Loading Page ${p}...`);
                        try {
                          const verse = await qurancom.pageStart(p);
                          setIsSidebarOpen(false);
                          toast.dismiss(tid);
                          if (!verse || !verse.verse_key) return;
                          const [s, a] = verse.verse_key.split(':');
                          if (parseInt(s) === num) {
                            const el = document.querySelector(`[data-ayah-row="${a}"]`);
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              el.classList.add('bg-primary/10', 'transition-colors', 'duration-1000');
                              setTimeout(() => el.classList.remove('bg-primary/10'), 2000);
                            }
                          } else {
                            navigate(`/quran/${s}#ayah=${a}`);
                          }
                        } catch (e) {
                          toast.dismiss(tid);
                          toast.error(`Failed to load Page ${p}`);
                        }
                      }}
                      className="py-2.5 flex items-center justify-center rounded-lg border border-border/50 bg-accent/30 text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Surah Info Modal */}
      {isSurahInfoOpen && data && (
        <>
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={() => setIsSurahInfoOpen(false)} />
          <div className="fixed left-[50%] top-[50%] z-[60] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/60 bg-card p-6 shadow-2xl duration-200 sm:rounded-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
              <h2 className="text-xl font-bold text-foreground">Surah Info</h2>
              <button onClick={() => setIsSurahInfoOpen(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="overflow-y-auto pr-2 scroll-thin" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              {loadingSurahInfo ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                </div>
              ) : (
                <div className="space-y-6 pt-2 pb-6">
                  <div className="flex flex-col items-start gap-4">
                    <h1 className="font-arabic text-[50px] leading-none text-foreground drop-shadow-sm" dir="rtl">
                      {data.name}
                    </h1>
                    <div>
                      <h3 className="font-bold text-xl text-foreground">Surah {data.englishName}</h3>
                      <div className="flex items-center gap-4 text-[14.5px] font-medium text-foreground/90 mt-2.5">
                        <span><span className="font-bold text-foreground">Ayahs:</span> {data.ayahs?.length || "?"}</span>
                        <span><span className="font-bold text-foreground">Revelation Place:</span> <span className="capitalize">{data.revelationType}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  {surahInfoData && (
                    <>
                      <div className="pt-4 border-t border-border/40">
                        <p className="text-[14.5px] text-muted-foreground">
                          Adapted from {surahInfoData.source || "Quran.com"}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-bold text-[16px] text-foreground">Themes and Purpose:</h4>
                        <div 
                          className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-medium"
                          dangerouslySetInnerHTML={{ __html: surahInfoData.text || surahInfoData.short_text }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setIsSettingsOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[400px] bg-card border-l border-border/60 shadow-2xl flex flex-col transition-transform transform translate-x-0">
            {isTranslationSelectorOpen ? (
              <div className="absolute inset-0 z-10 bg-card flex flex-col">
                <div className="flex items-center gap-4 p-4 border-b border-border/40">
                  <button onClick={() => setIsTranslationSelectorOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
                  <span className="font-bold text-[16px]">Translations</span>
                </div>
                <div className="p-4 border-b border-border/40">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search Translations" 
                      value={translationSearch}
                      onChange={(e) => setTranslationSearch(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-[14px] focus:outline-none focus:border-primary" 
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-thin">
                  {Object.entries(editionsByLanguage).map(([lang, items]) => (
                    <div key={lang}>
                      <h4 className="font-bold text-[15px] mb-3 text-foreground capitalize">{lang}</h4>
                      <div className="space-y-4">
                        {items.map(e => (
                          <label key={e.id} className="flex items-start gap-3 cursor-pointer group">
                            <div className="mt-0.5">
                              <input type="checkbox" checked={translationEditions.includes(e.id)} onChange={(ev) => {
                                let next = [...translationEditions];
                                if (ev.target.checked) next.push(e.id);
                                else next = next.filter(id => id !== e.id);
                                if (next.length === 0) next = [131]; // prevent empty
                                setTranslationEditions(next);
                                localStorage.setItem(TRANSLATION_KEY, JSON.stringify(next));
                              }} className="w-5 h-5 rounded border-border/60 text-foreground focus:ring-foreground bg-accent/30 checked:bg-foreground checked:border-foreground" />
                            </div>
                            <div className="flex-1">
                              <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">{e.author_name || e.name}</span>
                            </div>
                            <Info className="h-4 w-4 text-muted-foreground opacity-50" />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex bg-card pt-2 px-6 border-b border-border/40 text-[14px] font-bold text-muted-foreground">
                  <button onClick={() => setSettingsTab("arabic")} className={`flex-1 pb-3 transition-colors ${settingsTab === 'arabic' ? 'text-primary border-b-[3px] border-primary' : 'hover:text-foreground'}`}>Arabic</button>
                  <button onClick={() => setSettingsTab("translation")} className={`flex-1 pb-3 transition-colors ${settingsTab === 'translation' ? 'text-primary border-b-[3px] border-primary' : 'hover:text-foreground'}`}>Translation</button>
                  <button onClick={() => setSettingsTab("wbw")} className={`flex-1 pb-3 transition-colors ${settingsTab === 'wbw' ? 'text-primary border-b-[3px] border-primary' : 'hover:text-foreground'}`}>Word By Word</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-thin">
                  {/* Preview Area */}
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground mb-3">Preview:</p>
                    <div className="rounded-2xl border border-border/40 bg-accent/10 p-6 flex flex-col items-center justify-center relative pt-12">
                      <div className="absolute top-4 bg-primary text-primary-foreground text-[12px] font-bold px-3 py-1.5 rounded">
                        the Most Gracious
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45"></div>
                      </div>
                      <div className="mt-4 font-arabic text-[36px] text-foreground text-center" dir="rtl">
                        {arabicScript === 'indopak' ? 'بِسۡمِ اللّٰهِ الرَّحۡمٰنِ الرَّحِيۡمِ' : 
                         arabicScript === 'uthmani' ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ' : 
                         <span dangerouslySetInnerHTML={{ __html: 'بِسْمِ ٱللَّهِ <span class="text-[#06B6D4]">ٱلرَّحْمَٰنِ</span> ٱلرَّحِيمِ' }} />}
                      </div>
                      <p className="mt-6 text-[15px] font-medium text-foreground text-center">
                        In the Name of Allah—the Most Compassionate, Most Merciful.
                      </p>
                    </div>
                  </div>

                  {settingsTab === 'arabic' && (
                    <div className="space-y-6">
                      <div className="flex bg-accent/20 rounded-full p-1 border border-border/60 text-[13px] font-bold">
                        <button onClick={() => { setArabicScript('uthmani'); localStorage.setItem('deenguide:script', 'uthmani'); }} className={`flex-1 rounded-full py-2 hover:bg-background hover:shadow-sm transition-all ${arabicScript === 'uthmani' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Uthmani</button>
                        <button onClick={() => { setArabicScript('indopak'); localStorage.setItem('deenguide:script', 'indopak'); }} className={`flex-1 rounded-full py-2 hover:bg-background hover:shadow-sm transition-all ${arabicScript === 'indopak' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>IndoPak</button>
                        <button onClick={() => { setArabicScript('tajweed'); localStorage.setItem('deenguide:script', 'tajweed'); }} className={`flex-1 rounded-full py-2 hover:bg-background hover:shadow-sm transition-all ${arabicScript === 'tajweed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>Tajweed</button>
                      </div>
                      
                      <div className="pb-6 border-b border-border/40">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-bold text-[14px] text-foreground">Show Tajweed rules while reading:</span>
                          <input type="checkbox" checked={arabicScript === 'tajweed'} onChange={(e) => { const s = e.target.checked ? 'tajweed' : 'uthmani'; setArabicScript(s); localStorage.setItem('deenguide:script', s); }} className="w-5 h-5 rounded border-border/60 text-primary focus:ring-primary" />
                        </div>
                        
                        {arabicScript === 'tajweed' && (
                          <div className="bg-background rounded-xl p-4 border border-border/60 mt-2">
                            <h5 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Color Legend</h5>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px]">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#A0A0A0]"></div> <span className="text-foreground/80">Silent letter</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#DFA800]"></div> <span className="text-foreground/80">Normal madd (2)</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F68B1F]"></div> <span className="text-foreground/80">Separated madd</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E10000]"></div> <span className="text-foreground/80">Connected madd</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#980000]"></div> <span className="text-foreground/80">Necessary madd</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#00A300]"></div> <span className="text-foreground/80">Ghunna/ikhfa'</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#008CBA]"></div> <span className="text-foreground/80">Qalqala (echo)</span></div>
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#2253B8]"></div> <span className="text-foreground/80">Tafkhim (heavy)</span></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <span className="text-[15px] font-medium text-foreground">Font size</span>
                        <div className="flex items-center gap-6">
                          <button onClick={() => { const v = Math.max(1, fontSize - 1); setFontSize(v); localStorage.setItem('deenguide:font-size', v); }} className="text-foreground hover:text-primary p-2"><span className="text-2xl leading-none font-light block -mt-1">–</span></button>
                          <span className="text-[15px] font-medium w-4 text-center">{fontSize}</span>
                          <button onClick={() => { const v = Math.min(7, fontSize + 1); setFontSize(v); localStorage.setItem('deenguide:font-size', v); }} className="text-foreground hover:text-primary p-2"><span className="text-2xl leading-none font-light block -mt-1">+</span></button>
                        </div>
                      </div>

                      <div className="py-2 border-t border-border/40 mt-4 pt-6">
                        <label className="text-[13px] font-bold text-muted-foreground mb-3 block">Selected Reciter</label>
                        <div className="relative">
                          <select 
                            value={reciter} 
                            onChange={e => { setReciter(parseInt(e.target.value, 10)); localStorage.setItem(RECITER_KEY, e.target.value); }}
                            className="w-full h-[52px] bg-card border border-border/60 rounded-[14px] px-4 font-bold text-[15px] text-foreground appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                          >
                            {reciters.map((r) => (
                              <option key={r.id} value={r.id}>{r.reciter_name || r.name || `Reciter ${r.id}`}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'translation' && (
                    <div className="space-y-6">
                      <div className="py-2 cursor-pointer group" onClick={() => setIsTranslationSelectorOpen(true)}>
                        <label className="text-[13px] text-muted-foreground mb-2 block">Selected Translations</label>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors">
                            {translationEditions.length > 0 ? `${editions.find(e => e.id === translationEditions[0])?.name || editions.find(e => e.id === translationEditions[0])?.author_name || 'Translation'}${translationEditions.length > 1 ? `, and ${translationEditions.length - 1} others` : ''}` : 'Select translation'}
                          </span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-6 border-t border-border/40">
                        <span className="text-[15px] font-medium text-foreground">Font size</span>
                        <div className="flex items-center gap-6">
                          <button onClick={() => { const v = Math.max(1, fontSize - 1); setFontSize(v); localStorage.setItem('deenguide:font-size', v); }} className="text-foreground hover:text-primary p-2"><span className="text-2xl leading-none font-light block -mt-1">–</span></button>
                          <span className="text-[15px] font-medium w-4 text-center">{fontSize}</span>
                          <button onClick={() => { const v = Math.min(7, fontSize + 1); setFontSize(v); localStorage.setItem('deenguide:font-size', v); }} className="text-foreground hover:text-primary p-2"><span className="text-2xl leading-none font-light block -mt-1">+</span></button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'wbw' && (
                    <div>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">Translation</span>
                          <input type="checkbox" checked={wbwSettings.translation} onChange={() => toggleWbw('translation')} className="w-5 h-5 rounded border-border/60 text-primary focus:ring-primary" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">Transliteration</span>
                          <input type="checkbox" checked={wbwSettings.transliteration} onChange={() => toggleWbw('transliteration')} className="w-5 h-5 rounded border-border/60 text-primary focus:ring-primary" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-border/50 bg-card flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  <button onClick={() => { setArabicScript('tajweed'); setFontSize(3); setWbwSettings({ translation: true, transliteration: false }); setTranslationEditions([131]); localStorage.clear(); }} className="px-4 py-2 text-muted-foreground font-bold text-[15px] hover:text-foreground transition-colors">Reset</button>
                  <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2.5 bg-foreground text-background font-bold text-[15px] rounded-xl hover:opacity-90 transition-opacity">Done</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="mx-auto max-w-4xl pb-24 px-4 sm:px-6">
        {loading && (
          <div className="grid place-items-center py-24 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-[#178b50]" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive mt-10">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Sticky Header (appears on scroll) */}
            <div className={`fixed top-0 left-0 right-0 z-40 bg-background border-b border-border/40 transition-all duration-300 ${isScrolled ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
              <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between">
                <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-1 text-[15px] font-bold text-foreground hover:text-primary transition-colors focus:outline-none mt-1">
                  {data.number}. {data.englishName} <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70 ml-1" />
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode("verse")} className={`p-2 transition-colors rounded-lg ${viewMode === "verse" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`} title="Verse by Verse">
                    <List className="h-5 w-5" />
                  </button>
                  <button onClick={() => setViewMode("reading")} className={`p-2 transition-colors rounded-lg ${viewMode === "reading" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`} title="Reading">
                    <BookText className="h-5 w-5" />
                  </button>
                  <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-muted-foreground hover:bg-accent/50 rounded-lg transition-colors ml-1">
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-[3px] bg-[#178b50] transition-all duration-75 ease-out" style={{ width: `${scrollProgress}%` }} />
            </div>

            {/* Top Header (Static, disappears on scroll) */}
            <div className="pt-6 mb-12 relative">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-1 text-2xl sm:text-[28px] font-bold text-foreground hover:text-primary transition-colors focus:outline-none tracking-tight">
                  {data.number}. {data.englishName} <ChevronDown className="h-5 w-5 text-muted-foreground opacity-70 ml-2" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-muted-foreground hover:bg-accent/50 rounded-full transition-colors">
                  <Settings className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex border-b border-border/40 text-[15px] font-bold relative">
                <button 
                  onClick={() => setViewMode("verse")} 
                  className={`flex-1 pb-4 flex items-center justify-center gap-2 transition-colors border-b-[3px] -mb-[1.5px] ${viewMode === "verse" ? "text-[#178b50] border-[#178b50]" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                >
                  <List className="h-4 w-4" /> Verse by Verse
                </button>
                <button 
                  onClick={() => setViewMode("reading")} 
                  className={`flex-1 pb-4 flex items-center justify-center gap-2 transition-colors border-b-[3px] -mb-[1.5px] ${viewMode === "reading" ? "text-[#178b50] border-[#178b50]" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                >
                  <BookText className="h-4 w-4" /> Reading
                </button>
              </div>
            </div>



          {/* Secondary Controls Bar */}
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="flex items-center justify-center gap-1 sm:gap-2 bg-accent/20 border border-border/50 rounded-full p-1 text-[13px] font-bold">
              <button 
                onClick={togglePlayAll} 
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 hover:text-primary transition-colors text-muted-foreground"
              >
                {playing ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary fill-primary/20" />} 
                {playing ? "Pause" : "Listen"}
              </button>
              
              {viewMode === "reading" ? (
                <div className="px-1 sm:px-2 border-l border-border/60 flex items-center gap-1 relative">
                  <button 
                    onClick={() => setReadingView("arabic")} 
                    className={`px-3 sm:px-4 py-1.5 rounded-full transition-all ${readingView === "arabic" ? "bg-background shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Arabic
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => {
                        if (readingView !== "translation") {
                          setReadingView("translation");
                        } else {
                          setIsTranslationDropdownOpen(!isTranslationDropdownOpen);
                        }
                      }} 
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full transition-all ${readingView === "translation" ? "bg-foreground shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Translation: <span className="truncate max-w-[80px] sm:max-w-[120px] font-medium">{selectedTranslation ? (selectedTranslation.author_name || selectedTranslation.name) : "Default"}</span>
                      <ChevronDown className={`h-3 w-3 ${readingView === "translation" ? "text-background/70" : "text-muted-foreground"} transition-transform ${isTranslationDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {isTranslationDropdownOpen && readingView === "translation" && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsTranslationDropdownOpen(false)} />
                        <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[320px] bg-card border border-border/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-3 py-2 border-b border-border/40 mb-2">
                            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">My Translations</span>
                          </div>
                          <div className="max-h-[250px] overflow-y-auto scroll-thin">
                            {editions.filter(e => translationEditions.includes(e.id) || [131, 20, 97, 14, 85].includes(e.id)).slice(0, 8).map(e => (
                              <button
                                key={e.id}
                                onClick={() => {
                                  // Just set this translation as the active primary one
                                  const next = [e.id, ...translationEditions.filter(id => id !== e.id)];
                                  setTranslationEditions(next);
                                  localStorage.setItem(TRANSLATION_KEY, JSON.stringify(next));
                                  setIsTranslationDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${e.id === translationEditions[0] ? "bg-[#178b50]/10 text-[#178b50]" : "text-foreground hover:bg-accent/30"}`}
                              >
                                {e.author_name || e.name}
                              </button>
                            ))}
                          </div>
                          <div className="px-2 pt-2 border-t border-border/40 mt-2">
                            <button onClick={() => { setIsTranslationDropdownOpen(false); setIsSettingsOpen(true); setTimeout(() => setSettingsTab('translation'), 100); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-bold text-foreground hover:bg-accent/50 transition-colors">
                              <Settings className="h-4 w-4" /> Select Translations
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-3 border-l border-border/60 text-muted-foreground flex items-center gap-1">
                  Translation: 
                  <span className="text-foreground cursor-pointer hover:text-primary transition-colors font-medium" onClick={() => setIsSettingsOpen(true)}>
                    {selectedTranslation ? (selectedTranslation.author_name || selectedTranslation.name) : "Default"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Surah Title Header */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 mb-10">
            <h1 className="font-arabic text-[64px] sm:text-[80px] leading-none text-foreground drop-shadow-sm" dir="rtl">
              {data.name}
            </h1>
            <div className="flex flex-col items-start gap-0 border-l-2 border-border/50 pl-6">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-bold text-foreground">{data.number}. {data.englishName}</span>
                <button onClick={openSurahInfo} className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border border-primary/20">INFO</button>
              </div>
              <p className="text-[17px] text-muted-foreground font-medium">{data.englishNameTranslation}</p>
            </div>
          </div>



          {/* Bismillah Header (if not Surah 1 or 9) */}
          {data.number !== 1 && data.number !== 9 && (
            <div className="mb-14 text-center">
              <img 
                src="/bismillah.svg" 
                alt="Bismillah" 
                className="h-10 md:h-12 mx-auto dark:invert opacity-90 transition-all" 
              />
              <p className="mt-2 text-[15px] text-foreground/80 font-medium">
                In the Name of Allah—the Most Compassionate, Most Merciful.
              </p>
            </div>
          )}

          {/* Ayahs Rendering */}
          {viewMode === "verse" ? (
            <div className="space-y-12">
              {data.ayahs.map((a, idx) => {
                const bkId = `${data.number}:${a.number}`;
                const saved = isBookmarked("ayahs", bkId);
                const isCurrent = currentIdx === idx && playing;

                return (
                  <div
                    key={a.number}
                    data-ayah-row={a.number}
                    className={`pb-10 border-b border-border/30 last:border-0 transition-colors ${isCurrent ? "bg-accent/10 -mx-4 px-4 rounded-2xl" : ""}`}
                  >
                    {/* Verse Header Controls */}
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-5 text-muted-foreground">
                        <span className="text-[14px] font-bold text-primary hover:underline cursor-pointer">{data.number}:{a.number}</span>
                        <button onClick={() => playSingle(idx)} className="text-foreground hover:text-primary transition-colors" title="Play Verse">
                          {isCurrent ? <Pause className="h-5 w-5 text-primary" /> : <Play className="h-5 w-5 fill-current" />}
                        </button>
                        <button 
                          onClick={() => {
                            toggle("ayahs", { id: bkId, surah: data.number, surah_name: data.englishName, ayah: a.number, arabic: a.arabic, translation: a.translation });
                            toast.success(saved ? "Removed bookmark" : "Ayah saved");
                          }}
                          className="text-foreground hover:text-primary transition-colors"
                          title="Bookmark"
                        >
                          {saved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-5 text-muted-foreground">
                        <button onClick={() => { navigator.clipboard.writeText(`${a.arabic}\n\n${a.translation}`); toast.success("Ayah copied!"); }} className="text-foreground hover:text-primary transition-colors" title="Copy"><Copy className="h-5 w-5" /></button>
                        <button onClick={() => { navigator.clipboard.writeText(`https://deenguide.app/quran/${data.number}/${a.number}`); toast.success("Link copied!"); }} className="text-foreground hover:text-primary transition-colors" title="Share"><Share2 className="h-5 w-5" /></button>
                        {/* ... menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMoreMenu(openMoreMenu === a.number ? null : a.number)}
                            className="text-foreground hover:text-primary transition-colors" title="More options"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          {openMoreMenu === a.number && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMoreMenu(null)} />
                              <div className="absolute right-0 top-8 z-50 w-52 bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => { toggleTafsir(a.number); setOpenMoreMenu(null); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors hover:bg-accent/50 ${ tafsir[a.number]?.open ? 'text-primary' : 'text-foreground' }`}
                                >
                                  <BookText className="h-4 w-4" /> Tafsir
                                </button>
                                <button
                                  onClick={() => { setIsSettingsOpen(true); setTimeout(() => setSettingsTab('wbw'), 50); setOpenMoreMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
                                >
                                  <Languages className="h-4 w-4" /> Word by Word
                                </button>
                                <button
                                  onClick={() => { setIsSettingsOpen(true); setTimeout(() => setSettingsTab('translation'), 50); setOpenMoreMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
                                >
                                  <MessageSquareText className="h-4 w-4" /> Translation
                                </button>
                                <div className="border-t border-border/40" />
                                <button
                                  onClick={() => { setIsSettingsOpen(true); setOpenMoreMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
                                >
                                  <Settings className="h-4 w-4" /> Settings
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Arabic Text (Word by Word & Tajweed) */}
                    <div className="mb-6 flex flex-wrap justify-start gap-x-2 gap-y-5 dir-rtl" dir="rtl">
                      {arabicScript === 'indopak' ? (
                         <div className="font-arabic leading-[2.4] text-foreground text-right" style={{ fontSize: getArabicFontSize() }}>
                           {a.indopak} <span className="inline-block relative text-primary mx-1" style={{ fontSize: `max(16px, calc(${getArabicFontSize()} * 0.6))` }}>﴾{a.number}﴿</span>
                         </div>
                      ) : (
                        a.words.map((w, i) => (
                          <div key={w.id} className="group relative flex flex-col items-center justify-start cursor-pointer hover:bg-accent/20 rounded p-1 transition-colors text-center">
                            <span 
                              className="font-arabic leading-[1.8] text-foreground transition-all duration-300" 
                              style={{ fontSize: w.char_type_name === 'end' ? `max(16px, calc(${getArabicFontSize()} * 0.6))` : getArabicFontSize() }}
                              dangerouslySetInnerHTML={{ __html: w.char_type_name === 'end' ? `<span class="text-primary">﴾${w.arabic}﴿</span>` : (arabicScript === 'tajweed' ? w.tajweed : w.arabic) }}
                            />
                            {w.char_type_name !== 'end' && (wbwSettings.transliteration || wbwSettings.translation) && (
                              <div className="flex flex-col items-center mt-1.5 space-y-0.5">
                                {wbwSettings.transliteration && w.transliteration && (
                                  <span className="text-[12px] font-medium text-primary opacity-80">{w.transliteration}</span>
                                )}
                                {wbwSettings.translation && w.translation && (
                                  <span className="text-[13.5px] font-medium text-foreground/80">{w.translation}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Translation Text */}
                    <div className="space-y-5">
                      {a.translations?.map((t, tidx) => {
                        const edition = editions.find(e => e.id === t.id);
                        const isRTL = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(t.text);
                        return (
                          <div key={t.id || tidx} dir={isRTL ? "rtl" : "ltr"} className={`border-l-2 ${isRTL ? 'border-l-0 border-r-2 pl-0 pr-4' : 'pl-4'} border-border/30`}>
                            <div 
                              className={`leading-relaxed text-foreground/90 font-medium transition-all duration-300 font-sans ${isRTL ? 'text-right font-arabic' : 'text-left'}`} 
                              style={{ fontSize: getTranslationFontSize() }}
                              dangerouslySetInnerHTML={{ __html: t.text }}
                            />
                            <p className={`mt-3 text-[13px] text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`}>
                              — {edition?.author_name || edition?.name || "Translation"}
                            </p>
                          </div>
                        );
                      })}
                    </div>



                    {/* Tafsir Content Block */}
                    {tafsir[a.number]?.open && (
                      <div className="mt-8 pt-8 border-t border-border/30 animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* Tafsir Top Bar */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            {tafsir[a.number]?.widget === 'aa' ? (
                              <div className="flex items-center gap-4 bg-accent/30 text-foreground px-4 py-1.5 rounded-lg text-[13px] font-bold shrink-0 animate-in fade-in zoom-in-95 duration-150">
                                <span>Aa</span>
                                <button onClick={() => { setFontSize(p => { const n = Math.max(1, p - 1); localStorage.setItem('deenguide:font-size', n.toString()); return n; }) }} className="opacity-70 hover:opacity-100 text-[15px]">−</button>
                                <span className="text-primary min-w-[1ch] text-center">{fontSize}</span>
                                <button onClick={() => { setFontSize(p => { const n = Math.min(7, p + 1); localStorage.setItem('deenguide:font-size', n.toString()); return n; }) }} className="opacity-70 hover:opacity-100 text-[15px]">+</button>
                                <button onClick={() => setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], widget: null } }))} className="opacity-70 hover:opacity-100 border-l border-border/50 pl-3 ml-1">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], widget: 'aa' } }))} className="flex items-center gap-2 bg-accent/30 hover:bg-accent/50 text-foreground px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors shrink-0">
                                Aa <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                              </button>
                            )}
                            {tafsir[a.number]?.widget === 'lang' ? (
                              <div className="flex items-center gap-2 bg-accent/30 text-foreground pl-3 pr-2 py-1 rounded-lg text-[13px] font-bold shrink-0 animate-in fade-in zoom-in-95 duration-150">
                                <select 
                                  className="bg-transparent outline-none cursor-pointer text-foreground appearance-none pr-4"
                                  value={activeTafsirLang}
                                  onChange={(e) => {
                                    const firstTafsirInLang = tafsirEditions.find(t => t.language === e.target.value);
                                    if (firstTafsirInLang) {
                                      const idToUse = firstTafsirInLang.id || firstTafsirInLang.slug;
                                      setTafsirEdition(idToUse);
                                      setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], widget: null, loading: true } }));
                                      quran.tafsir(parseInt(data.number, 10), a.number, idToUse).then(res => {
                                        setTafsir(prev => ({ ...prev, [a.number]: { open: true, loading: false, text: res?.text || "" } }));
                                      }).catch(err => {
                                        setTafsir(prev => ({ ...prev, [a.number]: { open: true, loading: false, text: "Error loading tafsir." } }));
                                      });
                                    }
                                  }}
                                >
                                  {tafsirLangs.map(lang => (
                                    <option key={lang} value={lang} className="bg-background text-foreground">{lang}</option>
                                  ))}
                                </select>
                                <button onClick={() => setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], widget: null } }))} className="opacity-70 hover:opacity-100 border-l border-border/50 pl-2 ml-1">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], widget: 'lang' } }))} className="flex items-center gap-2 bg-accent/30 hover:bg-accent/50 text-foreground px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors shrink-0">
                                {activeTafsirLang} <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                              </button>
                            )}
                            
                            {/* Scrollable list of Tafsir Editions */}
                            <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-1 max-w-[50vw]">
                              {tafsirEditions.filter(t => t.language === activeTafsirLang).map((t) => {
                                const idToUse = t.id || t.slug;
                                const isActive = tafsirEdition === idToUse;
                                return (
                                  <button 
                                    key={idToUse}
                                    onClick={async () => {
                                      setTafsirEdition(idToUse);
                                      setTafsir(prev => ({ ...prev, [a.number]: { ...prev[a.number], loading: true } }));
                                      try {
                                        const res = await quran.tafsir(parseInt(data.number, 10), a.number, idToUse);
                                        setTafsir(prev => ({ ...prev, [a.number]: { open: true, loading: false, text: res?.text || "" } }));
                                      } catch (err) {
                                        setTafsir(prev => ({ ...prev, [a.number]: { open: true, loading: false, text: "Error loading tafsir." } }));
                                      }
                                    }}
                                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-bold shadow-sm transition-colors ${isActive ? 'bg-[#178b50] text-white' : 'bg-accent/30 hover:bg-accent/50 text-foreground'}`}
                                  >
                                    {t.scholar || t.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <button onClick={() => toggleTafsir(a.number)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent/50 transition-colors">
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        {tafsir[a.number]?.loading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                          </div>
                        ) : (
                          <div className="text-foreground/90 max-w-4xl">
                            <div 
                              className="prose prose-sm dark:prose-invert max-w-none font-medium leading-[1.8] font-sans text-[15px]"
                              dangerouslySetInnerHTML={{ 
                                __html: tafsir[a.number]?.text?.replace(/<h2/g, '<h2 class="text-2xl font-bold mb-4 mt-6 text-foreground"').replace(/<p/g, '<p class="mb-4"') || "No Tafsir available for this verse." 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Reading Mode */
            <div className="text-center mt-10">
              {Object.entries(ayahsByPage).map(([pageNum, pageAyahs]) => (
                <div key={pageNum}>
                  {readingView === "arabic" ? (
                    <div dir="rtl" className={`font-arabic leading-[2.4] text-foreground max-w-4xl mx-auto transition-all duration-300 ${data.number === 1 ? 'text-center' : 'text-justify'}`} style={{ textJustify: data.number === 1 ? 'none' : 'inter-word', fontSize: getArabicFontSize() }}>
                      {pageAyahs.map(a => (
                        <span key={a.number} data-ayah-row={a.number} className={data.number === 1 && a.number === 1 ? "block mb-6 text-center" : "inline"}>
                          <span dangerouslySetInnerHTML={{ __html: arabicScript === 'tajweed' ? a.tajweed : (arabicScript === 'indopak' ? a.indopak : a.arabic) }} /> <span className="inline-block relative text-primary mx-1" style={{ fontSize: `max(16px, calc(${getArabicFontSize()} * 0.6))` }}>﴾{a.number}﴿</span>{" "}
                        </span>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      const tFirst = pageAyahs[0]?.translations?.[0];
                      const isContainerRTL = tFirst && /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(tFirst.text);
                      return (
                        <div dir={isContainerRTL ? "rtl" : "ltr"} className={`leading-[2.2] text-foreground/90 max-w-4xl mx-auto transition-all duration-300 ${isContainerRTL ? "text-right font-arabic" : "text-left font-sans"} ${data.number === 1 ? 'text-center' : 'text-justify'}`} style={{ textJustify: data.number === 1 ? 'none' : 'inter-word', fontSize: getTranslationFontSize() }}>
                          {pageAyahs.map(a => {
                            const t = a.translations && a.translations.length > 0 ? a.translations[0] : { text: "No translation available." };
                            return (
                              <span key={a.number} data-ayah-row={a.number} className={data.number === 1 && a.number === 1 ? "block mb-6 text-center" : "inline"}>
                                {isContainerRTL ? null : <span className="font-bold text-primary mr-1.5 opacity-70">[{a.number}]</span>}
                                <span dangerouslySetInnerHTML={{ __html: t.text }} />
                                {isContainerRTL ? <span className="font-bold text-primary ml-1.5 opacity-70 font-sans">[{a.number}]</span> : null}
                                {"  "}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                  
                  {/* Page Separator */}
                  <div className="flex items-center justify-center my-14 opacity-50 max-w-2xl mx-auto">
                    <div className="flex-1 h-px bg-border"></div>
                    <span className="px-4 text-[13px] font-bold text-muted-foreground">{pageNum}</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* End of Chapter */}
          <div className="mt-20 pt-10 border-t border-border/40">
            <div className="flex items-center justify-center gap-6 text-[15px] font-medium mb-10">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <PlayCircle className="h-4 w-4 text-primary" /> Read Again
              </button>
              <span className="text-border">|</span>
              {data.number < 114 ? (
                <Link
                  to={`/quran/${data.number + 1}`}
                  className="text-primary hover:underline font-semibold"
                >
                  Continue Reading →
                </Link>
              ) : (
                <span className="text-muted-foreground">You've completed the Quran 🎉</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Sticky Audio Player */}
      {isAudioPlayerVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/60 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
          {/* Progress Bar */}
          <div className="relative w-full h-1.5 bg-accent cursor-pointer group">
            <div 
              className="absolute top-0 left-0 h-full bg-foreground transition-all duration-100 ease-linear"
              style={{ width: `${audioProgress.duration > 0 ? (audioProgress.currentTime / audioProgress.duration) * 100 : 0}%` }}
            />
            {/* Playhead thumb (visible on hover) */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${audioProgress.duration > 0 ? (audioProgress.currentTime / audioProgress.duration) * 100 : 0}% - 6px)` }}
            />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Time Tracker */}
            <div className="text-[12px] font-bold text-muted-foreground w-[60px]">
              {Math.floor(audioProgress.currentTime / 60).toString().padStart(2, '0')}:
              {Math.floor(audioProgress.currentTime % 60).toString().padStart(2, '0')}
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-6 sm:gap-10">
              <div className="relative">
                <button 
                  onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)} 
                  className="p-2 text-foreground hover:bg-accent rounded-full transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                
                {/* Audio Menu Dropdown */}
                {isAudioMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAudioMenuOpen(false)} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[240px] bg-card border border-border/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                        <Download className="h-4 w-4 text-muted-foreground" /> Download
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" /> Manage repeat settings
                      </button>
                      <div className="my-1 border-t border-border/40" />
                      <button className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3"><Zap className="h-4 w-4 text-muted-foreground" /> Experience</div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3"><span className="text-[12px] font-bold text-muted-foreground ml-1 w-3">1x</span> Speed</div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => { setIsAudioMenuOpen(false); setIsSettingsOpen(true); setTimeout(() => setSettingsTab('audio'), 100); }} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> Reciter</div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <button className="p-2 text-foreground hover:bg-accent rounded-full transition-colors hidden sm:block">
                <Volume2 className="h-5 w-5" />
              </button>
              
              <button 
                onClick={() => { if (currentIdx > 0) playFromIndex(currentIdx - 1); }} 
                className="p-2 text-foreground hover:bg-accent rounded-full transition-colors"
              >
                <Rewind className="h-6 w-6 fill-current" />
              </button>
              
              <button 
                onClick={togglePlayAll} 
                className="p-3 text-foreground hover:bg-accent rounded-full transition-colors"
              >
                {playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
              </button>
              
              <button 
                onClick={() => { if (data && currentIdx < data.ayahs.length - 1) playFromIndex(currentIdx + 1); }} 
                className="p-2 text-foreground hover:bg-accent rounded-full transition-colors"
              >
                <FastForward className="h-6 w-6 fill-current" />
              </button>
              
              <button 
                onClick={() => {
                  stopPlayback();
                  setIsAudioPlayerVisible(false);
                }} 
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Duration */}
            <div className="text-[12px] font-bold text-muted-foreground w-[60px] text-right">
              {audioProgress.duration > 0 ? (
                <>
                  {Math.floor(audioProgress.duration / 60).toString().padStart(2, '0')}:
                  {Math.floor(audioProgress.duration % 60).toString().padStart(2, '0')}
                </>
              ) : "00:00"}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function groupBy(arr, key) {
  const out = {};
  for (const item of arr) {
    const k = item[key] || "Other";
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}
