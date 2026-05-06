import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, RotateCcw, Smartphone, MapPin, Navigation2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const KAABAH = { lat: 21.4225, lng: 39.8262 };

// ─── Math helpers (no API needed — pure trigonometry) ─────────────────────────
function calculateQibla(lat, lng) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABAH.lat * Math.PI) / 180;
  const Δλ = ((KAABAH.lng - lng) * Math.PI) / 180;
  const x = Math.sin(Δλ);
  const y = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

function distanceToKaabah(lat, lng) {
  const R = 6371;
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABAH.lat * Math.PI) / 180;
  const Δφ = ((KAABAH.lat - lat) * Math.PI) / 180;
  const Δλ = ((KAABAH.lng - lng) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCompassLabel(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ─── SVG Compass ──────────────────────────────────────────────────────────────
function QiblaCompass({ qiblaBearing, deviceHeading }) {
  // Fix: The NEEDLE rotates to qibla bearing. The RING counter-rotates by device heading.
  // This means the needle always points to real-world Qibla direction.
  const ringRotation = deviceHeading !== null ? -deviceHeading : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(23,139,80,0.08) 0%, transparent 70%)" }} />

      {/* Rotating compass ring (responds to device heading) */}
      <div className="absolute inset-0"
        style={{
          transform: `rotate(${ringRotation}deg)`,
          transition: deviceHeading !== null ? "transform 120ms linear" : "none",
        }}
      >
        <svg viewBox="0 0 280 280" width="280" height="280">
          {/* Background circle */}
          <circle cx="140" cy="140" r="134" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />

          {/* Tick marks */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = i * 5;
            const rad = (angle * Math.PI) / 180;
            const isMajor = i % 18 === 0;
            const isMid = i % 6 === 0;
            const outer = 132;
            const len = isMajor ? 14 : isMid ? 9 : 5;
            const x1 = 140 + (outer - len) * Math.sin(rad);
            const y1 = 140 - (outer - len) * Math.cos(rad);
            const x2 = 140 + outer * Math.sin(rad);
            const y2 = 140 - outer * Math.cos(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                strokeWidth={isMajor ? 2.5 : isMid ? 1.2 : 0.7}
                opacity={isMajor ? 1 : 0.5}
              />
            );
          })}

          {/* Cardinal labels */}
          {[
            { label: "N", angle: 0, size: 15, weight: "bold", fill: "#178b50" },
            { label: "E", angle: 90, size: 11, weight: "600", fill: "hsl(var(--muted-foreground))" },
            { label: "S", angle: 180, size: 11, weight: "600", fill: "hsl(var(--muted-foreground))" },
            { label: "W", angle: 270, size: 11, weight: "600", fill: "hsl(var(--muted-foreground))" },
          ].map(({ label, angle, size, weight, fill }) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <text key={label}
                x={140 + 112 * Math.sin(rad)} y={140 - 112 * Math.cos(rad)}
                textAnchor="middle" dominantBaseline="central"
                fontSize={size} fontWeight={weight} fill={fill}
                fontFamily="'Outfit', system-ui, sans-serif"
              >{label}</text>
            );
          })}

          {/* North triangle */}
          <polygon points="140,8 135,20 145,20" fill="#178b50" />
        </svg>
      </div>

      {/* Qibla needle (fixed rotation = qibla bearing, doesn't follow device heading) */}
      {/* This is the KEY FIX: needle is separate from the rotating ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ transform: `rotate(${qiblaBearing}deg)`, transformOrigin: "center center", width: "100%", height: "100%", position: "absolute" }}>
          <svg viewBox="0 0 280 280" width="280" height="280" style={{ position: "absolute", inset: 0 }}>
            {/* Needle shaft */}
            <line x1="140" y1="140" x2="140" y2="42"
              stroke="#178b50" strokeWidth="3" strokeLinecap="round" />
            {/* Needle head */}
            <polygon points="140,28 133,48 147,48" fill="#178b50" />
            {/* Tail */}
            <line x1="140" y1="140" x2="140" y2="200"
              stroke="hsl(var(--border))" strokeWidth="2" strokeLinecap="round" />
            <polygon points="140,210 134,196 146,196" fill="hsl(var(--muted-foreground))" opacity="0.4" />
            {/* Qibla label near head */}
            <text x="140" y="62" textAnchor="middle"
              fill="#178b50" fontSize="8" fontWeight="bold"
              fontFamily="'Outfit', system-ui, sans-serif"
            >QIBLA</text>
          </svg>
        </div>
      </div>

      {/* Center Ka'bah */}
      <div className="absolute flex items-center justify-center rounded-full border-2 z-10"
        style={{
          width: 52, height: 52,
          background: "hsl(var(--card))",
          borderColor: "rgba(23,139,80,0.3)",
          boxShadow: "0 0 0 6px hsl(var(--card))",
        }}
      >
        <span style={{ fontSize: 24 }}>🕋</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QiblaDirection() {
  const [location, setLocation] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dg_location") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(!location);
  const [error, setError] = useState(null);

  // Compass state
  const [deviceHeading, setDeviceHeading] = useState(null); // null = no compass
  const [compassStatus, setCompassStatus] = useState("checking"); // checking | active | unsupported | needsPermission
  const [needsCalibration, setNeedsCalibration] = useState(false);

  const headingRaw = useRef(null);
  const headingSmooth = useRef(null);
  const rafRef = useRef(null);

  // ── Get location ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (location) { setLoading(false); return; }
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        try { localStorage.setItem("dg_location", JSON.stringify(loc)); } catch { }
        setLoading(false);
      },
      () => {
        setError("Location access denied. Please allow location permission and refresh.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Smooth heading animation loop ───────────────────────────────────────────
  const animateHeading = useCallback(() => {
    if (headingRaw.current !== null) {
      if (headingSmooth.current === null) {
        headingSmooth.current = headingRaw.current;
      } else {
        let diff = headingRaw.current - headingSmooth.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        headingSmooth.current = (headingSmooth.current + diff * 0.12 + 360) % 360;
      }
      setDeviceHeading(Math.round(headingSmooth.current));
    }
    rafRef.current = requestAnimationFrame(animateHeading);
  }, []);

  // ── Device orientation ──────────────────────────────────────────────────────
  useEffect(() => {
    // Check for iOS permission requirement
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      setCompassStatus("needsPermission");
      return;
    }

    if (typeof DeviceOrientationEvent === "undefined") {
      setCompassStatus("unsupported");
      return;
    }

    const handler = (e) => {
      let h = null;

      if (typeof e.webkitCompassHeading === "number") {
        // iOS Safari (most reliable)
        h = e.webkitCompassHeading;
        setNeedsCalibration(
          e.webkitCompassAccuracy !== undefined && e.webkitCompassAccuracy > 25
        );
      } else if (e.alpha !== null && e.alpha !== undefined) {
        // Android / others
        h = (360 - e.alpha) % 360;
        setNeedsCalibration(false);
      }

      if (h !== null) {
        headingRaw.current = h;
        setCompassStatus("active");
      }
    };

    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation", handler, true);
    rafRef.current = requestAnimationFrame(animateHeading);

    // After 3 sec, if still no heading → unsupported
    const timer = setTimeout(() => {
      if (headingRaw.current === null) setCompassStatus("unsupported");
    }, 3000);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handler, true);
      window.removeEventListener("deviceorientation", handler, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
    };
  }, [animateHeading]);

  const requestIOSPermission = async () => {
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result === "granted") window.location.reload();
      else setCompassStatus("unsupported");
    } catch {
      setCompassStatus("unsupported");
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const qiblaBearing = location ? calculateQibla(location.lat, location.lng) : 0;
  const distance = location ? distanceToKaabah(location.lat, location.lng) : 0;
  const compassLabel = getCompassLabel(qiblaBearing);

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          to="/more"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card shadow-sm hover:bg-accent/30 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Direction</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Qibla Finder</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-card p-16">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Getting your location…</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-10 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); setLocation(null); }}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Calibration warning ── */}
          {needsCalibration && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4">
              <RotateCcw className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Compass needs calibration</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Slowly move your phone in a figure-8 shape a few times to improve accuracy.
                </p>
              </div>
            </div>
          )}

          {/* ── iOS permission ── */}
          {compassStatus === "needsPermission" && (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Enable Compass</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap below to allow compass access for live Qibla direction.
                </p>
              </div>
              <button
                onClick={requestIOSPermission}
                className="rounded-full bg-primary px-7 py-2.5 text-sm font-bold text-primary-foreground shadow-md"
              >
                Enable Compass
              </button>
            </div>
          )}

          {/* ── Desktop / no compass notice ── */}
          {compassStatus === "unsupported" && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-400/30 bg-blue-50 dark:bg-blue-950/20 p-4">
              <Smartphone className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Live compass not available</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Open on a mobile device for a live compass. Below is your exact Qibla bearing.
                </p>
              </div>
            </div>
          )}

          {/* ── Main compass card ── */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm">
            {/* Islamic pattern background */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23178b50' fill-opacity='1'%3E%3Cpath d='M30 0l5 10 10 5-10 5-5 10-5-10-10-5 10-5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative flex flex-col items-center gap-6">
              <QiblaCompass qiblaBearing={qiblaBearing} deviceHeading={deviceHeading} />

              {/* Bearing display */}
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-heading text-5xl font-bold text-primary">
                    {Math.round(qiblaBearing)}°
                  </span>
                  <span className="text-xl font-bold text-muted-foreground">{compassLabel}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {compassStatus === "active"
                    ? "Rotate until the green needle points forward ↑"
                    : `Face ${compassLabel} (${Math.round(qiblaBearing)}°) from North`
                  }
                </p>
                {compassStatus === "active" && deviceHeading !== null && (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Device heading: {deviceHeading}° {getCompassLabel(deviceHeading)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Info cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 mx-auto">
                <Navigation2 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Distance to Ka'bah</p>
              <p className="mt-1 font-heading text-2xl font-bold text-primary">
                {Math.round(distance).toLocaleString()}
                <span className="text-sm font-medium text-muted-foreground ml-1">km</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
              <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 mx-auto">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Your Location</p>
              <p className="mt-1 text-sm font-bold">
                {location.lat.toFixed(3)}°
              </p>
              <p className="text-sm font-bold">
                {location.lng.toFixed(3)}°
              </p>
            </div>
          </div>

          {/* ── Calibration tips ── */}
          {compassStatus === "active" && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground/70">Tips for accuracy</p>
                  <p>• Move in a figure-8 if compass seems off</p>
                  <p>• Keep away from metal objects & electronics</p>
                  <p>• Best accuracy outdoors, away from buildings</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}