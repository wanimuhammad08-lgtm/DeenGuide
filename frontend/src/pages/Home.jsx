import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, X, Loader2, LocateFixed, MessageSquareText, BookOpen, ScrollText, MapPinned, Compass } from "lucide-react";
import { toast } from "sonner";
import { calculatePrayerTimes, getCurrentPrayer } from "@/lib/prayerTimes";
import { gregorianToHijri, fetchTodayHijri, HIJRI_MONTHS } from "@/lib/hijriDate";

const DAILY_VERSES = [
  { text: "Indeed, this is a reminder, so whoever wills may take to his Lord a way.", ref: "Quran 73:19", link: "/quran/73#ayah=19" },
  { text: "And whoever relies upon Allah – then He is sufficient for him.", ref: "Quran 65:3", link: "/quran/65#ayah=3" },
  { text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", ref: "Quran 2:152", link: "/quran/2#ayah=152" },
  { text: "Verily, with hardship comes ease.", ref: "Quran 94:6", link: "/quran/94#ayah=6" },
  { text: "And He found you lost and guided you.", ref: "Quran 93:7", link: "/quran/93#ayah=7" },
  { text: "Allah does not burden a soul beyond that it can bear.", ref: "Quran 2:286", link: "/quran/2#ayah=286" },
  { text: "And when My servants ask you concerning Me – indeed I am near.", ref: "Quran 2:186", link: "/quran/2#ayah=186" },
];

const DAILY_DUAS = [
  { text: "How perfect Allah is, all praise is for Allah, and Allah is the greatest. None has the right to be worshipped except Allah, alone, without any partner.", ref: "Muslim 1/418", link: "/hadith?q=Muslim 1/418" },
  { text: "O Allah, I ask You for forgiveness and well-being in this world and the Hereafter.", ref: "Abu Dawud 5074", link: "/hadith?q=Abu Dawud 5074" },
  { text: "O Allah, make me among those who, when they do good, feel pleased, and when they do evil, seek forgiveness.", ref: "Ahmad 1/62", link: "/hadith?q=Ahmad 1/62" },
  { text: "Our Lord, give us in this world that which is good and in the Hereafter that which is good and protect us from the punishment of the Fire.", ref: "Quran 2:201", link: "/quran/2#ayah=201" },
  { text: "O Allah, guide me and make me steadfast. Remember me of what I have forgotten.", ref: "Tirmidhi 3522", link: "/hadith?q=Tirmidhi 3522" },
  { text: "O Allah, I take refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice.", ref: "Bukhari 6369", link: "/hadith?q=Bukhari 6369" },
  { text: "O Allah, You are my Lord. There is no god but You. You created me and I am Your servant.", ref: "Bukhari 6306", link: "/hadith?q=Bukhari 6306" },
];

const QuranIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <rect x="6" y="4" width="26" height="30" rx="3" fill="#2E7D32"/>
    <rect x="8" y="6" width="22" height="26" rx="2" fill="#43A047"/>
    <rect x="11" y="10" width="16" height="2" rx="1" fill="white" opacity="0.8"/>
    <rect x="11" y="14" width="12" height="2" rx="1" fill="white" opacity="0.6"/>
    <rect x="11" y="18" width="14" height="2" rx="1" fill="white" opacity="0.6"/>
    <rect x="11" y="22" width="10" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="6" y="4" width="3" height="30" rx="1.5" fill="#1B5E20"/>
  </svg>
);
const TasbihIcon = ({ size = 24, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={props.style?.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="8" opacity="0.3" />
    {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
      <circle key={a} cx={12+8*Math.cos(a*Math.PI/180)} cy={12+8*Math.sin(a*Math.PI/180)} r="1.5" fill={color} stroke="none" />
    ))}
    <path d="M12 4 V1" strokeWidth="1.5" />
  </svg>
);
const QiblaIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <rect x="12" y="12" width="14" height="14" rx="1" fill="#1B4D3E"/>
    <rect x="14" y="14" width="10" height="10" fill="#2D6A5A"/>
    <rect x="15" y="22" width="8" height="5" fill="#0D2B22"/>
    <polygon points="19,4 21,12 17,12" fill="#E8A952"/>
    <polygon points="19,34 17,26 21,26" fill="#6B7280"/>
    <polygon points="4,19 12,17 12,21" fill="#6B7280"/>
    <polygon points="34,19 26,21 26,17" fill="#6B7280"/>
  </svg>
);
const PrayerIcon2 = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <path d="M19 6 C13 6 8 11 8 18 C8 25 13 30 19 30 C25 30 30 25 30 18 C30 11 25 6 19 6Z" fill="#6A1B9A" opacity="0.15"/>
    <path d="M10 22 Q14 10 19 8 Q24 10 28 22" fill="#7B1FA2"/>
    <rect x="17" y="8" width="4" height="14" rx="2" fill="white" opacity="0.9"/>
    <rect x="19" y="18" width="8" height="3" rx="1.5" fill="white" opacity="0.9"/>
    <circle cx="26" cy="8" r="4" fill="#CE93D8"/>
    <path d="M24 7 Q26 5 28 7 Q27 10 26 10 Q25 10 24 7Z" fill="#9C27B0"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <rect x="5" y="10" width="28" height="22" rx="3" fill="#3949AB"/>
    <rect x="5" y="10" width="28" height="8" rx="3" fill="#283593"/>
    <rect x="5" y="15" width="28" height="3" fill="#283593"/>
    <rect x="12" y="6" width="3" height="8" rx="1.5" fill="#5C6BC0"/>
    <rect x="23" y="6" width="3" height="8" rx="1.5" fill="#5C6BC0"/>
    <rect x="9" y="22" width="4" height="3" rx="1" fill="white" opacity="0.7"/>
    <rect x="17" y="22" width="4" height="3" rx="1" fill="white" opacity="0.7"/>
    <rect x="25" y="22" width="4" height="3" rx="1" fill="white" opacity="0.7"/>
    <path d="M27 8 Q30 5 33 8 Q31 13 29.5 13 Q28 13 27 8Z" fill="#E8A952"/>
  </svg>
);
const AllahIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <circle cx="19" cy="19" r="16" fill="#880E4F" opacity="0.12"/>
    <text x="19" y="25" textAnchor="middle" fontFamily="Amiri Quran,serif" fontSize="20" fill="#880E4F" fontWeight="bold">الله</text>
  </svg>
);

const AiIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <circle cx="19" cy="19" r="15" fill="#0284c7" opacity="0.1"/>
    <path d="M12 14C12 12.8954 12.8954 12 14 12H24C25.1046 12 26 12.8954 26 14V22C26 23.1046 25.1046 24 24 24H19L15 27V24H14C12.8954 24 12 23.1046 12 22V14Z" fill="#0ea5e9"/>
    <path d="M16 16H22M16 19H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const HadithIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <path d="M12 6C12 4.89543 12.8954 4 14 4H28V28H14C12.8954 28 12 27.1046 12 26V6Z" fill="#c2410c"/>
    <path d="M10 6C10 4.89543 10.8954 4 12 4H14V28H12C10.8954 28 10 27.1046 10 26V6Z" fill="#9a3412"/>
    <rect x="16" y="9" width="8" height="2" rx="1" fill="white" opacity="0.7"/>
    <rect x="16" y="13" width="6" height="2" rx="1" fill="white" opacity="0.5"/>
  </svg>
);
const MosqueIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <path d="M19 6C15 6 11 9 11 14V20H27V14C27 9 23 6 19 6Z" fill="#059669"/>
    <rect x="8" y="20" width="22" height="10" fill="#10b981"/>
    <path d="M17 30V24C17 22.8954 17.8954 22 19 22C20.1046 22 21 22.8954 21 24V30" fill="#065f46"/>
    <circle cx="19" cy="3.5" r="1" fill="#F59E0B"/>
  </svg>
);

const EXPLORE_ITEMS = [
  { to: "/ask", label: "Ask AI", Icon: MessageSquareText, color: "#F0F9FF", gradient: "linear-gradient(135deg, #38BDF8, #0284C7)" },
  { to: "/quran", label: "Quran", Icon: BookOpen, color: "#ECFDF5", gradient: "linear-gradient(135deg, #34D399, #059669)" },
  { to: "/hadith", label: "Hadith", Icon: ScrollText, color: "#FFF7ED", gradient: "linear-gradient(135deg, #FDBA74, #EA580C)" },
  { to: "https://www.google.com/maps/search/?api=1&query=mosques+near+me", label: "Mosques", Icon: MapPinned, color: "#FDF2F8", gradient: "linear-gradient(135deg, #F472B6, #DB2777)" },
  { to: "/more/tasbih", label: "Tasbih", Icon: TasbihIcon, color: "#FFFBEB", gradient: "linear-gradient(135deg, #FCD34D, #D97706)" },
  { to: "/more/qibla", label: "Qibla", Icon: Compass, color: "#F5F3FF", gradient: "linear-gradient(135deg, #A78BFA, #7C3AED)" },
];

function getTimezone() { return -new Date().getTimezoneOffset() / 60; }

function toMs(hours, date) {
  if (isNaN(hours)) return null;
  const fixHour = (h) => ((h % 24) + 24) % 24;
  const h = fixHour(hours);
  const d = new Date(date);
  d.setHours(Math.floor(h), Math.round((h - Math.floor(h)) * 60), 0, 0);
  return d.getTime();
}

