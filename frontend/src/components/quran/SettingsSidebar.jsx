import React, { useState, useEffect } from 'react';
import { 
  X, Layout, Languages, Music, Sparkles, 
  ChevronDown, Check, Search, Volume2, 
  Zap, Info, Sun, Moon, Coffee, MessageSquareText 
} from 'lucide-react';

const POPULAR_FALLBACK = [
  { id: 131, author_name: "Dr. Mustafa Khattab", name: "The Clear Quran", language_name: "English" },
  { id: 20, author_name: "Saheeh International", name: "Saheeh International", language_name: "English" },
  { id: 85, author_name: "Muhsin Khan", name: "Muhsin Khan", language_name: "English" },
  { id: 95, author_name: "Maududi", name: "Tafhim-ul-Quran", language_name: "English" },
  { id: 14, author_name: "Yusuf Ali", name: "Yusuf Ali", language_name: "English" },
  { id: 57, author_name: "Transliteration", name: "Transliteration", language_name: "English" },
  { id: 97, author_name: "Pickthall", name: "Pickthall", language_name: "English" }
];

const ARABIC_SCRIPTS = [
  { id: 'tajweed', name: 'Uthmani (Tajweed)', description: 'Colored tajweed rules' },
  { id: 'uthmani', name: 'Uthmani (Simple)', description: 'Classic Madinah script' },
  { id: 'indopak', name: 'IndoPak', description: 'South Asian style script' }
];

const THEMES = [
  { id: 'light', name: 'Light', icon: Sun },
  { id: 'dark', name: 'Dark', icon: Moon },
  { id: 'sepia', name: 'Sepia', icon: Coffee }
];

