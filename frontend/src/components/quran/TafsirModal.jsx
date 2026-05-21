import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Bookmark, BookText, ChevronDown, Loader2, MessageCircle } from 'lucide-react';
import { quran } from '@/lib/api';
import { qurancom } from '@/lib/qurancom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VERIFIED_TAFSIRS = {
  English: [
    { id: 169, name: 'Ibn Kathir (Abridged)' },
    { id: 168, name: "Ma'arif al-Qur'an" },
    { id: 817, name: 'Tazkirul Quran' }
  ],
  Arabic: [
    { id: 15, name: 'Tafsir al-Tabari' },
    { id: 90, name: 'Al-Qurtubi' },
    { id: 16, name: 'Tafsir Muyassar' },
    { id: 91, name: "Al-Sa'di" },
    { id: 93, name: 'Al-Tafsir al-Wasit (Tantawi)' },
    { id: 94, name: 'Tafseer Al-Baghawi' },
    { id: 14, name: 'Tafsir Ibn Kathir' }
  ],
  Urdu: [
    { id: 160, name: 'Tafsir Ibn Kathir' },
    { id: 818, name: 'Tazkir ul Quran' },
    { id: 159, name: 'Bayan ul Quran' },
    { id: 157, name: 'Fi Zilal al-Quran' }
  ],
  Russian: [
    { id: 170, name: "Al-Sa'di" }
  ],
  Swahili: [
    { id: 231, name: 'Dr. Abdullah Muhammad Abu Bakr and Sheikh Nasir Khamis', type: 'translation' }
  ],
  Kurdish: [
    { id: 804, name: 'Rebar Kurdish Tafsir' }
  ]
};