function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function ShareSection() {
  const [showImpact, setShowImpact] = useState(false);
  const [shareCount, setShareCount] = useState(() => parseInt(localStorage.getItem("dg_share_count") || "0"));

  const handleShare = async () => {
    const count = shareCount + 1;
    setShareCount(count);
    localStorage.setItem("dg_share_count", String(count));
    const text = "🕌 DeenGuide — A free Islamic app with Quran, Prayer Times, Duas, Qibla, AI guidance and more.\n\nJoin thousands growing in deen. Download now: https://deenguide.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: "DeenGuide", text, url: "https://deenguide.app" });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Link copied! Share it with your friends.");
      }
    } catch {}
    setShowImpact(true);
  };

  const reached = shareCount * 7;

  return (
    <div style={{ background:"#F5F0E8", borderRadius:16, padding:"16px", border:"1px solid #EDE8E0", position:"relative" }}>
      <p style={{ fontSize:11, color:"#6B7280", fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Share DeenGuide</p>

      {/* Decorative circles */}
      <div style={{ position:"absolute", top:12, right:14, display:"flex", gap:4 }}>
        {["#D4943A","#BF8040","#8BAE8A"].map((c,i)=>(
          <div key={i} style={{ width:28, height:28, borderRadius:"50%", background:c, opacity:0.55, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:12 }}>✓</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize:15, color:"#1B4D3E", fontWeight:700, lineHeight:1.5, maxWidth:"80%", marginBottom:12 }}>
        DeenGuide is a free Islamic app. Share it with your friends and family to earn hasanah and benefit the whole ummah.
      </p>

      {/* Hadith card */}
      <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
        <span style={{ background:"#1B4D3E", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, display:"inline-block", marginBottom:8 }}>Sahih</span>
        <p style={{ fontSize:13, color:"#374151", lineHeight:1.65, margin:0 }}>
          The Prophet ﷺ said: <em>'Whoever guides someone to goodness will have a reward like the one who did it.'</em>
        </p>
        <p style={{ fontSize:11, color:"#9CA3AF", marginTop:6 }}>Sahih Muslim, Book 20, Hadith 4665</p>
      </div>



      <button
        onClick={handleShare}
        style={{
          width:"100%", background:"#1B4D3E", color:"#fff",
          border:"none", borderRadius:50, padding:"14px",
          fontSize:15, fontWeight:700, cursor:"pointer",
          boxShadow:"0 4px 12px rgba(27,77,62,0.3)",
          transition:"transform 0.15s, box-shadow 0.15s"
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 18px rgba(27,77,62,0.4)"}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 12px rgba(27,77,62,0.3)"}}
      >
        {showImpact ? "Share Again 🤲" : "Share Now"}
      </button>
    </div>
  );
}

const PRAYER_DISPLAY = ["fajr","dhuhr","asr","maghrib","isha"];

export default function Home() {
  const [location, setLocation] = useState(() => {
    const s = localStorage.getItem("dg_location");
    return s ? JSON.parse(s) : null;
  });
  const [locationName, setLocationName] = useState(() => localStorage.getItem("dg_location_name") || "Locating...");
  const [now, setNow] = useState(Date.now());
  const [countdown, setCountdown] = useState("00:00:00");
  const [hijriToday, setHijriToday] = useState(() => {
    const d = new Date();
    return gregorianToHijri(d.getFullYear(), d.getMonth()+1, d.getDate());
  });

  // Manual location modal state
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [isForbiddenModalOpen, setIsForbiddenModalOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState([]);
  const [isLocSearching, setIsLocSearching] = useState(false);

  // Auto-search when typing (Debounced)
  useEffect(() => {
    if (!isLocModalOpen) return;
    if (!locQuery.trim()) {
      setLocResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLocSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locQuery)}&format=json&limit=5`);
        const data = await res.json();
        setLocResults((data || []).map(d => ({
          display: d.display_name,
          short: d.name || d.display_name.split(',')[0],
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon)
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLocSearching(false);
      }
    }, 400); // 400ms debounce to prevent excessive rate-limiting hits

    return () => clearTimeout(timer);
  }, [locQuery, isLocModalOpen]);

  const handleManualLocationSearch = (e) => {
    e?.preventDefault(); // prevent explicit form reloads
  };

  const selectLocation = (name, lat, lng) => {
    const loc = { lat, lng };
    setLocation(loc);
    setLocationName(name);
    localStorage.setItem("dg_location", JSON.stringify(loc));
    localStorage.setItem("dg_location_name", name);
    setIsLocModalOpen(false);
    toast.success(`Location set to ${name}`);
  };

  const resetToAutoLocation = () => {
    localStorage.removeItem("dg_location");
    localStorage.removeItem("dg_location_name");
    setLocation(null);
    setLocationName("Locating...");
    setIsLocModalOpen(false);
    toast.info("Retrying automatic location detection...");
  };

  const today = useMemo(() => new Date(), []);
  const tz = getTimezone();

  const calcMethod = localStorage.getItem("dg_calc_method") || "karachi";
  const juristicMethod = localStorage.getItem("dg_juristic") || "shafi";

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(today, location.lat, location.lng, tz, calcMethod, juristicMethod);
  }, [location, today, tz, calcMethod, juristicMethod]);

  const { current, next } = useMemo(() => {
    if (!times) return { current: null, next: null };
    return getCurrentPrayer(times);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, now]);

  const cardTheme = useMemo(() => {
    const base = {
      bg: "linear-gradient(135deg, #F5C47A 0%, #E8A952 60%, #D4943A 100%)",
      text: "#1B3028",
      shadow: "rgba(212,148,58,0.35)",
      progressBg: "rgba(27,48,40,0.2)",
      progressFill: "#1B4D3E",
      iconOpacity: 0.25
    };

    if (!current) return base;

    switch(current) {
      case "fajr":
      case "sunrise":
        return {
          bg: "linear-gradient(135deg, #29323c 0%, #485563 100%)", // Dawn Cool
          text: "#FFFFFF",
          shadow: "rgba(41,50,60,0.3)",
          progressBg: "rgba(255,255,255,0.2)",
          progressFill: "#F5C47A",
          iconOpacity: 0.15
        };
      case "dhuhr":
        return {
          bg: "linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)", // Warm Sun
          text: "#4A2C2A",
          shadow: "rgba(252,182,159,0.4)",
          progressBg: "rgba(74,44,42,0.2)",
          progressFill: "#E67E22",
          iconOpacity: 0.2
        };
      case "asr":
        return base; // Traditional Golden Asr
      case "maghrib":
        return {
          bg: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", // Sunset
          text: "#FFFFFF",
          shadow: "rgba(255,75,43,0.35)",
          progressBg: "rgba(255,255,255,0.2)",
          progressFill: "#FFFFFF",
          iconOpacity: 0.15
        };
      case "isha":
      case "qiyam":
      default:
        // Nighttime
        const hour = new Date().getHours();
        if (hour >= 20 || hour < 4) {
          return {
            bg: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)", // Midnight Sky
            text: "#FFFFFF",
            shadow: "rgba(15,32,39,0.4)",
            progressBg: "rgba(255,255,255,0.15)",
            progressFill: "#1ABC9C",
            iconOpacity: 0.15
          };
        }
        return base;
    }
  }, [current]);

  const duaReminder = useMemo(() => {
    const base = {
      title: "Durood Sharif reminder",
      text: "Send Salawat upon the Prophet ﷺ today for immense reward.",
      icon: "✨",
      link: "/duas/topic/how_to_recite_blessings_on_the_prophet_after_the_tashahhud"
    };
    if (!current) return base;
    
    const isFriday = today.getDay() === 5;

    switch(current) {
      case "fajr":
      case "sunrise":
        return {
          title: "Morning Adhkar",
          text: "Protect your day by reciting the authentic morning supplications.",
          icon: "🌅",
          link: "/duas/topic/words_of_remembrance_for_morning_and_evening"
        };
      case "dhuhr":
      case "asr":
        if (isFriday) {
          return {
            title: "Friday Sunnah",
            text: "It is the Day of Jumu'ah! Don't forget to recite blessings and Surah Al-Kahf.",
            icon: "🕌",
            link: "/quran/18"
          };
        }
        return base;
      case "maghrib":
        return {
          title: "Evening Adhkar",
          text: "Guard your night by reciting the essential evening supplications.",
          icon: "🌇",
          link: "/duas/topic/words_of_remembrance_for_morning_and_evening"
        };
      case "isha":
      case "qiyam":
      default:
        const hour = new Date().getHours();
        if (hour >= 20 || hour < 4) {
          return {
            title: "Before Sleeping",
            text: "Recite the protective Adhkar before sleeping to invite the angels to guard you.",
            icon: "🌙",
            link: "/duas/topic/what_to_say_before_sleeping"
          };
        }
        return base;
    }
  }, [current, today]);

  // Geolocation
  useEffect(() => {
    if (location) return;
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(loc);
      localStorage.setItem("dg_location", JSON.stringify(loc));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
        const data = await res.json();
        const name = data.address?.city || data.address?.town || data.address?.county || "My Location";
        setLocationName(name);
        localStorage.setItem("dg_location_name", name);
      } catch { setLocationName("My Location"); }
    }, () => setLocationName("Location unavailable"));
  }, [location]);

  // Hijri date
  useEffect(() => {
    if (!location) return;
    fetchTodayHijri(location.lat, location.lng).then(r => setHijriToday({ year: r.year, month: r.month, day: r.day })).catch(() => {});
  }, [location]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Countdown to next prayer
  useEffect(() => {
    if (!times || !next) return;
    let nextMs = times[next]?.ms;
    if (!nextMs) return;
    
    // If the next prayer's MS from current day's calculation falls behind NOW,
    // it must wrap into the next continuous temporal day (e.g. Qiyam past midnight).
    if (nextMs < Date.now()) {
      nextMs += 24 * 3600000;
    }
    
    const diff = nextMs - Date.now();
    setCountdown(fmtCountdown(diff > 0 ? diff : 0));
  }, [now, times, next]);

  const hijriStr = `${hijriToday.day} ${HIJRI_MONTHS[hijriToday.month - 1]}, ${hijriToday.year}`;
  const dayIdx = today.getDay();
  const isFriday = dayIdx === 5;
  const verseIdx = today.getDate() % DAILY_VERSES.length;
  const duaIdx = (today.getDate() + 3) % DAILY_DUAS.length;

  const currentPrayer = times && current ? times[current] : null;
  const nextPrayer = times && next ? times[next] : null;

  // Progress bar between current and next prayer
  const progress = useMemo(() => {
    if (!currentPrayer?.ms || !nextPrayer?.ms) return 0;
    
    let cMs = currentPrayer.ms;
    let nMs = nextPrayer.ms;

    // Corrective temporal offsets:
    // 1. If current time dictates current prayer calculation is in future relative to clock, shift cMs to yesterday.
    if (cMs > now) cMs -= 24 * 3600000;
    // 2. If nextMs calculation is less than cMs, shift nMs to tomorrow.
    if (nMs < cMs) nMs += 24 * 3600000;

    const total = nMs - cMs;
    const elapsed = now - cMs;
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [now, currentPrayer, nextPrayer]);

  // Special times
  const suhurEnd = times?.fajr?.time || "--:--";
  const iftar = times?.maghrib?.time || "--:--";
  const tahajjudMs = times ? (() => {
    const maghribMs = times.maghrib?.ms;
    const fajrMs = times.fajr?.ms;
    if (!maghribMs || !fajrMs) return null;
    const night = fajrMs + 24*3600000 - maghribMs;
    return fajrMs + 24*3600000 - night / 3;
  })() : null;
  const tahajjudTime = tahajjudMs ? new Date(tahajjudMs).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";

  // Forbidden windows (approx)
  const sunriseStart = times?.sunrise?.time || "--:--";
  const sunriseEnd = times?.sunrise?.ms ? new Date(times.sunrise.ms + 15*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const noonStart = times?.dhuhr?.ms ? new Date(times.dhuhr.ms - 5*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const noonEnd = times?.dhuhr?.time || "--:--";
  const sunsetStart = times?.maghrib?.ms ? new Date(times.maghrib.ms - 15*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const sunsetEnd = times?.maghrib?.time || "--:--";

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      {/* Header */}
      <div className="pt-1 pb-2 flex items-center justify-between">
        <div>
          <div style={{ fontFamily: "Amiri Quran, serif", fontSize: 28, color: "#1B4D3E", lineHeight: 1.2 }}>
            السلام عليكم
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{hijriStr}</div>
          <button
            onClick={() => { setIsLocModalOpen(true); setLocQuery(""); setLocResults([]); }}
            style={{ display:"flex", alignItems:"center", gap:4, color:"#1B4D3E", fontSize:12, fontWeight:600, marginTop:2, background:"none", border:"none", cursor:"pointer", padding:0 }}
          >
            <MapPin size={12} /> {locationName}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Prayer Time Card */}
        <Link to="/prayer-times" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background: cardTheme.bg,
            borderRadius: 22, padding: "22px 20px 18px", position: "relative", overflow: "hidden",
            boxShadow: `0 10px 25px ${cardTheme.shadow}`,
            transition: "transform 0.2s, box-shadow 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.01)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {/* Kaaba SVG illustration */}
            <div style={{ position:"absolute", right:-10, bottom:-5, opacity: cardTheme.iconOpacity, pointerEvents:"none", transition: "opacity 0.3s" }}>
              <svg width="110" height="100" viewBox="0 0 110 100" fill="none">
                <rect x="20" y="30" width="60" height="55" rx="3" fill="#1B4D3E"/>
                <rect x="28" y="50" width="20" height="35" fill="#0D2B22"/>
                <rect x="30" y="20" width="8" height="15" fill="#1B4D3E"/>
                <rect x="72" y="20" width="8" height="15" fill="#1B4D3E"/>
                <rect x="15" y="25" width="80" height="8" rx="2" fill="#2D6A5A"/>
                <rect x="20" y="55" width="60" height="4" fill="#2D6A5A" opacity="0.6"/>
                {/* Palm tree */}
                <line x1="95" y1="85" x2="95" y2="55" stroke="#1B4D3E" strokeWidth="3"/>
                <ellipse cx="91" cy="52" rx="8" ry="5" fill="#1B4D3E" transform="rotate(-20 91 52)"/>
                <ellipse cx="99" cy="50" rx="8" ry="4" fill="#1B4D3E" transform="rotate(15 99 50)"/>
                <ellipse cx="95" cy="48" rx="7" ry="4" fill="#1B4D3E"/>
              </svg>
            </div>

            {/* Current & Next Row */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div style={{ fontSize:13, color: cardTheme.text, fontWeight:600, opacity:0.75 }}>
                  {currentPrayer?.time || "--:--"}
                </div>
                <div style={{ fontSize:19, color: cardTheme.text, fontWeight:800 }}>
                  {currentPrayer?.name || "Prayer"}
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize:13, color: cardTheme.text, fontWeight:600, opacity:0.75 }}>
                  {nextPrayer?.time || "--:--"}
                </div>
                <div style={{ fontSize:15, color: cardTheme.text, fontWeight:700 }}>
                  {nextPrayer?.name || "Next"}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:5, background: cardTheme.progressBg, borderRadius:10, margin:"10px 0" }}>
              <div style={{ height:"100%", width:`${progress}%`, background: cardTheme.progressFill, borderRadius:10, transition:"width 1s linear" }} />
            </div>

            {/* Countdown */}
            <div style={{ fontSize:38, fontWeight:700, color: cardTheme.text, letterSpacing:2, fontVariantNumeric:"tabular-nums", fontFamily:"Outfit,sans-serif", marginTop:6 }}>
              {times ? countdown : "00:00:00"}
            </div>
            <div style={{ fontSize:12, color: cardTheme.text, opacity:0.75, marginTop:2 }}>
              until {nextPrayer?.name || "next prayer"}
            </div>
          </div>
        </Link>

        {/* Dynamic Dua/Adhkar Reminder */}
        <Link to={duaReminder.link} style={{ textDecoration: "none", display: "block" }}>
          <div style={{ 
            background:"#fff", borderRadius:16, padding:"14px 16px", border:"1px solid #EDE8E0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div className="flex items-start justify-between gap-3">
              <div style={{ fontSize:14, color:"#374151", lineHeight:1.55 }}>
                <p style={{ fontWeight: 700, color: "#1B4D3E", fontSize: 13, marginBottom: 3, textTransform: "uppercase", tracking: "0.05em" }}>
                  {duaReminder.title}
                </p>
                {duaReminder.text}
              </div>
              <span style={{ fontSize:22 }}>{duaReminder.icon}</span>
            </div>
            <div style={{ color:"#2BAE96", fontSize:13, fontWeight:700, display:"flex", alignItems: "center", gap: 4, marginTop:8 }}>
              Tap to read <span style={{ fontSize:15 }}>→</span>
            </div>
          </div>
        </Link>

        {/* Explore */}
        <div>
          <p style={{ fontSize:13, color:"#6B7280", fontWeight:600, marginBottom:10 }}>Explore</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {EXPLORE_ITEMS.map((item) => {
              const isExternal = item.to.startsWith("http");
              const inner = (
                <>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 700, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{
                    position: "absolute", bottom: 10, right: 10,
                    width: 42, height: 42, borderRadius: "50%",
                    background: item.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    border: "2px solid rgba(255,255,255,0.8)"
                  }}>
                    <item.Icon size={20} color="white" style={{ strokeWidth: 2.5 }} />
                  </div>
                </>
              );

              const commonStyles = {
                position: "relative",
                background: item.color, borderRadius: 18, padding: "16px 12px",
                display: "flex", flexDirection: "column",
                textDecoration: "none", border: "1px solid rgba(0,0,0,0.03)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease", minHeight: 96,
                overflow: "hidden"
              };
              const hoverEnter = e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; };
              const hoverLeave = e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; };

              if (isExternal) {
                return (
                  <a key={item.to} href={item.to} target="_blank" rel="noreferrer"
                    style={commonStyles} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <Link key={item.to} to={item.to}
                  style={commonStyles} onMouseEnter={hoverEnter} onMouseLeave={hoverLeave}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Today - Prayer Timeline */}
        <div>
          <p style={{ fontSize:13, color:"#6B7280", fontWeight:600, marginBottom:10 }}>Today</p>
          <div style={{ background:"#fff", borderRadius:16, padding:"16px 12px", border:"1px solid #EDE8E0" }}>
            {/* Timeline dots */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, position:"relative" }}>
              <div style={{ position:"absolute", top:"50%", left:16, right:16, height:2, background:"#E5E7EB", transform:"translateY(-50%)", zIndex:0 }} />
              {PRAYER_DISPLAY.map((key) => {
                const isActive = key === current;
                const isPast = times?.[key]?.ms && Date.now() > times[key].ms;
                return (
                  <div key={key} style={{ zIndex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{
                      width: isActive ? 18 : 12, height: isActive ? 18 : 12,
                      borderRadius:"50%",
                      background: isActive ? "#1B4D3E" : isPast ? "#8BC4B8" : "#D1D5DB",
                      border: isActive ? "3px solid #1B4D3E" : "none",
                      boxShadow: isActive ? "0 0 0 4px rgba(27,77,62,0.15)" : "none",
                      transition:"all 0.3s"
                    }} />
                  </div>
                );
              })}
            </div>
            {/* Prayer names & times */}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              {PRAYER_DISPLAY.map((key) => {
                const p = times?.[key];
                const isActive = key === current;
                const label = key === "dhuhr" && isFriday ? "Jumu'ah" : p?.name || key;
                return (
                  <div key={key} style={{ textAlign:"center", flex:1 }}>
                    <div style={{ fontSize:11, color: isActive ? "#1B4D3E" : "#9CA3AF", fontWeight: isActive ? 700 : 500 }}>{label}</div>
                    <div style={{ fontSize:12, color: isActive ? "#1B4D3E" : "#374151", fontWeight:700, marginTop:2 }}>
                      {p?.time?.replace(" AM","").replace(" PM","") || "--:--"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Suhur / Iftar / Tahajjud */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { icon:"🌙", label:"Suhur End", time: suhurEnd },
            { icon:"🌅", label:"Iftar", time: iftar },
            { icon:"🌃", label:"Tahajjud", time: tahajjudTime },
          ].map((item) => (
            <div key={item.label} style={{ background:"#fff", borderRadius:14, padding:"12px 10px", border:"1px solid #EDE8E0", textAlign:"center" }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{item.icon}</div>
              <div style={{ fontSize:11, color:"#6B7280", fontWeight:500 }}>{item.label}</div>
              <div style={{ fontSize:13, color:"#1B4D3E", fontWeight:700, marginTop:2 }}>{item.time}</div>
            </div>
          ))}
        </div>

        {/* Forbidden Salat Times */}
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EDE8E0", overflow:"hidden" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p style={{ fontSize:13, color:"#6B7280", fontWeight:600 }}>Forbidden Salat Times</p>
            <button 
              onClick={() => setIsForbiddenModalOpen(true)}
              style={{ fontSize:16, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer" }}
              className="hover:text-primary transition-colors"
            >ⓘ</button>
          </div>
          {[
            { bg:"linear-gradient(135deg,#4A1942,#C0392B)", icon:"🌄", label:"Sunrise", start: sunriseStart, end: sunriseEnd },
            { bg:"linear-gradient(135deg,#1A3A5C,#2B6CB0)", icon:"☀️", label:"Noon", start: noonStart, end: noonEnd },
            { bg:"linear-gradient(135deg,#7B2D00,#E8623A)", icon:"🌇", label:"Sunset", start: sunsetStart, end: sunsetEnd },
          ].map((item) => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderTop:"1px solid #F3F4F6" }}>
              <div style={{
                width:52, height:40, borderRadius:10,
                background:item.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, flexShrink:0
              }}>{item.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:"#374151", fontWeight:600 }}>{item.label}</div>
                <div style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{item.start} – {item.end}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Share DeenGuide */}
        <ShareSection />

        {/* Daily Verse */}
        <Link to={DAILY_VERSES[verseIdx].link} style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:"16px", border:"1px solid #EDE8E0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)", transition: "transform 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <p style={{ fontSize:12, color:"#6B7280", fontWeight:600, marginBottom:8 }}>Daily Verse</p>
            <p style={{ fontSize:15, color:"#1F2937", lineHeight:1.7 }}>"{DAILY_VERSES[verseIdx].text}"</p>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:8, fontWeight:500 }}>{DAILY_VERSES[verseIdx].ref}</p>
          </div>
        </Link>

        {/* Daily Dua */}
        <Link to={DAILY_DUAS[duaIdx].link} style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:"16px", border:"1px solid #EDE8E0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)", transition: "transform 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <p style={{ fontSize:12, color:"#6B7280", fontWeight:600, marginBottom:8 }}>Daily Dua</p>
            <p style={{ fontSize:15, color:"#1F2937", lineHeight:1.7 }}>{DAILY_DUAS[duaIdx].text}</p>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:8, fontWeight:500 }}>{DAILY_DUAS[duaIdx].ref}</p>
          </div>
        </Link>


      </div>

      {/* Location Modal */}
      {isLocModalOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={() => setIsLocModalOpen(false)} />
          <div className="fixed left-[50%] top-[40%] z-[70] w-[90%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">Change Location</h3>
              <button onClick={() => setIsLocModalOpen(false)} className="rounded-full p-1 hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualLocationSearch} className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={locQuery}
                onChange={e => setLocQuery(e.target.value)}
                placeholder="Search city (e.g. London, Makkah)..."
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/20 outline-none transition-shadow text-[14px]"
              />
              <button type="submit" className="hidden">Search</button>
            </form>

            <div className="space-y-1 max-h-[240px] overflow-y-auto scroll-thin pr-1">
              {isLocSearching ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching locations...
                </div>
              ) : locResults.length > 0 ? (
                locResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(res.short, res.lat, res.lng)}
                    className="w-full flex items-start text-left p-3 rounded-xl hover:bg-accent/50 border border-transparent hover:border-border transition-all"
                  >
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 mr-3" />
                    <div>
                      <p className="font-bold text-[14px] leading-tight">{res.short}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{res.display}</p>
                    </div>
                  </button>
                ))
              ) : locQuery && !isLocSearching ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  Press enter to search for "{locQuery}"
                </div>
              ) : null}

              <div className="pt-2 border-t border-border/40 mt-2">
                <button
                  onClick={resetToAutoLocation}
                  className="w-full flex items-center p-3 rounded-xl hover:bg-primary/5 text-primary border border-transparent transition-all text-[13px] font-bold"
                >
                  <LocateFixed className="h-4 w-4 mr-3" />
                  Detect My Current Location
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Forbidden Times Info Modal */}
      {isForbiddenModalOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={() => setIsForbiddenModalOpen(false)} />
          <div className="fixed left-[50%] top-[50%] z-[70] w-[92%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
              <button onClick={() => setIsForbiddenModalOpen(false)} className="rounded-full p-1.5 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-heading text-[15px] font-bold text-foreground">Forbidden Time</h3>
              <div style={{ width: 32 }} /> {/* Spacer */}
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 scroll-thin text-[14px] leading-[1.7] text-foreground/80">
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-[16px] text-foreground mb-2">The Time of Sunrise</h4>
                  <p>It Starts from: the time when the first portion of the sun can be seen on the eastern horizon; It Ends when: the entire Sun has become visible.</p>
                  <p className="mt-2">It is safe to start the Salat after the sun has risen to the height of a spear. Nowadays, this is regarded as about 12(twelve) minutes after the sun starts to rise, but to be on the safe side we may consider it to be around 15(fifteen) to 20(twenty) minutes.</p>
                  <p className="mt-2 text-destructive font-medium">Please try not to hit this time.</p>
                </div>

                <div>
                  <h4 className="font-bold text-[16px] text-foreground mb-2">The Time of Sunset</h4>
                  <p>It Starts from: the time when the Sun just touches the western horizon; it is also said that it starts when the sunlight becomes pale. It Ends when: the entire Sun disappears.</p>
                  <p className="mt-2">This may be considered about 12(twelve) minutes before sunset, but to be on the safe side we should consider it to be around 15(fifteen) to 20(twenty) minutes. If necessary, try to set a reminder to get your Salat done before you hit this time.</p>
                  <p className="mt-2 italic border-l-2 border-primary/30 pl-3 py-1 bg-accent/30 text-[13px]">
                    However, if any person somehow couldn't pray his/her Asr Salat, he/she can pray that particular Asr waqt of that day, even if it reaches the forbidden time of Sunset. But this particular rule applies only to the Asr Prayer of that particular day and we are not allowed to pray other salat in that time.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-[16px] text-foreground mb-2">The Time of Zawaal</h4>
                  <p>Zawaal is the point of time when the sun is at its highest point, i.e. when the shadow of an object reaches its shortest length. When the sun is right on top it is in its peak position, this is the time when the shadow of an object is almost zero.</p>
                  <p className="mt-2">We should not start our prayer in a time, when there is a possibility that the time within our Salat coincides with this point of time.</p>
                </div>

                <hr className="border-border/50" />

                <div>
                  <h4 className="font-bold text-[16px] text-foreground mb-2">References of Authentic Hadiths:</h4>
                  <p className="mb-2">There are 3(three) times at which the Messenger of Allah (pbuh) forbade us to pray:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>When the sun has clearly started to rise until it is fully risen;</li>
                    <li>When it is directly overhead at midday until it has passed its zenith/highest point; and</li>
                    <li>When the sun becomes pale and starts to set until it has fully set.</li>
                  </ol>
                  <p className="mt-4 text-[13px] text-muted-foreground">
                    In this Hadith it has also been mentioned that the last time for our Isha prayer is the midnight.{" "}
                    <Link to="/hadith?q=Sahih Muslim 223" className="text-primary hover:underline font-medium">
                      (Sahih Muslim Book 5, Hadith 223)
                    </Link>
                  </p>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Our Prophet(pbuh) said: "No prayer after two prayers, i.e. after the Fajr prayer till the sun rises and after the `Asr prayer till the sun sets."{" "}
                    <Link to="/hadith?q=Sahih al-Bukhari 1197" className="text-primary hover:underline font-medium">
                      (Sahih al-Bukhari; Hadith 1197)
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
