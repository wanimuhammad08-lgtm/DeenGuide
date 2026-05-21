import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, Play, Pause, Bookmark, BookmarkCheck,
  Languages, Mic2, Sparkles, ChevronDown, ChevronRight, BookText, Volume2, MessageSquareText,
  Music, Settings, Share2, Copy, MoreHorizontal, List, FileText, PlayCircle, Info, X, Search,
  MessageCircle,
  Rewind, FastForward, Download, RefreshCw, Zap, User, GraduationCap, Lightbulb
} from "lucide-react";
import { quran } from "@/lib/api";
import { qurancom } from "@/lib/qurancom";
import { useBookmarks } from "@/lib/bookmarks";
import { useTTS } from "@/lib/tts";
import TafsirModal from "@/components/quran/TafsirModal";
import SettingsSidebar from "@/components/quran/SettingsSidebar";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

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

const POPULAR_FALLBACK = [
  { id: 20, author_name: "Saheeh International", name: "Saheeh International" },
  { id: 85, author_name: "Muhsin Khan", name: "Muhsin Khan" },
  { id: 95, author_name: "Maududi", name: "Tafhim-ul-Quran" },
  { id: 14, author_name: "Yusuf Ali", name: "Yusuf Ali" },
  { id: 57, author_name: "Transliteration", name: "Transliteration" },
  { id: 97, author_name: "Pickthall", name: "Pickthall" }
];

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
  const [settingsTab, setSettingsTab] = useState("display");
  const [surahsList, setSurahsList] = useState([]);
  const [isTranslationSelectorOpen, setIsTranslationSelectorOpen] = useState(false);
  const [translationSearch, setTranslationSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('deenguide:font-size') || '1', 10));
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollProgressRef = useRef(0);
  const stickyHeaderRef = useRef(null);
  const scrollBarRef = useRef(null);
  const [readingView, setReadingView] = useState("arabic"); // "arabic" or "translation"

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 250;
        // Only trigger re-render when crossing the threshold
        setIsScrolled(prev => prev !== scrolled ? scrolled : prev);
        
        const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
        scrollProgressRef.current = progress;
        if (scrollBarRef.current) scrollBarRef.current.style.width = `${progress}%`;
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [reciters, setReciters] = useState([]);
  const [editions, setEditions] = useState([]);
  const [tafsirEditions, setTafsirEditions] = useState([]);

  const [reciter, setReciter] = useState(() => {
    const val = parseInt(localStorage.getItem(RECITER_KEY) || "7", 10);
    return isNaN(val) ? 7 : val;
  });
  const [translationEditions, setTranslationEditions] = useState(() => {
    try { 
      const val = JSON.parse(localStorage.getItem(TRANSLATION_KEY));
      let ids = [];
      if (Array.isArray(val)) ids = val.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
      else if (val && (typeof val === 'number' || typeof val === 'string')) ids = [parseInt(val, 10)];
      else ids = [20];
      
      // Deduplicate
      return [...new Set(ids)];
    }
    catch { return [20]; }
  });
  const [tafsirEdition, setTafsirEdition] = useState(() => localStorage.getItem(TAFSIR_KEY) || "en-tafisr-ibn-kathir");

  const [wbwSettings, setWbwSettings] = useState(() => {
    const defaults = { 
      translation: false, 
      transliteration: false,
      onClick: 'recitation',
      hoverTranslation: false,
      hoverTransliteration: false,
      language: 'en'
    };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('deenguide:wbw') || '{}') };
    } catch {
      return defaults;
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
  const playingRef = useRef(false); // Essential for async chain cancellation
  const [playingAyahIdx, setPlayingAyahIdx] = useState(-1); // only used for initial render, DOM handles updates
  const progressBarRef = useRef(null);
  const progressThumbRef = useRef(null);
  const timeTextRef = useRef(null);
  const durationTextRef = useRef(null);
  const audioRef = useRef(null);
  const bismillahPlayedRef = useRef(false);
  const mixRef = useRef(audioMix); 
  const currentIdxRef = useRef(-1);
  const pausedIdxRef = useRef(-1);
  const autoScrollRef = useRef(true);
  const singleModeRef = useRef(false);
  const activeAyahNumberRef = useRef(null); // tracks which ayah row is highlighted
  
  // Surah Info Modal
  const [isSurahInfoOpen, setIsSurahInfoOpen] = useState(false);
  const [surahInfoData, setSurahInfoData] = useState(null);
  const [loadingSurahInfo, setLoadingSurahInfo] = useState(false);
  
  // Translation Dropdown
  const [isTranslationDropdownOpen, setIsTranslationDropdownOpen] = useState(false);

  // Audio Player State
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);
  const [audioMenuPanel, setAudioMenuPanel] = useState(null);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [tafsirPanelOpen, setTafsirPanelOpen] = useState(false);
  const [tafsirPanelAyahNum, setTafsirPanelAyahNum] = useState(null);
  const [tafsirFontSize, setTafsirFontSize] = useState(() => parseInt(localStorage.getItem('deenguide:tafsir-font-size') || '1'));
  const [tafsirWidget, setTafsirWidget] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => parseFloat(localStorage.getItem('deenguide:speed') || '1'));
  const [repeatMode, setRepeatMode] = useState(() => localStorage.getItem('deenguide:repeat') || 'off'); // 'off' | 'one' | 'all'
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('deenguide:volume') || '1'));
  const [theme, setTheme] = useState(() => localStorage.getItem('deenguide:theme') || 'light');
  const [translationFontSize, setTranslationFontSize] = useState(() => parseInt(localStorage.getItem('deenguide:translation-font-size') || '1'));
  // Quran.com-style repeat settings
  const [repeatTab, setRepeatTab] = useState(() => localStorage.getItem('deenguide:repeat-tab') || 'single');
  const [repeatPlayRange, setRepeatPlayRange] = useState(() => parseInt(localStorage.getItem('deenguide:repeat-play-range') || '2', 10));
  const [repeatEachVerse, setRepeatEachVerse] = useState(() => parseInt(localStorage.getItem('deenguide:repeat-each-verse') || '2', 10));
  const [repeatDelayBetween, setRepeatDelayBetween] = useState(() => parseInt(localStorage.getItem('deenguide:repeat-delay-between') || '1', 10));
  // Experience settings
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('deenguide:auto-scroll') !== 'false');
  const [tooltipOnPlay, setTooltipOnPlay] = useState(() => localStorage.getItem('deenguide:tooltip-on-play') === 'true');
  // Reciter search
  const [reciterSearch, setReciterSearch] = useState('');

  useEffect(() => {
    mixRef.current = audioMix;
  }, [audioMix]);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'sepia');
    document.documentElement.classList.add(theme);
    if (theme === 'sepia') {
      document.body.style.backgroundColor = '#f4ecd8';
      document.body.style.color = '#5b4636';
    } else {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, [theme]);

  const onUpdateSetting = (key, value) => {
    switch(key) {
      case 'fontSize': setFontSize(value); localStorage.setItem('deenguide:font-size', value); break;
      case 'translationFontSize': setTranslationFontSize(value); localStorage.setItem('deenguide:translation-font-size', value); break;
      case 'arabicScript': setArabicScript(value); localStorage.setItem('deenguide:script', value); break;
      case 'autoScroll': setAutoScroll(value); localStorage.setItem('deenguide:auto-scroll', String(value)); break;
      case 'reciter': setReciter(value); localStorage.setItem(RECITER_KEY, value); break;
      case 'translationEditions': {
        const cleaned = [...new Set(Array.isArray(value) ? value.map(v => parseInt(v, 10)).filter(v => !isNaN(v)) : [parseInt(value, 10)])];
        setTranslationEditions(cleaned); 
        localStorage.setItem(TRANSLATION_KEY, JSON.stringify(cleaned)); 
        break;
      }
      case 'volume': setVolume(value); localStorage.setItem('deenguide:volume', value); break;
      case 'playbackSpeed': setPlaybackSpeed(value); localStorage.setItem('deenguide:speed', value); break;
      case 'theme': setTheme(value); localStorage.setItem('deenguide:theme', value); break;
      case 'wbwSettings': setWbwSettings(value); localStorage.setItem('deenguide:wbw', JSON.stringify(value)); break;
      default: break;
    }
  };

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
        // Try scrolling with retries since DOM may not be ready immediately
        const tryScroll = (attempts = 0) => {
          const el = document.querySelector(`[data-ayah-row="${ayahNum}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add('bg-primary/10', 'transition-colors', 'duration-1000');
            setTimeout(() => el.classList.remove('bg-primary/10'), 3000);
          } else if (attempts < 10) {
            setTimeout(() => tryScroll(attempts + 1), 300);
          }
        };
        setTimeout(() => tryScroll(), 500);
      }
    }
  }, [data, location.hash]);

  // Track last visible ayah for "Continue Reading" feature
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const ayahNum = entry.target.getAttribute('data-ayah-row');
          if (ayahNum) {
            try {
              localStorage.setItem("deenguide:last-seen-surah", JSON.stringify({
                number: data.number,
                englishName: data.englishName,
                name: data.name,
                ayah: parseInt(ayahNum),
                timestamp: Date.now(),
              }));
            } catch {}
          }
        }
      }
    }, { threshold: 0.5 });

    // Observe all ayah rows
    const rows = document.querySelectorAll('[data-ayah-row]');
    rows.forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [data]);

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
          revelationType: chapter.revelationType,
          revelationOrder: chapter.revelationOrder,
          versesCount: chapter.versesCount,
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
              v.audio.url.startsWith('http') ? v.audio.url.replace('http://', 'https://') :
              v.audio.url.startsWith('//') ? `https:${v.audio.url}` :
              `https://verses.quran.com/${v.audio.url}`
            ) : null,
            audioSegments: v.audio?.segments || [],
            words: v.words.map(w => ({
              id: w.id,
              position: w.position,
              arabic: w.text_uthmani,
              tajweed: w.text_uthmani_tajweed || w.text_uthmani,
              translation: w.translation?.text,
              transliteration: w.transliteration?.text,
              audio: w.audio_url ? (
                w.audio_url.startsWith('http') ? w.audio_url.replace('http://', 'https://') :
                w.audio_url.startsWith('//') ? `https:${w.audio_url}` :
                `https://audio.qurancdn.com/${w.audio_url}`
              ) : null,
              char_type_name: w.char_type_name
            }))
          }))
        };
        setData(adapted);
        // Track surah open
        trackEvent('quran_surah_opened', 'quran', { surah: adapted.number, surah_name: adapted.englishName });
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
  const stopPlayback = useCallback((savePausedPosition = false) => {
    if (savePausedPosition) {
      pausedIdxRef.current = currentIdxRef.current;
    } else {
      pausedIdxRef.current = -1;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    tts.stop();
    setPlaying(false);
    playingRef.current = false;
    singleModeRef.current = false;
    // Remove row highlight via DOM
    clearRowHighlight(activeAyahNumberRef.current);
    activeAyahNumberRef.current = null;
    setPlayingAyahIdx(-1);
    currentIdxRef.current = -1;
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

  const playAudioAsync = useCallback((url, retries = 2) =>
    new Promise((resolve) => {
      if (!url) return resolve(false);
      const safeUrl = url.replace(/^http:/i, 'https:');
      
      const tryPlay = (attemptLeft) => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current = null;
        }
        
        const a = new Audio(safeUrl);
        a.playbackRate = parseFloat(localStorage.getItem('deenguide:speed') || '1');
        a.volume = parseFloat(localStorage.getItem('deenguide:volume') || '1');
        audioRef.current = a;
        
        a.onended = () => resolve(true);
        
        a.onerror = () => {
          if (audioRef.current !== a) return; // superseded by a newer call
          if (attemptLeft > 0) {
            setTimeout(() => tryPlay(attemptLeft - 1), 800);
          } else {
            resolve(false);
          }
        };
        
        a.addEventListener("loadedmetadata", () => {
          if (audioRef.current !== a) return;
          // Update progress bar DOM directly — no React re-render
          if (progressBarRef.current) progressBarRef.current.style.width = '0%';
          if (progressThumbRef.current) progressThumbRef.current.style.left = 'calc(0% - 6px)';
          if (timeTextRef.current) timeTextRef.current.innerText = '00:00';
          if (durationTextRef.current && a.duration > 0) {
            const dmin = Math.floor(a.duration / 60).toString().padStart(2, '0');
            const dsec = Math.floor(a.duration % 60).toString().padStart(2, '0');
            durationTextRef.current.innerText = `${dmin}:${dsec}`;
          }
        });

        a.play().catch(() => {
          if (audioRef.current !== a) return;
          if (attemptLeft > 0) {
            setTimeout(() => tryPlay(attemptLeft - 1), 800);
          } else {
            resolve(false);
          }
        });
      };

      tryPlay(retries);
    }), []);

  // Master Animation Loop for Smooth Progress Bar Updates
  // Only runs when audio is actually playing to avoid wasting CPU
  const animFrameRef = useRef(null);

  const startAnimLoop = useCallback(() => {
    if (animFrameRef.current) return; // already running
    const tick = () => {
      // Keep running as long as overall playback session is active
      if (!playingRef.current) {
        animFrameRef.current = null;
        return;
      }
      const a = audioRef.current;
      if (a && !a.paused && !a.ended) {
        const curTime = a.currentTime;
        const dur = a.duration || 0;
        const pct = dur > 0 ? (curTime / dur) * 100 : 0;
        if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`;
        if (progressThumbRef.current) progressThumbRef.current.style.left = `calc(${pct}% - 6px)`;
        if (timeTextRef.current) {
          const min = Math.floor(curTime / 60).toString().padStart(2, '0');
          const sec = Math.floor(curTime % 60).toString().padStart(2, '0');
          timeTextRef.current.innerText = `${min}:${sec}`;
        }
        if (durationTextRef.current && dur > 0) {
          const dmin = Math.floor(dur / 60).toString().padStart(2, '0');
          const dsec = Math.floor(dur % 60).toString().padStart(2, '0');
          durationTextRef.current.innerText = `${dmin}:${dsec}`;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Start/stop animation loop based on playing state
  useEffect(() => {
    if (playing) {
      startAnimLoop();
    } else {
      // Ensure highlight is cleared when playback fully stops (not just paused)
      if (currentIdxRef.current === -1) {
        clearRowHighlight(activeAyahNumberRef.current);
        activeAyahNumberRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [playing, startAnimLoop]);

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
    setTafsirPanelAyahNum(ayahNum);
    setTafsirPanelOpen(true);
    if (tafsir[ayahNum]?.text) return;
    setTafsir(prev => ({ ...prev, [ayahNum]: { open: true, loading: true, text: '' } }));
    const text = await fetchAyahTafsir(ayahNum);
    setTafsir(prev => ({ ...prev, [ayahNum]: { open: true, loading: false, text } }));
  }, [fetchAyahTafsir, tafsir]);

  const playFromIndex = useCallback((idx) => {
    if (!data || idx < 0 || idx >= data.ayahs.length) {
      // Handle repeat modes when reaching end
      const repeat = localStorage.getItem('deenguide:repeat') || 'off';
      if (repeat === 'all') {
        bismillahPlayedRef.current = false;
        playFromIndex(0);
      } else {
        stopPlayback();
      }
      return;
    }
    const ayah = data.ayahs[idx];
    // Highlight row + update play button via DOM (zero React re-renders of the list)
    clearRowHighlight(activeAyahNumberRef.current);
    activeAyahNumberRef.current = ayah.number;
    setRowHighlight(ayah.number);
    currentIdxRef.current = idx;
    setPlayingAyahIdx(idx); // still set for initial render consistency
    setPlaying(true);
    playingRef.current = true;
    setIsAudioPlayerVisible(true);
    // Track audio play
    if (idx === 0) trackEvent('audio_played', 'quran', { surah: data?.number, surah_name: data?.englishName });
    if (autoScrollRef.current) {
      const el = document.querySelector(`[data-ayah-row="${ayah.number}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const continueChain = async () => {
      const mix = mixRef.current;
      if (mix.translate && ayah.translations?.length > 0) {
        const text = ayah.translations[0].text;
        const url = translationAudioUrl(data.number, ayah.number);
        let played = false;
        if (url) {
          played = await playAudioAsync(url);
          if (!playingRef.current) return; // Guard after await
        }
        if (!played) {
          await speakAsync(text, translationLang);
          if (!playingRef.current) return; // Guard after await
        }
      }
      if (mix.tafsir) {
        const existing = tafsir[ayah.number]?.text;
        const text = existing || (await fetchAyahTafsir(ayah.number));
        if (!playingRef.current) return;
        if (text) {
          setTafsir((t) => ({ ...t, [ayah.number]: { open: true, loading: false, text } }));
          await speakAsync(text, tafsirLang);
          if (!playingRef.current) return;
        }
      }
      
      if (!playingRef.current) return; // Final guard before advancing
      
      // Handle single-ayah mode (per-ayah play button)
      if (singleModeRef.current) {
        singleModeRef.current = false;
        stopPlayback();
        return;
      }
      // Handle repeat-one
      const repeat = localStorage.getItem('deenguide:repeat') || 'off';
      if (repeat === 'one') playFromIndex(idx);
      else playFromIndex(idx + 1);
    };

    const playArabicThenChain = async () => {
      if (!playingRef.current) return;
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
        if (!playingRef.current) return;
      }
      if (mixRef.current.recite && ayah.audio) {
        const ok = await playAudioAsync(ayah.audio);
        if (!playingRef.current) return;
        if (!ok) toast.error("Recitation audio failed — skipping");
      }
      
      if (!playingRef.current) return;
      await continueChain();
    };
    playArabicThenChain();
  }, [data, stopPlayback, speakAsync, playAudioAsync, translationAudioUrl, translationLang, tafsirLang, tafsir, fetchAyahTafsir, reciters]);

  const PLAY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 fill-current"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const PAUSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" style="color:var(--primary)"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  const clearRowHighlight = (ayahNumber) => {
    if (ayahNumber == null) return;
    const el = document.querySelector(`[data-ayah-row="${ayahNumber}"]`);
    if (el) {
      el.classList.remove('bg-primary/5', '-mx-4', 'px-4', 'rounded-xl', 'border-l-2', 'border-l-primary/40');
      const btn = el.querySelector('[data-play-btn]');
      if (btn) btn.innerHTML = PLAY_ICON;
    }
  };

  const setRowHighlight = (ayahNumber) => {
    const el = document.querySelector(`[data-ayah-row="${ayahNumber}"]`);
    if (el) {
      el.classList.add('bg-primary/5', '-mx-4', 'px-4', 'rounded-xl', 'border-l-2', 'border-l-primary/40');
      const btn = el.querySelector('[data-play-btn]');
      if (btn) btn.innerHTML = PAUSE_ICON;
    }
  };

  const setActiveRowIcon = (icon) => {
    if (activeAyahNumberRef.current == null) return;
    const el = document.querySelector(`[data-ayah-row="${activeAyahNumberRef.current}"] [data-play-btn]`);
    if (el) el.innerHTML = icon;
  };

  const togglePlayAll = () => {
    if (playing) {
      setPlaying(false);
      playingRef.current = false;
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.pause();
      setActiveRowIcon(PLAY_ICON);
    } else {
      if (!audioMix.recite && !audioMix.translate && !audioMix.tafsir) {
        toast.error("Enable at least one audio option (Recite / Translate / Tafsir)");
        return;
      }
      if (currentIdxRef.current !== -1) {
        setPlaying(true);
        playingRef.current = true;
        if (audioRef.current) audioRef.current.play().catch(() => {});
        window.speechSynthesis.resume();
        setActiveRowIcon(PAUSE_ICON);
      } else {
        bismillahPlayedRef.current = false;
        playFromIndex(0);
      }
    }
  };

  // Download current ayah audio
  const handleDownload = () => {
    const ayah = data?.ayahs[currentIdxRef.current >= 0 ? currentIdxRef.current : 0];
    const url = ayah?.audio;
    if (!url) { toast.error("No audio available to download"); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.englishName}-ayah-${ayah.number}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${data.englishName} Ayah ${ayah.number}`);
    setIsAudioMenuOpen(false);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('deenguide:speed', String(speed));
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const handleVolumeChange = (vol) => {
    setVolume(vol);
    localStorage.setItem('deenguide:volume', String(vol));
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const cycleRepeat = (mode) => {
    setRepeatMode(mode);
    localStorage.setItem('deenguide:repeat', mode);
  };

  const playSingle = (idx) => {
    if (currentIdxRef.current === idx && playing) {
      setPlaying(false);
      playingRef.current = false;
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.pause();
      setActiveRowIcon(PLAY_ICON);
    } else if (currentIdxRef.current === idx && !playing) {
      setPlaying(true);
      playingRef.current = true;
      if (audioRef.current) audioRef.current.play().catch(() => {});
      window.speechSynthesis.resume();
      setActiveRowIcon(PAUSE_ICON);
    } else {
      stopPlayback();
      bismillahPlayedRef.current = true;
      singleModeRef.current = false;
      playFromIndex(idx);
    }
  };

  const playOnlyOne = (idx) => {
    if (currentIdxRef.current === idx && playing) {
      setPlaying(false);
      playingRef.current = false;
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.pause();
      setActiveRowIcon(PLAY_ICON);
    } else if (currentIdxRef.current === idx && !playing) {
      setPlaying(true);
      playingRef.current = true;
      if (audioRef.current) audioRef.current.play().catch(() => {});
      window.speechSynthesis.resume();
      setActiveRowIcon(PAUSE_ICON);
    } else {
      stopPlayback();
      bismillahPlayedRef.current = true;
      singleModeRef.current = true;
      playFromIndex(idx);
    }
  };

  const handleReciterChange = (val) => {
    setReciter(val);
    localStorage.setItem(RECITER_KEY, val);
  };
  const handleTranslationChange = (val) => {
    setTranslationEditions(val);
    localStorage.setItem(TRANSLATION_KEY, JSON.stringify(val));
  };

  const num = parseInt(number, 10);
  const primaryId = Number(translationEditions[0]);
  const selectedTranslation = editions.find((e) => Number(e.id) === primaryId) 
    || POPULAR_FALLBACK.find((e) => Number(e.id) === primaryId);
  
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
    <TooltipProvider>
      <>
        {/* Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-[320px] max-w-[85vw] h-full bg-card border-r border-border shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <Link to="/quran" className="flex items-center gap-3 font-bold text-foreground text-[16px] hover:text-[#178b50]">
                <ArrowLeft className="h-5 w-5" /> All Surahs
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-4 pt-4 pb-0 border-b border-border/40">
              <div className="flex gap-6 text-[14px] font-semibold mb-0">
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
                  <div className="p-4 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search Surah"
                        className="w-full bg-background border border-border/60 rounded-full pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#178b50] transition-shadow placeholder:text-muted-foreground/70"
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
                          className={`flex items-center gap-4 px-5 py-3 text-[14px] font-semibold transition-colors ${
                            s.number === num
                              ? 'bg-[#178b50]/15 text-foreground'
                              : 'text-foreground/80 hover:bg-accent/40 hover:text-foreground'
                          }`}
                        >
                          <span className={`w-6 text-[13px] shrink-0 ${s.number === num ? 'text-[#178b50] font-bold' : 'text-muted-foreground font-medium'}`}>{s.number}</span>
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
                  <div className="grid grid-cols-5 gap-2">
                    {juzsList.map((j) => (
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
                        className="aspect-square flex items-center justify-center rounded-lg border border-border/50 bg-accent/20 text-[13px] font-medium text-foreground hover:bg-[#178b50]/15 hover:border-[#178b50]/50 hover:text-[#178b50] transition-all"
                      >
                        {j.juz_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sidebarTab === 'page' && (
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-2">
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
                        className="aspect-square flex items-center justify-center rounded-lg border border-border/50 bg-accent/20 text-[13px] font-medium text-foreground hover:bg-[#178b50]/15 hover:border-[#178b50]/50 hover:text-[#178b50] transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-6">
                    <div>
                      <h3 className="font-heading font-bold text-3xl text-foreground">{data.englishName}</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">{data.englishNameTranslation}</p>
                    </div>
                    <h1 className="font-arabic text-[44px] leading-none text-foreground drop-shadow-sm" dir="rtl">
                      {data.name}
                    </h1>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border/50 bg-accent/5 p-3 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Surah No.</p>
                      <p className="text-lg font-bold text-foreground mt-1">{data.number}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-accent/5 p-3 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Verses</p>
                      <p className="text-lg font-bold text-foreground mt-1">{data.versesCount || data.ayahs?.length || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-accent/5 p-3 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revelation Place</p>
                      <p className="text-lg font-bold text-foreground mt-1">{data.revelationType || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-accent/5 p-3 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revelation Order</p>
                      <p className="text-lg font-bold text-foreground mt-1">{data.revelationOrder || "—"}</p>
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
                          className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed font-medium 
                            [&_h2]:font-bold [&_h2]:text-primary [&_h2]:text-[16px] [&_h2]:mt-7 [&_h2]:mb-2
                            prose-p:mt-0 prose-p:mb-4"
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

      {/* Settings Sidebar */}
      <SettingsSidebar 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
        settings={{
          fontSize,
          translationFontSize,
          arabicScript,
          autoScroll,
          reciter,
          translationEditions,
          volume,
          playbackSpeed,
          theme,
          wbwSettings
        }}
        onUpdateSetting={onUpdateSetting}
        reciters={reciters}
        translations={editions}
      />

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
              <div ref={scrollBarRef} className="absolute bottom-0 left-0 h-[3px] bg-[#178b50] transition-all duration-75 ease-out" style={{ width: '0%' }} />
            </div>

            {/* Top Header (Static, disappears on scroll) */}
            <div className="-mt-4 sm:-mt-8 mb-4 relative">
              <div className="flex items-center justify-between mb-3 sm:mb-0.5">
                <button onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-1 text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors focus:outline-none tracking-tight">
                  {data.number}. {data.englishName} <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70 ml-2" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-muted-foreground hover:bg-accent/50 rounded-full transition-colors">
                  <Settings className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex border-b border-border/40 text-[13px] font-bold relative">
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
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 font-bold text-[13px]">
            {/* Listen Button */}
            <button 
              onClick={togglePlayAll} 
              className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2 hover:bg-accent/40 transition-all shadow-sm hover:shadow-md text-foreground"
            >
              {playing ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary fill-primary/20" />} 
              {playing ? "Pause" : "Listen"}
            </button>
            
            {viewMode === "reading" ? (
              <>
                {/* Arabic Toggle */}
                <button 
                  onClick={() => setReadingView("arabic")} 
                  className={`px-5 py-2 rounded-full border transition-all shadow-sm ${readingView === "arabic" ? "bg-background border-primary text-[#178b50] ring-1 ring-primary/20" : "bg-background/50 border-border/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
                >
                  Arabic
                </button>

                {/* Translation Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      if (readingView !== "translation") {
                        setReadingView("translation");
                      } else {
                        setIsSettingsOpen(true);
                        setTimeout(() => setSettingsTab('translation'), 50);
                      }
                    }} 
                    className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all shadow-sm ${readingView === "translation" ? "bg-background border-primary text-[#178b50] ring-1 ring-primary/20" : "bg-background/50 border-border/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
                  >
                    Translation: 
                <span className="truncate max-w-[120px] font-medium">
                  {selectedTranslation ? (selectedTranslation.author_name || selectedTranslation.name) : (editions.length === 0 ? "..." : "Translation")}
                  {translationEditions.length > 1 && ` +${translationEditions.length - 1}`}
                </span>
                    <ChevronDown className="h-3 w-3" onClick={(e) => { e.stopPropagation(); setIsTranslationDropdownOpen(!isTranslationDropdownOpen); }} />
                  </button>
                  
                  {isTranslationDropdownOpen && readingView === "translation" && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsTranslationDropdownOpen(false)} />
                      <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[320px] bg-card border border-border/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 border-b border-border/40 mb-2">
                          <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">My Translations</span>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto scroll-thin">
                          <div className="max-h-[250px] overflow-y-auto scroll-thin">
                            {editions.filter(e => translationEditions.includes(e.id) || [20, 97, 14, 85].includes(e.id)).slice(0, 8).map(e => (
                              <button
                                key={e.id}
                                onClick={() => {
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
              </>
            ) : (
              <button 
                onClick={() => { setIsSettingsOpen(true); setTimeout(() => setSettingsTab('translation'), 50); }}
                className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-border/50 rounded-full px-5 py-2 hover:bg-accent/40 transition-all shadow-sm hover:shadow-md text-muted-foreground hover:text-foreground"
              >
                Translation: 
                <span className="text-foreground font-medium">
                  {selectedTranslation ? (selectedTranslation.author_name || selectedTranslation.name) : (editions.length === 0 ? "..." : "Translation")}
                  {translationEditions.length > 1 && ` +${translationEditions.length - 1}`}
                </span>
              </button>
            )}
          </div>

          {/* Surah Title Header */}
          <div className="flex items-center justify-center gap-8 mb-10 sm:mb-16">
            <h1 className="font-arabic text-[48px] sm:text-[64px] leading-none text-foreground drop-shadow-sm" dir="rtl">
              {data.name}
            </h1>
            <div className="flex flex-col items-start gap-[2px]">
              <div className="flex items-center gap-2.5">
                <span className="text-[20px] sm:text-[22px] font-medium text-foreground">{data.number}. {data.englishName}</span>
                <button onClick={openSurahInfo} className="rounded-full bg-[#35b5a7] hover:bg-[#2b968a] text-white px-[8px] py-[1px] text-[11px] font-medium lowercase transition-colors cursor-pointer">info</button>
              </div>
              <p className="text-[15px] sm:text-[16px] text-[#7a818c] font-normal">{data.englishNameTranslation}</p>
            </div>
          </div>



          {/* Bismillah Header (if not Surah 1 or 9) */}
          {data.number !== 1 && data.number !== 9 && (
            <div className="mb-8 mt-3 text-center">
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
            <div className="space-y-6 mt-2">
              {data.ayahs.map((a, idx) => {
                const bkId = `${data.number}:${a.number}`;
                const saved = isBookmarked("ayahs", bkId);
                return (
                  <div
                    key={a.number}
                    data-ayah-row={a.number}
                    className="pb-4 border-b border-border/30 last:border-0 transition-colors"
                  >
                    {/* Verse Header Controls */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-5 text-muted-foreground">
                        <span className="text-[14px] font-bold text-primary hover:underline cursor-pointer">{data.number}:{a.number}</span>
                        <button data-play-btn onClick={() => playSingle(idx)} className="text-foreground hover:text-primary transition-colors" title="Play Verse">
                          <Play className="h-5 w-5 fill-current" />
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
                        <button onClick={async () => { const text = `${a.arabic}\n\n${a.translation}\n\n— Surah ${data.englishName} ${data.number}:${a.number}\n\nhttps://deenguide-seven.vercel.app/quran/${data.number}#ayah=${a.number}`; if (navigator.share) { try { await navigator.share({ title: `Surah ${data.englishName} ${data.number}:${a.number}`, text }); return; } catch(_){} } navigator.clipboard.writeText(text); toast.success("Ayah copied!"); }} className="text-foreground hover:text-primary transition-colors" title="Share"><Share2 className="h-5 w-5" /></button>
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
                                  onClick={() => { setIsSettingsOpen(true); setTimeout(() => setSettingsTab('translation'), 50); setOpenMoreMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
                                >
                                  <MessageSquareText className="h-4 w-4" /> Translation
                                </button>
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
                                  onClick={() => { setTafsirPanelAyahNum(a.number); setTafsirPanelOpen(true); setOpenMoreMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-foreground hover:bg-accent/50 transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4" /> Reflections
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
                    <div className="mb-1 flex flex-wrap justify-start gap-x-1.5 gap-y-0.5 dir-rtl" dir="rtl">
                      {arabicScript === 'indopak' ? (
                         <div className="font-arabic leading-[1.9] text-foreground text-right" style={{ fontSize: getArabicFontSize() }}>
                           {a.indopak} <span className="inline-block relative text-primary mx-1" style={{ fontSize: `max(16px, calc(${getArabicFontSize()} * 0.6))` }}>﴾{a.number}﴿</span>
                         </div>
                      ) : (
                        a.words.map((w, i) => {
                          return (
                            <div 
                              key={w.id} 
                              id={`w-${idx}-${i}`}
                              className="group relative flex flex-col items-center justify-start cursor-pointer rounded-lg p-1 px-1.5 text-center hover:bg-accent/20"
                            >
                              <span 
                                className="font-arabic leading-[1.3] text-foreground" 
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
                          );
                        })
                      )}
                    </div>

                    {/* Translation Text */}
                    <div className="space-y-3">
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
                            <p className={`mt-1 text-[13px] text-muted-foreground italic ${isRTL ? 'text-right' : 'text-left'}`}>
                              — {edition?.author_name || edition?.name || "Translation"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
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
                    <div dir="rtl" className={`font-arabic leading-[1.9] text-foreground max-w-4xl mx-auto transition-all duration-300 ${data.number === 1 ? 'text-center' : 'text-justify'}`} style={{ textJustify: data.number === 1 ? 'none' : 'inter-word', fontSize: getArabicFontSize() }}>
                      {pageAyahs.map(a => {
                        const scriptText = arabicScript === 'tajweed' ? a.tajweed : (arabicScript === 'indopak' ? a.indopak : a.arabic);
                        // Strip verse-end markers from all script types
                        const cleanText = (scriptText || '')
                          .replace(/<span[^>]*class=end[^>]*>[^<]*<\/span>/gi, '')  // <span class=end>١</span>
                          .replace(/<span[^>]*class="end"[^>]*>[^<]*<\/span>/gi, '')  // <span class="end">١</span>
                          .replace(/<span[^>]*class='end'[^>]*>[^<]*<\/span>/gi, '')  // <span class='end'>١</span>
                          .replace(/\u06DD[\u0660-\u0669]+/g, '')  // ۝١٢٣ format
                          .replace(/\s+$/, '');
                        return (
                          <span key={a.number} data-ayah-row={a.number} className={data.number === 1 && a.number === 1 ? "block mb-6 text-center" : "inline"}>
                            <span dangerouslySetInnerHTML={{ __html: cleanText }} /> <span className="inline-block relative text-primary mx-1" style={{ fontSize: `max(16px, calc(${getArabicFontSize()} * 0.6))` }}>﴾{a.number}﴿</span>{" "}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    (() => {
                      const tFirst = pageAyahs[0]?.translations?.[0];
                      const isContainerRTL = tFirst && /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(tFirst.text);
                      return (
                        <div dir={isContainerRTL ? "rtl" : "ltr"} className={`leading-[1.8] text-foreground/90 max-w-4xl mx-auto transition-all duration-300 ${isContainerRTL ? "text-right font-arabic" : "text-left font-sans"} ${data.number === 1 ? 'text-center' : 'text-justify'}`} style={{ textJustify: data.number === 1 ? 'none' : 'inter-word', fontSize: getTranslationFontSize() }}>
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


      {/* Tafsir Modal */}
      <TafsirModal 
        isOpen={tafsirPanelOpen}
        onClose={() => setTafsirPanelOpen(false)}
        ayahNumber={tafsirPanelAyahNum}
        surahNumber={parseInt(data?.number, 10)}
        ayahData={data?.ayahs.find(a => a.number === tafsirPanelAyahNum)}
        onPlayAyah={(num) => {
          const idx = data?.ayahs.findIndex(a => a.number === num);
          if (idx !== -1) playOnlyOne(idx);
        }}
        onBookmarkAyah={(num) => {
          const bkId = `${data.number}:${num}`;
          const a = data?.ayahs.find(a => a.number === num);
          toggle('ayahs', { id: bkId, surah: data.number, surah_name: data.englishName, ayah: num, arabic: a?.arabic, translation: a?.translation });
        }}
        arabicScript={arabicScript}
        isPlaying={playing && currentIdxRef.current === (data?.ayahs.findIndex(a => a.number === tafsirPanelAyahNum) ?? -1)}
      />

      {/* Sticky Audio Player */}
      {isAudioPlayerVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/60 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
            {/* Progress Bar */}
            <div 
              className="relative w-full h-1.5 bg-accent cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (audioRef.current && audioRef.current.duration) {
                  audioRef.current.currentTime = percent * audioRef.current.duration;
                  // Update DOM directly
                  if (progressBarRef.current) progressBarRef.current.style.width = `${percent * 100}%`;
                  if (progressThumbRef.current) progressThumbRef.current.style.left = `calc(${percent * 100}% - 6px)`;
                }
              }}
            >
              <div 
                ref={progressBarRef}
                className="absolute top-0 left-0 h-full bg-foreground transition-[width] duration-75 ease-out"
                style={{ width: '0%' }}
              />
              <div 
                ref={progressThumbRef}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: 'calc(0% - 6px)' }}
              />
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              {/* Time Tracker */}
              <div ref={timeTextRef} className="text-[12px] font-bold text-muted-foreground w-[60px]">
                00:00
              </div>

            {/* Main Controls */}
            <div className="flex items-center gap-6 sm:gap-10">
              <div className="relative">
<Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)} 
                    className="p-2 text-foreground hover:bg-accent rounded-full transition-colors"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Options</TooltipContent>
              </Tooltip>
                
                {/* Audio Menu Dropdown */}
                {isAudioMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setIsAudioMenuOpen(false); setAudioMenuPanel(null); }} />
                    <div className="absolute bottom-full left-0 mb-4 w-[300px] bg-card border border-border/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.18)] z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 origin-bottom-left overflow-hidden"
                      style={{ maxHeight: 'min(420px, calc(100vh - 120px))', overflowY: 'auto' }}>

                      {/* ── Main Menu ── */}
                      {!audioMenuPanel && (
                        <div className="py-2">
                          {/* Download */}
                          <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                            <Download className="h-4 w-4 text-muted-foreground" /> Download
                          </button>
                          {/* Repeat */}
                          <button onClick={() => setAudioMenuPanel('repeat')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3"><RefreshCw className="h-4 w-4 text-muted-foreground" /> Manage repeat settings</div>
                            <div className="flex items-center gap-1">
                              <span className="text-[12px] font-semibold text-primary capitalize">{repeatMode === 'off' ? '' : repeatMode === 'one' ? '1' : '∞'}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                          <div className="my-1 border-t border-border/40" />
                          {/* Experience (Volume) */}
                          <button onClick={() => setAudioMenuPanel('experience')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3"><Zap className="h-4 w-4 text-muted-foreground" /> Experience</div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {/* Speed */}
                          <button onClick={() => setAudioMenuPanel('speed')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3"><span className="text-[13px] font-bold text-muted-foreground w-4">{playbackSpeed}x</span> Speed</div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {/* Reciter */}
                          <button onClick={() => setAudioMenuPanel('reciter')} className="w-full flex items-center justify-between px-4 py-3 text-[14px] text-foreground hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> Reciter</div>
                            <div className="flex items-center gap-1">
                              <span className="text-[12px] text-muted-foreground truncate max-w-[80px]">{reciters.find(r => r.id === reciter)?.reciter_name || reciters.find(r => r.id === reciter)?.name || ''}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        </div>
                      )}

                      {/* ── Repeat Sub-Panel ── */}
                      {audioMenuPanel === 'repeat' && (
                        <div>
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                            <button onClick={() => setAudioMenuPanel(null)} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" /></button>
                            <div className="flex-1 text-center -ml-5">
                              <div className="text-[15px] font-bold">Repeat Settings</div>
                              <div className="text-[12px] text-muted-foreground">{data ? `Surah ${data.englishName}` : ''}</div>
                            </div>
                          </div>
                          <div className="flex mx-4 mt-3 bg-accent/30 rounded-full p-1 gap-0.5">
                            {[['single','Single Verse'],['range','Range of verses'],['full','Full Surah']].map(([tab,label]) => (
                              <button key={tab} onClick={() => { setRepeatTab(tab); localStorage.setItem('deenguide:repeat-tab', tab); }}
                                className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all ${repeatTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
                            ))}
                          </div>
                          <div className="px-4 pt-3 pb-1">
                            {repeatTab === 'single' && (
                              <div className="flex items-center gap-2 bg-accent/20 rounded-lg px-3 py-2 border border-border/40">
                                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-[14px] font-medium">{data ? `${data.number}:${currentIdxRef.current >= 0 ? data.ayahs[currentIdxRef.current]?.number ?? 1 : 1}` : '1:1'}</span>
                              </div>
                            )}
                            {repeatTab === 'range' && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-[10px] font-bold text-muted-foreground mb-1">From Verse:</div>
                                  <div className="flex items-center gap-1.5 bg-accent/20 rounded-lg px-2.5 py-1.5 border border-border/40">
                                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-[13px] font-medium">{data ? `${data.number}:${currentIdxRef.current >= 0 ? data.ayahs[currentIdxRef.current]?.number ?? 1 : 1}` : '1:1'}</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="text-[10px] font-bold text-muted-foreground mb-1">To Verse:</div>
                                  <div className="flex items-center gap-1.5 bg-accent/20 rounded-lg px-2.5 py-1.5 border border-border/40">
                                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-[13px] font-medium">{data ? `${data.number}:${data.ayahs.length}` : '1:7'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-border/40 mx-4 mt-2" />
                          <div className="px-4 py-1 space-y-0">
                            {[['Play range', repeatPlayRange, (v) => { setRepeatPlayRange(v); localStorage.setItem('deenguide:repeat-play-range', v); }],
                              ['Repeat each verse', repeatEachVerse, (v) => { setRepeatEachVerse(v); localStorage.setItem('deenguide:repeat-each-verse', v); }],
                              ['Delay between verse', repeatDelayBetween, (v) => { setRepeatDelayBetween(v); localStorage.setItem('deenguide:repeat-delay-between', v); }],
                            ].map(([label, value, setter]) => (
                              <div key={label} className="flex items-center justify-between py-2.5">
                                <span className="text-[13px] font-medium text-foreground">{label}</span>
                                <div className="flex items-center gap-3">
                                  <button onClick={() => setter(Math.max(1, value - 1))} className="w-6 h-6 flex items-center justify-center text-foreground hover:text-primary text-lg">—</button>
                                  <span className="text-[14px] font-bold w-4 text-center">{value}</span>
                                  <button onClick={() => setter(value + 1)} className="w-6 h-6 flex items-center justify-center text-foreground hover:text-primary text-lg">+</button>
                                  <span className="text-[12px] text-muted-foreground">times</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center border-t border-border/40">
                            <button onClick={() => { setAudioMenuPanel(null); setIsAudioMenuOpen(false); }}
                              className="flex-1 py-3 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors border-r border-border/40">Cancel</button>
                            <button onClick={() => {
                              const mode = repeatTab === 'single' ? 'one' : 'all';
                              cycleRepeat(mode);
                              setAudioMenuPanel(null); setIsAudioMenuOpen(false);
                              const startIdx = currentIdxRef.current >= 0 ? currentIdxRef.current : 0;
                              stopPlayback(); bismillahPlayedRef.current = true; playFromIndex(startIdx);
                            }} className="flex-1 py-3 text-[14px] font-bold text-[#178b50] hover:bg-[#178b50]/5 transition-colors">Start Playing</button>
                          </div>
                        </div>
                      )}

                      {/* ── Speed Sub-Panel ── */}
                      {audioMenuPanel === 'speed' && (
                        <div className="py-2">
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 mb-1">
                            <button onClick={() => setAudioMenuPanel(null)} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" /></button>
                            <span className="text-[14px] font-bold">Playback Speed</span>
                          </div>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button key={speed} onClick={() => handleSpeedChange(speed)} className={`w-full flex items-center justify-between px-4 py-3 text-[14px] transition-colors ${playbackSpeed === speed ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-accent/50'}`}>
                              <span>{speed === 1 ? 'Normal (1x)' : `${speed}x`}</span>
                              {playbackSpeed === speed && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ── Experience Sub-Panel ── */}
                      {audioMenuPanel === 'experience' && (
                        <div>
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                            <button onClick={() => setAudioMenuPanel(null)} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" /></button>
                            <span className="text-[14px] font-bold">Experience</span>
                          </div>
                          <div className="px-5 py-4 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const n = !autoScroll; setAutoScroll(n); localStorage.setItem('deenguide:auto-scroll', String(n)); }}>
                              <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-colors shrink-0 ${autoScroll ? 'bg-foreground border-foreground' : 'border-border/60'}`}>
                                {autoScroll && <svg className="w-2.5 h-2.5 text-background" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span className="text-[14px] font-medium text-foreground">Auto Scroll</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer" onClick={() => { const n = !tooltipOnPlay; setTooltipOnPlay(n); localStorage.setItem('deenguide:tooltip-on-play', String(n)); }}>
                              <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-colors shrink-0 ${tooltipOnPlay ? 'bg-foreground border-foreground' : 'border-border/60'}`}>
                                {tooltipOnPlay && <svg className="w-2.5 h-2.5 text-background" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span className="text-[14px] font-medium text-foreground">Show tooltip when playing audio</span>
                            </label>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Displaying: Translation<br/>Change the content displayed under Settings &gt; Word By Word
                            </p>
                            <div className="border-t border-border/40 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] font-semibold text-foreground flex items-center gap-2"><Volume2 className="h-4 w-4" /> Volume</span>
                                <span className="text-[13px] font-bold text-primary">{Math.round(volume * 100)}%</span>
                              </div>
                              <input type="range" min="0" max="1" step="0.05" value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className="w-full accent-primary h-1.5 rounded-full cursor-pointer" />
                              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                                <span>0%</span><span>50%</span><span>100%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Reciter Sub-Panel ── */}
                      {audioMenuPanel === 'reciter' && (
                        <div className="flex flex-col" style={{ maxHeight: '400px' }}>
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 shrink-0">
                            <button onClick={() => { setAudioMenuPanel(null); setReciterSearch(''); }} className="p-1 rounded hover:bg-accent"><ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" /></button>
                            <span className="text-[14px] font-bold">Select Reciter</span>
                          </div>
                          <div className="px-3 py-2 border-b border-border/40 shrink-0">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <input type="text" placeholder="Search reciters..." value={reciterSearch}
                                onChange={(e) => setReciterSearch(e.target.value)}
                                className="w-full bg-accent/20 border border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto py-1">
                            {reciters.filter(r => (r.reciter_name || r.name || '').toLowerCase().includes(reciterSearch.toLowerCase())).map(r => {
                              const isActive = r.id === reciter;
                              return (
                                <button key={r.id}
                                  onClick={() => { handleReciterChange(r.id); setAudioMenuPanel(null); setIsAudioMenuOpen(false); setReciterSearch(''); }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors text-left ${isActive ? 'bg-[#178b50]/10 text-[#178b50]' : 'text-foreground hover:bg-accent/40'}`}>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isActive ? 'bg-[#178b50] text-white' : 'bg-accent/50 text-muted-foreground'}`}>
                                    {(r.reciter_name || r.name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate flex-1">{r.reciter_name || r.name || `Reciter ${r.id}`}</span>
                                  {isActive && <div className="w-2 h-2 rounded-full bg-[#178b50] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>
              
              <div className="relative hidden sm:block">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsVolumeOpen(v => !v)}
                      className={`p-2 rounded-full transition-colors ${isVolumeOpen ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent'}`}
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Volume</TooltipContent>
                </Tooltip>
                {isVolumeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsVolumeOpen(false)} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 bg-card border border-border/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.18)] p-4 w-[200px] animate-in fade-in zoom-in-95 duration-150 origin-bottom">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[13px] font-semibold text-foreground flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> Volume</span>
                        <span className="text-[13px] font-bold text-primary">{Math.round(volume * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                        <span>0%</span><span>50%</span><span>100%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { if (currentIdxRef.current > 0) playFromIndex(currentIdxRef.current - 1); }}
                    disabled={currentIdxRef.current <= 0}
                    className={`p-2 rounded-full transition-colors ${currentIdxRef.current <= 0 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-foreground hover:bg-accent'}`}
                  >
                    <Rewind className="h-6 w-6 fill-current" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Previous Ayah</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={togglePlayAll} 
                    className="p-3 text-foreground hover:bg-accent rounded-full transition-colors"
                  >
                    {playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{playing ? 'Pause' : 'Play'}</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { if (data && currentIdxRef.current < data.ayahs.length - 1) playFromIndex(currentIdxRef.current + 1); }}
                    disabled={!data || currentIdxRef.current >= data.ayahs.length - 1}
                    className={`p-2 rounded-full transition-colors ${!data || currentIdxRef.current >= data.ayahs.length - 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-foreground hover:bg-accent'}`}
                  >
                    <FastForward className="h-6 w-6 fill-current" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Next Ayah</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => {
                      stopPlayback();
                      setIsAudioPlayerVisible(false);
                    }} 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Close Player</TooltipContent>
              </Tooltip>
            </div>

            {/* Total Duration */}
            <div ref={durationTextRef} className="text-[12px] font-bold text-muted-foreground w-[60px] text-right">
              00:00
            </div>
          </div>
        </div>
      )}
    </div>
    </>
    </TooltipProvider>
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