export default function TafsirModal({ 
  isOpen, 
  onClose, 
  ayahNumber, 
  surahNumber, 
  ayahData,
  onPlayAyah,
  onBookmarkAyah,
  arabicScript = 'tajweed',
  isPlaying = false
}) {
  const [activeLang, setActiveLang] = useState('English');
  const [activeEdition, setActiveEdition] = useState(169);
  const [content, setContent] = useState({ loading: false, text: '' });
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('deenguide:tafsir-font-size') || '2'));
  const [showFontWidget, setShowFontWidget] = useState(false);

  useEffect(() => {
    if (isOpen && ayahNumber && surahNumber) {
      fetchTafsir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ayahNumber, surahNumber, activeEdition]);

  const fetchTafsir = async () => {
    setContent({ loading: true, text: '' });
    try {
      const edition = VERIFIED_TAFSIRS[activeLang].find(e => e.id === activeEdition);
      let text = '';
      
      if (edition?.type === 'translation') {
        // Handle special case (Swahili translation as Tafsir)
        const ayah = await qurancom.verse(surahNumber, ayahNumber, [edition.id]);
        text = ayah?.translations?.[0]?.text || 'Translation not found.';
      } else {
        // Standard Tafsir fetch directly from Quran.com v4
        const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${activeEdition}/by_ayah/${surahNumber}:${ayahNumber}?language=en`).then(r => r.json());
        text = res?.tafsir?.text || 'Tafsir content not available.';
      }
      
      setContent({ loading: false, text });
    } catch (err) {
      console.error('Tafsir Fetch Error:', err);
      setContent({ loading: false, text: 'Error loading Tafsir. Please try another edition.' });
    }
  };

  if (!isOpen) return null;

  const handleLangChange = (lang) => {
    setActiveLang(lang);
    setActiveEdition(VERIFIED_TAFSIRS[lang][0].id);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[95vw] max-w-[850px] h-[85vh] bg-card border border-border/60 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Tafsir</h2>
            <span className="text-muted-foreground font-medium">| {surahNumber}:{ayahNumber}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Ayah Reference Card */}
          <div className="px-8 py-6 border-b border-border/10 bg-accent/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-primary">{surahNumber}:{ayahNumber}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => onPlayAyah(ayahNumber)} className="text-muted-foreground hover:text-primary transition-colors">
                  {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                </button>
                <button onClick={() => onBookmarkAyah(ayahNumber)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
            {ayahData && (
              <div className="font-arabic text-[28px] sm:text-[32px] leading-[2.2] text-foreground text-right" dir="rtl">
                <span dangerouslySetInnerHTML={{ __html: (arabicScript === 'tajweed' ? ayahData.tajweed : (arabicScript === 'indopak' ? ayahData.indopak : ayahData.arabic) || '').replace(/<span[^>]*class=end[^>]*>.*?<\/span>/gi, '').replace(/<span[^>]*class="end"[^>]*>.*?<\/span>/gi, '').replace(/\u06DD[\u0660-\u0669]+/g, '').replace(/\s+$/, '') }} />
                <span className="text-primary text-[20px] mr-2">﴾{ayahNumber}﴿</span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border/10 px-6 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
            {/* Font Size Toggle */}
            <div className="flex items-center shrink-0">
              {showFontWidget ? (
                <div className="flex items-center gap-3 bg-accent/30 px-3 py-1.5 rounded-full text-[13px] font-bold border border-border/40 shadow-sm animate-in slide-in-from-left-2">
                  <span className="text-muted-foreground">Aa</span>
                  <button onClick={() => setFontSize(s => Math.max(1, s - 1))} className="hover:text-primary px-1">−</button>
                  <span className="w-4 text-center">{fontSize}</span>
                  <button onClick={() => setFontSize(s => Math.min(5, s + 1))} className="hover:text-primary px-1">+</button>
                  <button onClick={() => setShowFontWidget(false)} className="ml-1 text-muted-foreground"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button onClick={() => setShowFontWidget(true)} className="flex items-center gap-2 bg-accent/20 hover:bg-accent/40 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all">
                  Aa <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              )}
            </div>

            <div className="w-px h-6 bg-border/20 shrink-0 mx-1" />

            {/* Language Selector */}
            <div className="relative shrink-0">
              <Select value={activeLang} onValueChange={handleLangChange}>
                <SelectTrigger className="bg-accent/20 hover:bg-accent/40 px-4 py-1.5 h-auto rounded-full text-[13px] font-bold border-0 focus:ring-0 focus:ring-offset-0 shadow-none outline-none data-[state=open]:bg-accent/40 transition-all gap-2">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 shadow-xl min-w-[120px] bg-card z-[80]">
                  {Object.keys(VERIFIED_TAFSIRS).map(lang => (
                    <SelectItem key={lang} value={lang} className="text-[13px] font-semibold cursor-pointer rounded-lg mx-1 my-0.5 focus:bg-[#178b50]/10 focus:text-[#178b50]">
                      {lang === 'Russian' ? 'Русский' : lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edition Selection Pills */}
            <div className="flex items-center gap-2">
              {VERIFIED_TAFSIRS[activeLang].map(edition => (
                <button
                  key={edition.id}
                  onClick={() => setActiveEdition(edition.id)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                    activeEdition === edition.id 
                      ? 'bg-[#178b50] text-white' 
                      : 'bg-accent/20 hover:bg-accent/40 text-foreground'
                  }`}
                >
                  {edition.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tafsir Content */}
          <div className="px-8 py-10">
            {content.loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Fetching authentic tafsir...</p>
              </div>
            ) : (
              <div 
                className="prose prose-lg dark:prose-invert max-w-none font-sans leading-relaxed text-foreground/90"
                style={{ fontSize: `${14 + (fontSize * 2)}px` }}
                dangerouslySetInnerHTML={{ __html: content.text }}
              />
            )}
          </div>

          {/* Community Reflections from Quran Reflect (Quran Foundation Posts API) */}
          <ReflectionsSection surah={surahNumber} ayah={ayahNumber} />

          {/* Footer Navigation (Optional) */}
          <div className="px-8 py-6 border-t border-border/10 flex items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
             <BookText className="h-4 w-4" /> Scholarly verified content from Quran.com
          </div>
        </div>
      </div>
    </>
  );
}

// Community Reflections from Quran Reflect (Quran Foundation Posts API)
function ReflectionsSection({ surah, ayah }) {
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!surah || !ayah) return;
    setLoading(true);
    quran.reflections(surah, ayah)
      .then(data => {
        setReflections(data?.posts || []);
      })
      .finally(() => setLoading(false));
  }, [surah, ayah]);

  if (loading) return null;
  if (!reflections.length) return null;

  return (
    <div className="px-8 py-6 border-t border-border/20">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Community Reflections ({reflections.length})
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-4 space-y-4">
          {reflections.slice(0, 5).map((post, i) => (
            <div key={i} className="rounded-xl bg-accent/10 border border-border/30 p-4">
              <p className="text-[13px] leading-relaxed text-foreground/85">
                {(post.body || post.text || "").slice(0, 300)}{(post.body || post.text || "").length > 300 ? "..." : ""}
              </p>
              {post.author_name && (
                <p className="mt-2 text-[11px] text-muted-foreground font-medium">
                  — {post.author_name}
                </p>
              )}
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground text-center">
            Reflections from Quran Reflect · Quran Foundation
          </p>
        </div>
      )}
    </div>
  );
}