export default function SettingsSidebar({ 
  isOpen, 
  onClose,
  settings,
  onUpdateSetting,
  reciters = [],
  translations = [],
  activeTab = 'display',
  onTabChange
}) {
  const [internalTab, setInternalTab] = useState('display');
  const currentTab = onTabChange ? activeTab : internalTab;
  const setTab = onTabChange || setInternalTab;
  
  const [searchReciter, setSearchReciter] = useState('');
  const [searchTranslation, setSearchTranslation] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const TABS = [
    { id: 'display', name: 'Display', icon: Layout },
    { id: 'translation', name: 'Translation', icon: MessageSquareText },
    { id: 'wbw', name: 'Word By Word', icon: Languages },
    { id: 'audio', name: 'Audio', icon: Music }
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed top-0 right-0 z-[70] h-full w-full max-w-[400px] bg-card border-l border-border/40 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20 shrink-0">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/10 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                currentTab === tab.id 
                  ? 'bg-[#178b50]/10 text-[#178b50]' 
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${currentTab === tab.id ? 'fill-current opacity-20' : ''}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${currentTab === tab.id ? 'text-[#178b50]' : ''}`}>
                {tab.name}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scroll-thin">
          
          {/* ── Display Tab ── */}
          {currentTab === 'display' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Preview Box */}
              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Preview</label>
                <div className="bg-accent/20 rounded-2xl p-6 border border-border/40 relative overflow-hidden">
                  
                  <div 
                    className="text-center font-arabic leading-[2.5] relative mt-6" 
                    style={{ fontSize: `${28 + ((settings.fontSize || 3) - 3) * 4}px` }}
                    dir="rtl"
                  >
                    {settings.arabicScript === 'tajweed' ? (
                      <span dangerouslySetInnerHTML={{ __html: 'بِسْمِ <tajweed class="ham_wasl">ٱ</tajweed>للَّهِ ' }} />
                    ) : settings.arabicScript === 'indopak' ? (
                      <span>بِسۡمِ اللهِ </span>
                    ) : (
                      <span>بِسْمِ ٱللَّهِ </span>
                    )}

                    <span className="relative inline-block">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col items-center font-sans" style={{ fontSize: '13px', lineHeight: 'normal' }} dir="ltr">
                        <div className="bg-[#2CA4AB] text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-sm">
                          the Most Gracious
                        </div>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#2CA4AB]"></div>
                      </div>
                      
                      {settings.arabicScript === 'tajweed' ? (
                        <span dangerouslySetInnerHTML={{ __html: '<tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّحْمَ<tajweed class="madda_normal">ـٰ</tajweed>نِ' }} />
                      ) : settings.arabicScript === 'indopak' ? (
                        <span className="text-[#2CA4AB]">الرَّحۡمٰنِ</span>
                      ) : (
                        <span className="text-[#2CA4AB]">ٱلرَّحْمَـٰنِ</span>
                      )}
                    </span>

                    {settings.arabicScript === 'tajweed' ? (
                      <span dangerouslySetInnerHTML={{ __html: ' <tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّح<tajweed class="madda_permissible">ِي</tajweed>مِ <span class="end">١</span>' }} />
                    ) : settings.arabicScript === 'indopak' ? (
                      <span> الرَّحِيۡمِ ۝١</span>
                    ) : (
                      <span> ٱلرَّحِيمِ ﴿١﴾</span>
                    )}
                  </div>

                  <div 
                    className="mt-6 text-foreground/80 leading-relaxed font-medium text-left"
                    style={{ fontSize: `${15 + ((settings.translationFontSize || 3) - 3) * 1}px` }}
                  >
                    In the Name of Allah—the Most Compassionate, Most Merciful.
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Arabic Script</label>
                <div className="space-y-2 mb-4">
                  {ARABIC_SCRIPTS.map(script => (
                    <button
                      key={script.id}
                      onClick={() => onUpdateSetting('arabicScript', script.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        settings.arabicScript === script.id 
                          ? 'border-[#178b50] bg-[#178b50]/5 ring-1 ring-[#178b50]/30' 
                          : 'border-border/40 hover:border-border hover:bg-accent/30'
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-[14px] font-bold">{script.name}</div>
                        <div className="text-[12px] text-muted-foreground">{script.description}</div>
                      </div>
                      {settings.arabicScript === script.id && <div className="w-5 h-5 rounded-full bg-[#178b50] flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
                    </button>
                  ))}
                </div>

                {settings.arabicScript === 'tajweed' && (
                  <div className="bg-accent/20 rounded-xl p-4 border border-border/40 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">Tajweed Colors</label>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      {[
                        { label: "Silent letter", color: "#9E9E9E" },
                        { label: "Normal madd (2)", color: "#D4A32B" },
                        { label: "Separated madd (2/4/6)", color: "#F57F20" },
                        { label: "Connected madd (4/5)", color: "#E50000" },
                        { label: "Necessary madd (6)", color: "#A70000" },
                        { label: "Ghunna/ikhfa'", color: "#1B9B1B" },
                        { label: "Qalqala (echo)", color: "#2CA4AB" },
                        { label: "Tafkhim (heavy)", color: "#4141E9" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-[11px] font-medium text-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Arabic Font Size</label>
                  <span className="text-[14px] font-bold text-primary">{settings.fontSize}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSetting('fontSize', parseInt(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Translation Font Size</label>
                  <span className="text-[14px] font-bold text-primary">{settings.translationFontSize}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={settings.translationFontSize}
                  onChange={(e) => onUpdateSetting('translationFontSize', parseInt(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ── Translation Tab ── */}
          {currentTab === 'translation' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search translations..." 
                  value={searchTranslation}
                  onChange={(e) => setSearchTranslation(e.target.value)}
                  className="w-full bg-accent/30 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Selected Translations</label>
                <div className="space-y-2">
                  {(() => {
                    const selected = settings.translationEditions.map(id => {
                      const found = translations.find(t => Number(t.id) === Number(id)) 
                                 || POPULAR_FALLBACK.find(t => Number(t.id) === Number(id));
                      return found ? found : { id: id, name: `Missing (#${id})`, author_name: `Edition #${id}`, language_name: "Unknown" };
                    });
                    if (selected.length === 0) return <div className="text-[13px] text-muted-foreground py-2 text-center bg-accent/20 rounded-xl border border-border/40 border-dashed">No translations selected</div>;
                    
                    return selected.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-[#178b50]/30 bg-[#178b50]/5">
                        <div>
                          <div className="text-[13px] font-bold">{t.name || t.author_name}</div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{t.language_name}</div>
                        </div>
                        <button 
                          onClick={() => {
                            const newEditions = settings.translationEditions.filter(id => id !== t.id);
                            onUpdateSetting('translationEditions', newEditions);
                          }}
                          className="p-1.5 hover:bg-[#178b50]/20 rounded-full text-[#178b50] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="border-t border-border/40 pt-6">
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Available Translations</label>
                <div className="space-y-4">
                  {(() => {
                    const unselected = translations.filter(t => !settings.translationEditions.includes(t.id));
                    const filtered = unselected.filter(t => 
                      (t.name || '').toLowerCase().includes(searchTranslation.toLowerCase()) ||
                      (t.author_name || '').toLowerCase().includes(searchTranslation.toLowerCase()) ||
                      (t.language_name || '').toLowerCase().includes(searchTranslation.toLowerCase())
                    );
                    
                    const grouped = {};
                    filtered.forEach(t => {
                      const lang = t.language_name ? t.language_name.charAt(0).toUpperCase() + t.language_name.slice(1).toLowerCase() : 'Other';
                      if (!grouped[lang]) grouped[lang] = [];
                      grouped[lang].push(t);
                    });
                    
                    const sortedLangs = Object.keys(grouped).sort((a, b) => {
                      if (a === 'English') return -1;
                      if (b === 'English') return 1;
                      if (a === 'Urdu') return -1;
                      if (b === 'Urdu') return 1;
                      return a.localeCompare(b);
                    });
                    
                    return sortedLangs.map(lang => (
                      <div key={lang}>
                        <h3 className="text-[14px] font-bold mb-3">{lang}</h3>
                        <div className="space-y-1">
                          {grouped[lang].map(t => {
                            const isSelected = settings.translationEditions.includes(t.id);
                            return (
                              <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 cursor-pointer transition-colors group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 group-hover:border-primary/50 bg-background'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      onUpdateSetting('translationEditions', [...settings.translationEditions, t.id]);
                                    } else {
                                      onUpdateSetting('translationEditions', settings.translationEditions.filter(id => id !== t.id));
                                    }
                                  }}
                                />
                                <div className="text-[13px] font-medium leading-tight">
                                  {t.name || t.author_name}
                                  {t.name && t.author_name && t.name !== t.author_name && (
                                    <span className="text-muted-foreground ml-1">({t.author_name})</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ── Word By Word Tab ── */}
          {currentTab === 'wbw' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-accent/20 rounded-2xl p-6 border border-border/40 relative overflow-hidden">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest absolute top-4 left-4">Preview</label>
                
                <div className="text-center font-arabic leading-[2.5] mt-6" style={{ fontSize: '32px' }} dir="rtl">
                  <span>بِسْمِ ٱللَّهِ </span>

                  <span className="relative inline-block">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col items-center font-sans" style={{ fontSize: '12px', lineHeight: 'normal' }} dir="ltr">
                      <div className="bg-[#2CA4AB] text-white font-bold px-2 py-1 rounded whitespace-nowrap shadow-sm">
                        the Most Gracious
                      </div>
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#2CA4AB]"></div>
                    </div>
                    
                    <span className="text-[#2CA4AB]">ٱلرَّحْمَـٰنِ</span>
                  </span>

                  <span> ٱلرَّحِيمِ ﴿١﴾</span>
                </div>
                <div className="mt-4 text-[14px] text-foreground/80 font-medium text-left">
                  In the Name of Allah—the Most Compassionate, Most Merciful.
                </div>
              </div>

              <div className="pt-4 space-y-2">
                {[
                  { id: 'translation', name: 'Translation' },
                  { id: 'transliteration', name: 'Transliteration' }
                ].map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => onUpdateSetting('wbwSettings', { ...settings.wbwSettings, [opt.id]: !settings.wbwSettings?.[opt.id] })}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      settings.wbwSettings?.[opt.id] 
                        ? 'border-[#178b50] bg-[#178b50]/5 ring-1 ring-[#178b50]/30' 
                        : 'border-border/40 hover:border-border hover:bg-accent/30'
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-[14px] font-bold">{opt.name}</div>
                    </div>
                    {settings.wbwSettings?.[opt.id] && (
                      <div className="w-5 h-5 rounded-full bg-[#178b50] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Audio Tab ── */}
          {currentTab === 'audio' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search reciters..." 
                  value={searchReciter}
                  onChange={(e) => setSearchReciter(e.target.value)}
                  className="w-full bg-accent/30 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Select Reciter</label>
                <div className="space-y-2">
                  {reciters
                    .filter(r => (r.reciter_name || r.name || '').toLowerCase().includes(searchReciter.toLowerCase()))
                    .map(r => (
                    <button
                      key={r.id}
                      onClick={() => onUpdateSetting('reciter', r.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        settings.reciter === r.id 
                          ? 'border-[#178b50] bg-[#178b50]/5 ring-1 ring-[#178b50]/30' 
                          : 'border-border/40 hover:border-border hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${
                          settings.reciter === r.id ? 'bg-[#178b50] text-white' : 'bg-accent/50 text-muted-foreground'
                        }`}>
                          {(r.reciter_name || r.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-bold">{r.reciter_name || r.name || `Reciter ${r.id}`}</span>
                      </div>
                      {settings.reciter === r.id && <div className="w-5 h-5 rounded-full bg-[#178b50] flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Volume2 className="h-4 w-4" /> Volume</label>
                  <span className="text-[14px] font-bold text-primary">{Math.round((settings.volume || 1) * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={settings.volume || 1}
                  onChange={(e) => onUpdateSetting('volume', parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Playback Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => onUpdateSetting('playbackSpeed', speed)}
                      className={`py-2 rounded-lg text-[13px] font-bold border transition-all ${
                        settings.playbackSpeed === speed 
                          ? 'border-[#178b50] bg-[#178b50]/10 text-[#178b50]' 
                          : 'border-border/40 hover:bg-accent/30'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/40 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Auto Scroll</label>
                  <button 
                    onClick={() => onUpdateSetting('autoScroll', !settings.autoScroll)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoScroll ? 'bg-primary' : 'bg-accent border border-border/60'}`}
                  >
                    <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${settings.autoScroll ? 'left-[26px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Automatically scroll down the page as the audio plays, keeping the current verse in focus.
                </p>
              </div>
            </div>
          )}



        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/20 bg-accent/5 shrink-0">
          <p className="text-[11px] text-muted-foreground text-center font-medium">
            Settings are automatically saved to your browser.
          </p>
        </div>
      </div>
    </>
  );
}
