import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { calculatePrayerTimes, getCurrentPrayer } from "@/lib/prayerTimes";
import { gregorianToHijri, fetchTodayHijri, HIJRI_MONTHS } from "@/lib/hijriDate";

const DAILY_VERSES = [
  { text: "Indeed, this is a reminder, so whoever wills may take to his Lord a way.", ref: "Quran 73:19" },
  { text: "And whoever relies upon Allah – then He is sufficient for him.", ref: "Quran 65:3" },
  { text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", ref: "Quran 2:152" },
  { text: "Verily, with hardship comes ease.", ref: "Quran 94:6" },
  { text: "And He found you lost and guided you.", ref: "Quran 93:7" },
  { text: "Allah does not burden a soul beyond that it can bear.", ref: "Quran 2:286" },
  { text: "And when My servants ask you concerning Me – indeed I am near.", ref: "Quran 2:186" },
];

const DAILY_DUAS = [
  { text: "How perfect Allah is, all praise is for Allah, and Allah is the greatest. None has the right to be worshipped except Allah, alone, without any partner.", ref: "Muslim 1/418" },
  { text: "O Allah, I ask You for forgiveness and well-being in this world and the Hereafter.", ref: "Abu Dawud 5074" },
  { text: "O Allah, make me among those who, when they do good, feel pleased, and when they do evil, seek forgiveness.", ref: "Ahmad 1/62" },
  { text: "Our Lord, give us in this world that which is good and in the Hereafter that which is good and protect us from the punishment of the Fire.", ref: "Quran 2:201" },
  { text: "O Allah, guide me and make me steadfast. Remember me of what I have forgotten.", ref: "Tirmidhi 3522" },
  { text: "O Allah, I take refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice.", ref: "Bukhari 6369" },
  { text: "O Allah, You are my Lord. There is no god but You. You created me and I am Your servant.", ref: "Bukhari 6306" },
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
const DuaIcon = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <circle cx="19" cy="19" r="14" stroke="#BF8040" strokeWidth="2" fill="none"/>
    <circle cx="19" cy="7" r="3" fill="#D4943A"/>
    {[0,40,80,120,160,200,240,280,320].map((a,i)=>(
      <circle key={i} cx={19+11*Math.cos((a-90)*Math.PI/180)} cy={19+11*Math.sin((a-90)*Math.PI/180)} r="2" fill="#E8B97A"/>
    ))}
    <circle cx="19" cy="19" r="3" fill="#BF8040"/>
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

const EXPLORE_ITEMS = [
  { to: "/quran", label: "Quran", Icon: QuranIcon, color: "#EDF7EE" },
  { to: "/duas", label: "Dua & Zikr", Icon: DuaIcon, color: "#FFF8EE" },
  { to: "/more/qibla", label: "Qibla", Icon: QiblaIcon, color: "#EDF5F0" },
  { to: "/prayer-times", label: "Prayer Times", Icon: PrayerIcon2, color: "#F5EEF8" },
  { to: "/more/calendar", label: "Calendar", Icon: CalendarIcon, color: "#EEF0FB" },
  { to: "/more/names-of-allah", label: "Allah's Names", Icon: AllahIcon, color: "#FCEEF4" },
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
    const nextMs = times[next]?.ms;
    if (!nextMs) return;
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
    const total = nextPrayer.ms - currentPrayer.ms;
    const elapsed = now - currentPrayer.ms;
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
      <div className="pt-4 pb-2 flex items-center justify-between">
        <div>
          <div style={{ fontFamily: "Amiri Quran, serif", fontSize: 28, color: "#1B4D3E", lineHeight: 1.2 }}>
            السلام عليكم
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{hijriStr}</div>
          <button
            onClick={() => { localStorage.removeItem("dg_location"); localStorage.removeItem("dg_location_name"); setLocation(null); setLocationName("Locating..."); }}
            style={{ display:"flex", alignItems:"center", gap:4, color:"#1B4D3E", fontSize:12, fontWeight:600, marginTop:2 }}
          >
            <MapPin size={12} /> {locationName}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Prayer Time Card */}
        <div style={{
          background: "linear-gradient(135deg, #F5C47A 0%, #E8A952 60%, #D4943A 100%)",
          borderRadius: 20, padding: "20px 20px 16px", position: "relative", overflow: "hidden",
          boxShadow: "0 4px 20px rgba(212,148,58,0.35)"
        }}>
          {/* Kaaba SVG illustration */}
          <div style={{ position:"absolute", right:-10, bottom:-5, opacity:0.25, pointerEvents:"none" }}>
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
              <div style={{ fontSize:13, color:"#1B3028", fontWeight:600, opacity:0.8 }}>
                {currentPrayer?.time || "--:--"}
              </div>
              <div style={{ fontSize:18, color:"#1B3028", fontWeight:700 }}>
                {currentPrayer?.name || "Prayer"}
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize:13, color:"#1B3028", fontWeight:600, opacity:0.8 }}>
                {nextPrayer?.time || "--:--"}
              </div>
              <div style={{ fontSize:15, color:"#1B3028", fontWeight:600 }}>
                {nextPrayer?.name || "Next"}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height:5, background:"rgba(27,48,40,0.2)", borderRadius:10, margin:"8px 0" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"#1B4D3E", borderRadius:10, transition:"width 1s linear" }} />
          </div>

          {/* Countdown */}
          <div style={{ fontSize:38, fontWeight:700, color:"#1B3028", letterSpacing:2, fontVariantNumeric:"tabular-nums", fontFamily:"Outfit,sans-serif", marginTop:8 }}>
            {times ? countdown : "00:00:00"}
          </div>
          <div style={{ fontSize:12, color:"#1B3028", opacity:0.7, marginTop:2 }}>
            until {nextPrayer?.name || "next prayer"}
          </div>
        </div>

        {/* Durood Reminder */}
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", border:"1px solid #EDE8E0" }}>
          <div className="flex items-start justify-between gap-3">
            <div style={{ fontSize:14, color:"#374151", lineHeight:1.6 }}>
              Durood Sharif reminder. Send <strong>Salawat</strong> upon the Prophet ﷺ today.
            </div>
            <span style={{ fontSize:18 }}>✨</span>
          </div>
          <Link to="/duas" style={{ color:"#2BAE96", fontSize:13, fontWeight:600, display:"block", marginTop:8 }}>
            Tap to read →
          </Link>
        </div>

        {/* Explore */}
        <div>
          <p style={{ fontSize:13, color:"#6B7280", fontWeight:600, marginBottom:10 }}>Explore</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {EXPLORE_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  background: item.color, borderRadius:16, padding:"14px 10px 10px",
                  display:"flex", flexDirection:"column", alignItems:"flex-start",
                  textDecoration:"none", border:"1px solid rgba(0,0,0,0.06)",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                  transition:"transform 0.18s, box-shadow 0.18s", minHeight:90
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 6px 18px rgba(0,0,0,0.12)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.06)"}}
              >
                <div style={{ fontSize:12, color:"#374151", fontWeight:700, marginBottom:10, lineHeight:1.3 }}>{item.label}</div>
                <div style={{ marginTop:"auto" }}><item.Icon /></div>
              </Link>
            ))}
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
            <span style={{ fontSize:16, color:"#9CA3AF" }}>ⓘ</span>
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
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", border:"1px solid #EDE8E0" }}>
          <p style={{ fontSize:12, color:"#6B7280", fontWeight:600, marginBottom:8 }}>Daily Verse</p>
          <p style={{ fontSize:15, color:"#1F2937", lineHeight:1.7 }}>"{DAILY_VERSES[verseIdx].text}"</p>
          <p style={{ fontSize:12, color:"#6B7280", marginTop:8, fontWeight:500 }}>{DAILY_VERSES[verseIdx].ref}</p>
        </div>

        {/* Daily Dua */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px", border:"1px solid #EDE8E0" }}>
          <p style={{ fontSize:12, color:"#6B7280", fontWeight:600, marginBottom:8 }}>Daily Dua</p>
          <p style={{ fontSize:15, color:"#1F2937", lineHeight:1.7 }}>{DAILY_DUAS[duaIdx].text}</p>
          <p style={{ fontSize:12, color:"#6B7280", marginTop:8, fontWeight:500 }}>{DAILY_DUAS[duaIdx].ref}</p>
        </div>


      </div>
    </div>
  );
}
