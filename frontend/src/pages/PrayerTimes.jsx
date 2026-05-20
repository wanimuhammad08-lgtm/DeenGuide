import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, MapPin, Search, X, Moon, Sunset, Star, Sunrise, Sun } from "lucide-react";
import { calculatePrayerTimes, getCurrentPrayer, CALC_METHODS, JURISTIC_METHODS } from "@/lib/prayerTimes";
import { gregorianToHijri, fetchTodayHijri, HIJRI_MONTHS } from "@/lib/hijriDate";

// Prayer icon badges — rounded square with gradient background and lucide icon
import { Moon as MoonIcon, Sun as SunIcon, Sunrise as SunriseIcon, Sunset as SunsetIcon, CloudSun, SunMedium, Star as StarIcon } from "lucide-react";

const PRAYER_ICON_CONFIG = {
  fajr: { Icon: SunriseIcon, gradient: "linear-gradient(135deg, #1e1b4b, #312e81)" },
  sunrise: { Icon: CloudSun, gradient: "linear-gradient(135deg, #EA580C, #DC2626)" },
  dhuhr: { Icon: SunIcon, gradient: "linear-gradient(135deg, #D97706, #EA580C)" },
  asr: { Icon: SunMedium, gradient: "linear-gradient(135deg, #B45309, #D97706)" },
  maghrib: { Icon: SunsetIcon, gradient: "linear-gradient(135deg, #7B2D00, #E8623A)" },
  isha: { Icon: MoonIcon, gradient: "linear-gradient(135deg, #1e1b4b, #312e81)" },
  qiyam: { Icon: StarIcon, gradient: "linear-gradient(135deg, #0f172a, #1e3a5f)" },
};

const PrayerIconBadge = ({ type }) => {
  const config = PRAYER_ICON_CONFIG[type] || PRAYER_ICON_CONFIG.dhuhr;
  const IconComp = config.Icon;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: config.gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <IconComp size={18} color="white" strokeWidth={1.8} />
    </div>
  );
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getTimezone() {
  return -new Date().getTimezoneOffset() / 60;
}

