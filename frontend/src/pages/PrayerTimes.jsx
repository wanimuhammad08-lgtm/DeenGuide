import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ChevronLeft, MapPin, Search, X, Settings } from "lucide-react";
import { calculatePrayerTimes, getCurrentPrayer, CALC_METHODS, JURISTIC_METHODS } from "@/lib/prayerTimes";
import { gregorianToHijri, fetchTodayHijri, HIJRI_MONTHS } from "@/lib/hijriDate";

// Prayer icons as SVG components
const PrayerIcon = ({ type, className = "h-6 w-6" }) => {
  const icons = {
    fajr: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M12 3v2M5.64 5.64l1.41 1.41M3 12h2M5.64 18.36l1.41-1.41M12 19v2" strokeLinecap="round" />
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M4 20h16" strokeLinecap="round" />
      </svg>
    ),
    sunrise: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M12 2v4M4.93 10.93l1.41 1.41M2 18h2M20 18h2M18.66 10.93l-1.41 1.41" strokeLinecap="round" />
        <path d="M12 18a6 6 0 010-12" />
        <path d="M2 22h20" strokeLinecap="round" />
      </svg>
    ),
    dhuhr: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
      </svg>
    ),
    asr: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <circle cx="10" cy="12" r="4" />
        <path d="M10 4v2M2.93 6.93l1.41 1.41M0 14h2M2.93 19.07l1.41-1.41M18 14h2" strokeLinecap="round" />
        <path d="M22 20L14 20" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    maghrib: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M12 19a7 7 0 010-14" />
        <path d="M2 21h20" strokeLinecap="round" />
        <path d="M12 2v3M4.22 4.22l2.12 2.12M2 12h3" strokeLinecap="round" />
      </svg>
    ),
    isha: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    ),
    qiyam: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  };
  return icons[type] || icons.dhuhr;
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
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offsetDays, setOffsetDays] = useState(0);
  const [countdownStr, setCountdownStr] = useState("");

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

  // Location search
  const searchLocation = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`
      );
      const data = await res.json();
      setSearchResults(
        data.map((r) => ({
          name: r.display_name,
          city: r.address?.city || r.address?.town || r.address?.county || r.address?.state || r.name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
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
  const dateStr = `${WEEKDAYS[targetDate.getDay()]}, ${String(targetDate.getDate()).padStart(2, '0')} ${MONTHS[targetDate.getMonth()]}`;
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

  // Settings modal
  if (showSettings) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-4">
          <button onClick={() => setShowSettings(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-bold">Settings</h1>
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          <button
            onClick={() => { setShowSettings(false); setShowLocationSearch(true); }}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
          >
            <div>
              <p className="text-sm font-semibold">Location</p>
              <p className="text-xs text-muted-foreground">{locationName}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => { setShowSettings(false); setShowJuristic(true); }}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
          >
            <div>
              <p className="text-sm font-semibold">Juristic Method</p>
              <p className="text-xs text-muted-foreground">{selectedJuristic?.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => { setShowSettings(false); setShowCalcMethods(true); }}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-accent"
          >
            <div>
              <p className="text-sm font-semibold">Calculation Method</p>
              <p className="text-xs text-muted-foreground">
                {selectedCalc?.name} ({selectedCalc?.fajrAngle}°, {selectedCalc?.ishaMinutes ? `${selectedCalc.ishaMinutes}m` : `${selectedCalc?.ishaAngle}°`})
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* New Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily Worship</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Prayer Times</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Accurate daily prayer timings based on your location and calculation method.
        </p>
      </div>

      {/* Timeline Widget (Zawal) */}
      <div className="mb-6 rounded-3xl bg-card border border-border p-6 shadow-sm relative overflow-hidden">
        <div className="text-center font-bold text-lg mb-8 text-foreground">
          {selectedJuristic?.name.split(" ")[0]}
        </div>
        
        <div className="flex items-center justify-between text-sm relative z-10">
          {/* Left: Sunrise */}
          <div className="flex flex-col items-center bg-card px-2 relative z-20">
            <span className="mb-2 text-muted-foreground">Sunrise</span>
            <PrayerIcon type="sunrise" className="h-8 w-8 mb-2 text-foreground" />
            <span className="font-medium text-foreground">{times?.sunrise?.time}</span>
          </div>

          {/* Center line */}
          <div className="absolute left-[15%] right-[15%] top-[38px] border-t-[1.5px] border-dashed border-border z-0" />
          
          {/* Center Text (Zawal) */}
          <div className="absolute top-[16px] left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground w-full z-10 bg-card px-2 max-w-[160px]">
            Zawal time in {locationName.split(',')[0]}
            <div className="mt-7 font-medium text-sm text-foreground">
              {(() => {
                if (!times?.dhuhr?.ms) return "";
                const d = new Date(times.dhuhr.ms);
                const start = new Date(d.getTime() - 10 * 60000);
                return `${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${times.dhuhr.time}`;
              })()}
            </div>
          </div>

          {/* Right: Sunset */}
          <div className="flex flex-col items-center bg-card px-2 relative z-20">
            <span className="mb-2 text-muted-foreground">Sunset</span>
            <PrayerIcon type="maghrib" className="h-8 w-8 mb-2 text-foreground" />
            <span className="font-medium text-foreground">{times?.maghrib?.time}</span>
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm font-medium text-muted-foreground">
          Next Sunrise <span className="text-foreground ml-1 font-bold">{countdownStr}</span>
        </div>
      </div>

      {/* Date Browser */}
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-card border border-border px-4 py-4 shadow-sm">
        <button onClick={() => setOffsetDays(d => d - 1)} className="p-2 text-muted-foreground hover:text-foreground transition hover:bg-accent rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[15px] font-medium text-foreground">{dateStr}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{hijriStr}</p>
        </div>
        <button onClick={() => setOffsetDays(d => d + 1)} className="p-2 text-muted-foreground hover:text-foreground transition hover:bg-accent rounded-full">
          <ChevronRight className="h-5 w-5" />
        </button>
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
          <div className="rounded-3xl border border-border bg-card px-2 py-2">
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
                  <div className={`shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    <PrayerIcon type={key} className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-heading text-sm font-semibold ${isCurrent ? "text-primary" : ""}`}>
                        {prayer.name}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Now
                        </span>
                      )}
                      {isNext && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                          Next
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-heading text-sm font-bold tabular-nums ${isCurrent ? "text-primary" : ""}`}>
                    {prayer.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly Timetable link */}
          <Link
            to="/prayer-times/monthly"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-muted-foreground">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18M16 2v4M8 2v4" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold">Monthly Timetable</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Settings Option at Bottom */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 font-semibold text-foreground transition hover:bg-accent"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span>Prayer Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}
