import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RotateCcw, Check, ChevronDown, Palette } from "lucide-react";
import { Link } from "react-router-dom";

// Authentic Tasbih from Quran & Sunnah only
const PRESETS = [
  // After every Salah (Sahih Muslim 595)
  { label: "SubhanAllah", arabic: "سُبْحَانَ اللّٰهِ", target: 33, ref: "After Salah · Muslim 595" },
  { label: "Alhamdulillah", arabic: "الْحَمْدُ لِلّٰهِ", target: 33, ref: "After Salah · Muslim 595" },
  { label: "Allahu Akbar", arabic: "اللّٰهُ أَكْبَرُ", target: 34, ref: "After Salah · Muslim 595" },

  // SubhanAllahi wa bihamdihi (Bukhari 6405)
  { label: "SubhanAllahi wa bihamdihi", arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ", target: 100, ref: "Bukhari 6405 · Sins forgiven" },

  // SubhanAllahil Azeem (Bukhari 6406)
  { label: "SubhanAllahil Azeem wa bihamdihi", arabic: "سُبْحَانَ اللّٰهِ الْعَظِيمِ وَبِحَمْدِهِ", target: 100, ref: "Bukhari 6406 · Heavy on scales" },

  // Astaghfirullah (Abu Dawud 1516)
  { label: "Astaghfirullah", arabic: "أَسْتَغْفِرُ اللّٰهَ", target: 100, ref: "Abu Dawud 1516 · Seeking forgiveness" },

  // La ilaha illallah (Tirmidhi 3534)
  { label: "La ilaha illallah", arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ", target: 100, ref: "Tirmidhi 3534 · Best dhikr" },

  // La hawla wala quwwata illa billah (Bukhari 4205)
  { label: "La hawla wala quwwata illa billah", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ", target: 100, ref: "Bukhari 4205 · Treasure of Jannah" },

  // Subhanallahi wal hamdulillahi (Muslim 2137)
  { label: "SubhanAllahi wal hamdulillahi wa la ilaha illallahu wallahu akbar", arabic: "سُبْحَانَ اللّٰهِ وَالْحَمْدُ لِلّٰهِ وَلَا إِلٰهَ إِلَّا اللّٰهُ وَاللّٰهُ أَكْبَرُ", target: 100, ref: "Muslim 2137 · Beloved words to Allah" },

  // Sayyidul Istighfar (Bukhari 6306)
  { label: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduk...", arabic: "اللّٰهُمَّ أَنْتَ رَبِّي لَا إِلٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ", target: 3, ref: "Bukhari 6306 · Sayyidul Istighfar" },

  // Hasbunallahu wa ni'mal wakeel (Quran 3:173)
  { label: "Hasbunallahu wa ni'mal wakeel", arabic: "حَسْبُنَا اللّٰهُ وَنِعْمَ الْوَكِيلُ", target: 100, ref: "Quran 3:173 · Sufficient is Allah" },

  // La ilaha illallahu wahdahu (Muslim 2693)
  { label: "La ilaha illallahu wahdahu la sharika lah, lahul mulku wa lahul hamdu wa huwa 'ala kulli shai'in qadeer", arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", target: 100, ref: "Muslim 2693 · 100x daily" },

  // Salawat upon the Prophet ﷺ (Muslim 408)
  { label: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad", arabic: "اللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ", target: 100, ref: "Muslim 408 · 10 blessings each" },
];

const TARGETS = [3, 7, 10, 33, 34, 99, 100, 200, 500, 1000];

// Background themes with scenic SVG elements
const BACKGROUNDS = [
  {
    id: "sunset",
    name: "Sunset",
    gradient: "linear-gradient(180deg, #e8837c 0%, #d4728a 25%, #c46897 50%, #d4728a 75%, #e8837c 100%)",
    showStars: false,
    showSun: true,
    sunColor: "#ffcc70",
    sunGlow: "#ffa06080",
    mountainColor: "#0d0d0d",
    textColor: "white",
  },
  {
    id: "forest",
    name: "Forest",
    gradient: "linear-gradient(180deg, #3d7a7a 0%, #4a8f8f 20%, #5a9f9f 40%, #4a8888 60%, #3a7070 80%, #2d5f5f 100%)",
    showStars: false,
    showSun: false,
    showTrees: true,
    mountainColor: "#1a3a3a",
    treeColor: "#1a4040",
    treeDarkColor: "#0f2d2d",
    grassColor: "#2d5a4a",
    textColor: "white",
  },
  {
    id: "night",
    name: "Night Sky",
    gradient: "linear-gradient(180deg, #0f1b3d 0%, #152244 30%, #1a2a50 50%, #1f3060 70%, #152244 100%)",
    showStars: true,
    showSun: false,
    starColor: "#ffffff",
    mountainColor: "#0a1020",
    textColor: "white",
  },
  {
    id: "dawn",
    name: "Dawn",
    gradient: "linear-gradient(180deg, #2d1b4e 0%, #6b3fa0 20%, #c76b8a 50%, #f0a070 75%, #ffd194 100%)",
    showStars: false,
    showSun: true,
    sunColor: "#ffe0a0",
    sunGlow: "#ffb06060",
    mountainColor: "#1a0f2e",
    textColor: "white",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    gradient: "linear-gradient(180deg, #1a3a5c 0%, #1e4a6e 25%, #2a6090 50%, #1e4a6e 75%, #142d45 100%)",
    showStars: true,
    showSun: false,
    starColor: "#a0d0ff",
    mountainColor: "#0a1a2e",
    textColor: "white",
  },
  {
    id: "emerald",
    name: "Emerald Night",
    gradient: "linear-gradient(180deg, #0a1f15 0%, #0f3020 25%, #15402a 50%, #0f3020 75%, #0a1f15 100%)",
    showStars: true,
    showSun: false,
    starColor: "#90eeb0",
    showTrees: true,
    mountainColor: "#050f0a",
    treeColor: "#0a2015",
    treeDarkColor: "#05150d",
    grassColor: "#103020",
    textColor: "white",
  },
];

// SVG scene components for each background type
function SunsetScene({ bg }) {
  return (
    <>
      {/* Sun orb with glow */}
      <div className="absolute" style={{ right: "10%", bottom: "28%", width: 160, height: 160 }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${bg.sunGlow} 0%, transparent 70%)`,
            transform: "scale(2)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, #fff8e0 0%, ${bg.sunColor} 50%, ${bg.sunColor}90 100%)`,
          }}
        />
      </div>
      {/* Wavy mountain silhouette at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 400 100" className="w-full" preserveAspectRatio="none" style={{ height: "140px" }}>
          <path
            d="M0,100 L0,55 Q40,35 80,50 Q120,65 160,40 Q200,18 240,45 Q280,65 320,35 Q360,15 400,40 L400,100 Z"
            fill={bg.mountainColor}
          />
        </svg>
      </div>
    </>
  );
}

function ForestScene({ bg }) {
  return (
    <>
      {/* Trees and foliage silhouettes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left side trees */}
        <svg viewBox="0 0 200 500" className="absolute left-0 top-0 h-full" style={{ width: "35%", opacity: 0.7 }}>
          {/* Tall pine tree */}
          <polygon points="60,80 30,250 90,250" fill={bg.treeDarkColor} />
          <polygon points="60,120 35,230 85,230" fill={bg.treeColor} />
          <rect x="55" y="250" width="10" height="30" fill={bg.treeDarkColor} />
          {/* Leafy tree */}
          <circle cx="140" cy="150" r="50" fill={bg.treeColor} />
          <circle cx="160" cy="130" r="40" fill={bg.treeDarkColor} />
          <rect x="145" y="195" width="8" height="40" fill={bg.treeDarkColor} />
          {/* Small bush */}
          <ellipse cx="40" cy="300" rx="40" ry="25" fill={bg.treeColor} />
        </svg>
        {/* Right side trees */}
        <svg viewBox="0 0 200 500" className="absolute right-0 top-0 h-full" style={{ width: "35%", opacity: 0.6 }}>
          <polygon points="100,50 60,280 140,280" fill={bg.treeDarkColor} />
          <polygon points="100,100 70,260 130,260" fill={bg.treeColor} />
          <circle cx="50" cy="200" r="45" fill={bg.treeColor} />
          <rect x="95" y="280" width="10" height="30" fill={bg.treeDarkColor} />
        </svg>
      </div>
      {/* Grass / foliage at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 400 120" className="w-full" preserveAspectRatio="none" style={{ height: "150px" }}>
          {/* Rolling hills */}
          <path
            d="M0,120 L0,70 Q30,45 60,65 Q90,80 120,55 Q150,35 180,60 Q210,80 240,50 Q270,30 300,55 Q330,75 360,45 Q380,30 400,50 L400,120 Z"
            fill={bg.mountainColor}
          />
          {/* Grass tufts */}
          <path
            d="M0,120 L0,85 Q20,75 35,85 Q45,70 55,82 Q70,68 85,80 Q95,72 110,82 Q125,68 140,80 Q155,72 170,82 Q180,68 195,80 Q210,72 225,82 Q235,68 250,80 Q265,72 280,82 Q290,68 305,80 Q320,72 335,82 Q345,68 360,80 Q375,72 390,82 L400,85 L400,120 Z"
            fill={bg.grassColor}
          />
        </svg>
      </div>
    </>
  );
}

function NightScene({ bg }) {
  return (
    <div className="absolute bottom-0 left-0 right-0">
      <svg viewBox="0 0 400 100" className="w-full" preserveAspectRatio="none" style={{ height: "140px" }}>
        <path
          d="M0,100 L0,60 Q50,40 100,55 Q150,70 200,45 Q250,25 300,50 Q350,65 400,40 L400,100 Z"
          fill={bg.mountainColor}
        />
        <path
          d="M0,100 L0,75 Q60,60 120,72 Q180,82 240,65 Q300,50 360,68 L400,60 L400,100 Z"
          fill={bg.mountainColor}
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

export default function TasbihCounter() {
  const [preset, setPreset] = useState(() => {
    const saved = localStorage.getItem("dg_tasbih_preset");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [count, setCount] = useState(0);
  const [loop, setLoop] = useState(0);
  const [target, setTarget] = useState(() => PRESETS[parseInt(localStorage.getItem("dg_tasbih_preset") || "0", 10)]?.target || 33);
  const [showPresets, setShowPresets] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgIndex, setBgIndex] = useState(() => {
    const saved = localStorage.getItem("dg_tasbih_bg");
    return saved ? parseInt(saved, 10) : 4; // Default to Ocean Blue instead of Sunset
  });
  const [ripple, setRipple] = useState(false);
  const dropdownRef = useRef(null);

  const currentPreset = PRESETS[preset] || PRESETS[0];
  const currentBg = BACKGROUNDS[bgIndex] || BACKGROUNDS[0];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    };
    if (showPresets) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPresets]);

  const handleTap = useCallback(() => {
    if (showPresets || showBgPicker) return; // Don't count while menus are open

    setRipple(true);
    setTimeout(() => setRipple(false), 300);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);

    setCount((prev) => {
      const next = prev + 1;
      if (next >= target) {
        setLoop((l) => l + 1);
        return 0;
      }
      return next;
    });
  }, [target, showPresets, showBgPicker]);

  const handleReset = () => {
    setCount(0);
    setLoop(0);
  };

  const selectPreset = (i) => {
    setPreset(i);
    setTarget(PRESETS[i].target);
    setCount(0);
    setLoop(0);
    setShowPresets(false);
    localStorage.setItem("dg_tasbih_preset", String(i));
  };

  const selectBg = (i) => {
    setBgIndex(i);
    setShowBgPicker(false);
    localStorage.setItem("dg_tasbih_bg", String(i));
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (showPresets || showBgPicker) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTap, showPresets, showBgPicker]);

  const progress = target > 0 ? (count / target) * 100 : 0;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Generate stable star positions
  const [stars] = useState(() =>
    Array.from({ length: 50 }).map(() => ({
      w: Math.random() * 3 + 1,
      left: Math.random() * 100,
      top: Math.random() * 60,
      opacity: Math.random() * 0.7 + 0.2,
      dur: 2 + Math.random() * 3,
      delay: Math.random() * 3,
    }))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: currentBg.gradient }}
    >
      {/* Stars (only for themes that show stars) */}
      {currentBg.showStars && (
        <div className="pointer-events-none absolute inset-0">
          {stars.map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: s.w,
                height: s.w,
                left: `${s.left}%`,
                top: `${s.top}%`,
                opacity: s.opacity,
                backgroundColor: currentBg.starColor || "white",
                animation: `twinkle ${s.dur}s ease-in-out infinite`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Scene elements based on theme */}
      <div className="pointer-events-none absolute inset-0">
        {currentBg.showSun && <SunsetScene bg={currentBg} />}
        {currentBg.showTrees && <ForestScene bg={currentBg} />}
        {!currentBg.showSun && !currentBg.showTrees && <NightScene bg={currentBg} />}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-4">
        <Link to="/more" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-lg font-semibold text-white">Tasbih</h1>
        {/* Background picker button */}
        <button
          onClick={() => { setShowBgPicker(!showBgPicker); setShowPresets(false); }}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
        >
          <Palette className="h-5 w-5" />
        </button>
      </div>

      {/* Background picker dropdown */}
      {showBgPicker && (
        <div className="relative z-30 mx-auto w-64 rounded-2xl border border-white/10 bg-black/80 p-2 shadow-2xl backdrop-blur-xl">
          {BACKGROUNDS.map((bg, i) => (
            <button
              key={bg.id}
              onClick={() => selectBg(i)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                i === bgIndex ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div
                className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                style={{ background: bg.gradient }}
              />
              <span className="text-sm">{bg.name}</span>
              {i === bgIndex && <Check className="ml-auto h-4 w-4 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}

      {/* Dhikr selector */}
      <div className="relative z-20 px-4 pt-2 text-center" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPresets(!showPresets);
            setShowBgPicker(false);
          }}
          className="inline-flex w-full max-w-[320px] items-center justify-center gap-3 rounded-3xl bg-white/10 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
        >
          <span className="font-arabic text-lg leading-relaxed whitespace-normal break-words text-center flex-1">{currentPreset.arabic}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${showPresets ? "rotate-180" : ""}`} />
        </button>
        <p className="mt-2 text-xs text-white/60 mx-auto max-w-[300px] leading-relaxed">{currentPreset.label}</p>

        {showPresets && (
          <div className="absolute left-1/2 z-30 mt-4 w-[90%] max-w-[360px] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-[#16162c]/80 shadow-2xl backdrop-blur-2xl">
            {/* Header row with Target/Loop/Reset */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <select
                value={target}
                onChange={(e) => { setTarget(Number(e.target.value)); setCount(0); setLoop(0); }}
                className="appearance-none rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white focus:outline-none"
              >
                {TARGETS.map((t) => (
                  <option key={t} value={t} className="bg-[#1a1a3e] text-white">{t}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-2 text-white/50">
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="text-sm font-medium">Loop {loop}</span>
              </div>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Reset
              </button>
            </div>
            
            {/* Presets List */}
            <div className="max-h-[45vh] overflow-y-auto py-2 scroll-thin">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectPreset(i);
                  }}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition ${
                    i === preset ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="font-arabic text-xl leading-relaxed text-white block">{p.arabic}</span>
                    <span className="text-[10px] text-emerald-400/80 block mt-1">{p.ref}</span>
                  </div>
                  <span className="text-sm font-bold text-white/60 shrink-0">{p.target}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Target & Loop */}
      <div className={`relative z-10 mt-6 flex items-center justify-center gap-8 px-6 transition-opacity duration-200 ${showPresets ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="relative">
          <select
            value={target}
            onChange={(e) => { setTarget(Number(e.target.value)); setCount(0); setLoop(0); }}
            className="appearance-none rounded-full bg-white/10 px-4 py-2 pr-8 text-sm font-semibold text-white backdrop-blur focus:outline-none"
          >
            {TARGETS.map((t) => (
              <option key={t} value={t} className="bg-[#1a1a3e] text-white">{t}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="text-sm font-medium">Loop {loop}</span>
        </div>
        <button
          onClick={handleReset}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
        >
          Reset
        </button>
      </div>

      {/* Counter circle */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <button
          onClick={handleTap}
          className="group relative grid h-72 w-72 place-items-center rounded-full sm:h-80 sm:w-80"
          aria-label="Tap to count"
        >
          {/* Progress ring */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <circle
              cx="150" cy="150" r="140"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
          </svg>

          {/* Ripple */}
          {ripple && (
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-white/20" style={{ animationDuration: "0.4s", animationIterationCount: 1 }} />
          )}

          {/* Count */}
          <span className="relative font-heading text-7xl font-bold text-white sm:text-8xl" style={{ textShadow: "0 0 40px rgba(255,255,255,0.3)" }}>
            {String(count).padStart(2, "0")}
          </span>
        </button>
      </div>

      {/* Tap hint */}
      <div className="relative z-10 pb-8 text-center">
        <p className="text-xs text-white/30">Tap the circle or press Space</p>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