export default function PrayerTimes() {
  const navigate = useNavigate();

  // Location state — try to load from localStorage first
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem("dg_location");
    return saved ? JSON.parse(saved) : null;
  });
  const [locationName, setLocationName] = useState(() => {
    return localStorage.getItem("dg_location_name") || "Loading...";
  });
  const [error, setError] = useState(null);
  const [calcMethod, setCalcMethod] = useState(() => localStorage.getItem("dg_calc_method") || "karachi");
  const [juristicMethod, setJuristicMethod] = useState(() => localStorage.getItem("dg_juristic") || "shafi");
  const [showCalcMethods, setShowCalcMethods] = useState(false);
  const [showJuristic, setShowJuristic] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offsetDays, setOffsetDays] = useState(0);
  const [countdownStr, setCountdownStr] = useState("");

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Location search state
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Update clock every 30 seconds for more responsive updates
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Get location from browser if no saved location
  useEffect(() => {
    if (location) return; // Already have location from localStorage
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        localStorage.setItem("dg_location", JSON.stringify(loc));
        // Reverse geocode
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
          const data = await res.json();
          const name = data.address?.city || data.address?.town || data.address?.county || "Your Location";
          setLocationName(name);
          localStorage.setItem("dg_location_name", name);
        } catch {
          const name = `${loc.lat.toFixed(2)}°, ${loc.lng.toFixed(2)}°`;
          setLocationName(name);
          localStorage.setItem("dg_location_name", name);
        }
      },
      () => setError("Location access denied. Enable location or search manually."),
      { enableHighAccuracy: true }
    );
  }, [location]);

  // Target date for calculations
  const targetDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toDateString();
  }, [offsetDays]);

  const targetDate = useMemo(() => new Date(targetDateStr), [targetDateStr]);
  const timezone = getTimezone();

  const times = useMemo(() => {
    if (!location) return null;
    return calculatePrayerTimes(targetDate, location.lat, location.lng, timezone, calcMethod, juristicMethod);
  }, [location, targetDate, timezone, calcMethod, juristicMethod]);

  const { current, next } = useMemo(() => {
    if (!times || offsetDays !== 0) return { current: null, next: null };
    return getCurrentPrayer(times);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, now, offsetDays]);

  // Special / Supplementary times
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

  // Forbidden windows (exact clones of dashboard physics)
  const sunriseStart = times?.sunrise?.time || "--:--";
  const sunriseEnd = times?.sunrise?.ms ? new Date(times.sunrise.ms + 15*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const noonStart = times?.dhuhr?.ms ? new Date(times.dhuhr.ms - 5*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const noonEnd = times?.dhuhr?.time || "--:--";
  const sunsetStart = times?.maghrib?.ms ? new Date(times.maghrib.ms - 15*60000).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}) : "--:--";
  const sunsetEnd = times?.maghrib?.time || "--:--";

  const [isForbiddenModalOpen, setIsForbiddenModalOpen] = useState(false);

  // Countdown timer for next sunrise
  useEffect(() => {
    const id = setInterval(() => {
      // Find the next sunrise relative to "now"
      let nextSunriseMs = times?.sunrise?.ms;
      if (nextSunriseMs && Date.now() > nextSunriseMs) {
        // If today's sunrise has passed, we usually show tomorrow's. 
        // For simplicity in the UI, if offset is 0, we can add 24h.
        nextSunriseMs += 24 * 3600000;
      }
      const msUntil = (nextSunriseMs || 0) - Date.now();
      if (msUntil > 0) {
        const h = Math.floor(msUntil / 3600000);
        const m = Math.floor((msUntil % 3600000) / 60000);
        const s = Math.floor((msUntil % 60000) / 1000);
        setCountdownStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        setCountdownStr("");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [times]);

  // Hijri date for today — live from Aladhan API (location-aware)
  const [hijriToday, setHijriToday] = useState(() => {
    const d = new Date();
    return gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
  });
  const [todayHolidays, setTodayHolidays] = useState([]);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    if (offsetDays === 0) {
      fetchTodayHijri(location.lat, location.lng).then((result) => {
        if (!cancelled) {
          setHijriToday({ year: result.year, month: result.month, day: result.day });
          if (result.holidays?.length) setTodayHolidays(result.holidays);
        }
      });
    } else {
      setHijriToday(gregorianToHijri(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate()));
      setTodayHolidays([]);
    }
    return () => { cancelled = true; };
  }, [location, offsetDays, targetDate]);

  const saveCalcMethod = (id) => {
    setCalcMethod(id);
    localStorage.setItem("dg_calc_method", id);
    setShowCalcMethods(false);
  };

  const saveJuristic = (id) => {
    setJuristicMethod(id);
    localStorage.setItem("dg_juristic", id);
    setShowJuristic(false);
  };

  // Swipe handlers
  const minSwipeDistance = 50;
  const onPointerDown = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
  };
  const onPointerMove = (e) => {
    if (touchStart !== null) {
      setTouchEnd(e.targetTouches ? e.targetTouches[0].clientX : e.clientX);
    }
  };
  const onPointerUp = () => {
    if (touchStart === null || touchEnd === null) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) setOffsetDays(d => Math.min(d + 1, 6));
    if (isRightSwipe) setOffsetDays(d => Math.max(d - 1, 0));
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Location search
  const searchLocation = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
      );
      const data = await res.json();
      if (!data.results) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearchResults(
        data.results.map((r) => ({
          name: [r.admin1, r.country].filter(Boolean).join(", "),
          city: r.name,
          lat: parseFloat(r.latitude),
          lng: parseFloat(r.longitude),
        }))
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!showLocationSearch) return;
    const timer = setTimeout(() => searchLocation(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchLocation, showLocationSearch]);

  const selectLocation = (result) => {
    const loc = { lat: result.lat, lng: result.lng };
    setLocation(loc);
    setLocationName(result.city);
    localStorage.setItem("dg_location", JSON.stringify(loc));
    localStorage.setItem("dg_location_name", result.city);
    setShowLocationSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  };

  const useCurrentLocation = () => {
    // Clear saved location and re-trigger geolocation
    localStorage.removeItem("dg_location");
    localStorage.removeItem("dg_location_name");
    setLocation(null);
    setLocationName("Loading...");
    setShowLocationSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const prayerOrder = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha", "qiyam"];
  const dateStr = `${WEEKDAYS[targetDate.getDay()]}, ${MONTHS[targetDate.getMonth()]} ${targetDate.getDate()}, ${targetDate.getFullYear()}`;
  const hijriStr = `${hijriToday.day} ${HIJRI_MONTHS[hijriToday.month - 1]}, ${hijriToday.year}`;

  const selectedCalc = CALC_METHODS.find((m) => m.id === calcMethod);
  const selectedJuristic = JURISTIC_METHODS.find((j) => j.id === juristicMethod);

  // Location search modal
  if (showLocationSearch) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-4">
          <button onClick={() => setShowLocationSearch(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-bold">Change Location</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city or location..."
            autoFocus
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Use current location button */}
        <button
          onClick={useCurrentLocation}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left transition hover:bg-accent"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Use Current Location</p>
            <p className="text-xs text-muted-foreground">Auto-detect via GPS</p>
          </div>
        </button>

        {/* Search results */}
        {searching && (
          <div className="p-8 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!searching && searchResults.length > 0 && (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectLocation(r)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-accent"
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{r.city}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No locations found. Try a different search.
          </div>
        )}
      </div>
    );
  }

  // Calculation Methods modal
  if (showCalcMethods) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-4">
          <button onClick={() => setShowCalcMethods(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-bold">Calculation Method</h1>
        </div>
        <div className="mb-4 rounded-2xl bg-primary p-4 text-sm text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs">ℹ</div>
            <p>Any adjustment in calculation method will affect Fajr and Isha prayer times.</p>
          </div>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {CALC_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => saveCalcMethod(m.id)}
              className={`flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent ${m.id === calcMethod ? "text-primary" : ""}`}
            >
              <div>
                <p className={`text-sm font-semibold ${m.id === calcMethod ? "text-primary" : ""}`}>{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  Fajr {m.fajrAngle}° degrees, Isha {m.ishaMinutes ? `${m.ishaMinutes} minutes after sunset` : `${m.ishaAngle}° degrees`}
                </p>
              </div>
              {m.id === calcMethod && (
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Juristic Method modal
  if (showJuristic) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-4">
          <button onClick={() => setShowJuristic(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-bold">Juristic Method</h1>
        </div>
        <div className="mb-4 rounded-2xl bg-primary p-4 text-sm text-primary-foreground">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs">ℹ</div>
            <p>The juristic method affects the Asr prayer time calculation.</p>
          </div>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {JURISTIC_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => saveJuristic(m.id)}
              className={`flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent ${m.id === juristicMethod ? "text-primary" : ""}`}
            >
              <div>
                <p className={`text-sm font-semibold ${m.id === juristicMethod ? "text-primary" : ""}`}>{m.name}</p>
                <p className="text-xs text-muted-foreground">Shadow factor: {m.shadowFactor}x</p>
              </div>
              {m.id === juristicMethod && (
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3.5 w-3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 px-4 sm:px-0">
      {/* Page Header (Matching Ask AI) */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Worship
        </p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Prayer Times
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Accurate daily prayer timings based on your location and calculation method.
        </p>
      </div>

      {/* Date Header without Navigation Arrows */}
      <div className="mb-8 text-center">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          {dateStr}
        </h1>
        {hijriStr && (
          <p className="text-sm font-medium text-muted-foreground mt-1">
            {hijriStr}
          </p>
        )}
      </div>

      {/* Prayer times list */}
      {error ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <p className="text-xs text-muted-foreground mb-4">You can also search for a location manually.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold">Retry</button>
            <button onClick={() => setShowLocationSearch(true)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Search Location</button>
          </div>
        </div>
      ) : !times ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Getting your location...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Prayer list */}
          <div 
            className="rounded-3xl border border-border bg-card px-2 py-3 select-none touch-pan-y"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {prayerOrder.map((key) => {
              const prayer = times[key];
              const isCurrent = key === current;
              const isNext = key === next;
              return (
                <div
                  key={key}
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition ${
                    isCurrent ? "bg-primary/10" : ""
                  }`}
                >
                  <PrayerIconBadge type={key} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-heading text-[15px] font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                        {prayer.name}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Now
                        </span>
                      )}
                      {isNext && (
                        <span className="rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-[10px] font-bold">
                          Next
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-heading text-[15px] font-bold tabular-nums ${isCurrent ? "text-primary" : "text-foreground"}`}>
                    {prayer.time}
                  </span>
                </div>
              );
            })}

            {/* Pagination Dots */}
            <div className="flex justify-center gap-1.5 mt-4 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setOffsetDays(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    offsetDays === i ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to day ${i}`}
                />
              ))}
            </div>
          </div>

          {/* Suhur / Iftar / Tahajjud */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[
              { Icon: Moon, label:"Suhur End", time: suhurEnd, gradient:"linear-gradient(135deg, #1e1b4b, #312e81)" },
              { Icon: Sunset, label:"Iftar", time: iftar, gradient:"linear-gradient(135deg, #EA580C, #DC2626)" },
              { Icon: Star, label:"Tahajjud", time: tahajjudTime, gradient:"linear-gradient(135deg, #1e3a5f, #0f172a)" },
            ].map((item) => (
              <div key={item.label} style={{ background:"var(--card)", borderRadius:14, padding:"12px 10px", border:"1px solid var(--border)", textAlign:"center" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:item.gradient, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:6 }}>
                  <item.Icon size={18} color="white" />
                </div>
                <div style={{ fontSize:11, color:"var(--muted-foreground)", fontWeight:500 }}>{item.label}</div>
                <div style={{ fontSize:13, color:"var(--foreground)", fontWeight:700, marginTop:2 }}>{item.time}</div>
              </div>
            ))}
          </div>

          {/* Forbidden Salat Times */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-[13px] text-muted-foreground font-semibold">Forbidden Salat Times</p>
              <button 
                onClick={() => setIsForbiddenModalOpen(true)}
                className="text-[16px] text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
              >ⓘ</button>
            </div>
            {[
              { bg:"linear-gradient(135deg,#4A1942,#C0392B)", Icon: Sunrise, label:"Sunrise", start: sunriseStart, end: sunriseEnd },
              { bg:"linear-gradient(135deg,#1A3A5C,#2B6CB0)", Icon: Sun, label:"Noon", start: noonStart, end: noonEnd },
              { bg:"linear-gradient(135deg,#7B2D00,#E8623A)", Icon: Sunset, label:"Sunset", start: sunsetStart, end: sunsetEnd },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/50">
                <div style={{
                  width:44, height:44, borderRadius:12,
                  background:item.bg,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0
                }}>
                  <item.Icon size={20} color="white" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-foreground">{item.label}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{item.start} – {item.end}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Timetable link */}
          <Link
            to="/prayer-times/monthly"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-foreground">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18M16 2v4M8 2v4" strokeLinecap="round" />
              </svg>
              <span className="text-[15px] font-semibold text-foreground">Monthly Timetable</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Settings Cards */}
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            <button
              onClick={() => setShowLocationSearch(true)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
            >
              <div>
                <p className="text-[15px] font-semibold text-foreground">Location</p>
                <p className="mt-0.5 text-sm text-muted-foreground truncate max-w-[220px] sm:max-w-[300px]">{locationName}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowJuristic(true)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
            >
              <div>
                <p className="text-[15px] font-semibold text-foreground">Juristic Method</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{selectedJuristic?.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowCalcMethods(true)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
            >
              <div>
                <p className="text-[15px] font-semibold text-foreground">Calculation Method</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{selectedCalc?.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
      {/* Forbidden Times Info Modal */}
      {isForbiddenModalOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={() => setIsForbiddenModalOpen(false)} />
          <div className="fixed left-[50%] top-[50%] z-[70] w-[92%] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[80vh] overflow-hidden text-left">
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
              <button onClick={() => setIsForbiddenModalOpen(false)} className="rounded-full p-1.5 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-heading text-[15px] font-bold text-foreground">Forbidden Time</h3>
              <div style={{ width: 32 }} />
            </div>
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
                  <p className="mt-2">This may be considered about 12(twelve) minutes before sunset, but to be on the safe side we should consider it to be around 15(fifteen) to 20(twenty) minutes.</p>
                  <p className="mt-2 italic border-l-2 border-primary/30 pl-3 py-1 bg-accent/30 text-[13px]">
                    However, if any person somehow couldn't pray his/her Asr Salat, he/she can pray that particular Asr waqt of that day, even if it reaches the forbidden time of Sunset. But this particular rule applies only to the Asr Prayer of that particular day.
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
