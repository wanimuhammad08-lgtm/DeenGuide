import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Navigation, Loader2, RotateCcw, Smartphone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const KAABAH = { lat: 21.4225, lng: 39.8262 };

function calculateQibla(lat, lng) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABAH.lat * Math.PI) / 180;
  const Δλ = ((KAABAH.lng - lng) * Math.PI) / 180;
  const x = Math.sin(Δλ);
  const y = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  let bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
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

function getCompassDirection(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function QiblaDirection() {
  // Location state — try localStorage first (shared with PrayerTimes)
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem("dg_location");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!location);
  const [heading, setHeading] = useState(null);
  const [compassSupported, setCompassSupported] = useState(false);
  const [compassChecked, setCompassChecked] = useState(false);
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const headingRef = useRef(null);
  const smoothHeadingRef = useRef(null);
  const rafRef = useRef(null);

  // Get location if not already saved
  useEffect(() => {
    if (location) {
      setLoading(false);
      return;
    }
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLoading(false);
      },
      () => {
        setError("Unable to get your location. Please allow location access.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [location]);

  // Smooth heading updates using requestAnimationFrame
  const updateSmoothing = useCallback(() => {
    if (headingRef.current !== null) {
      if (smoothHeadingRef.current === null) {
        smoothHeadingRef.current = headingRef.current;
      } else {
        // Smooth interpolation (handle 0/360 wraparound)
        let diff = headingRef.current - smoothHeadingRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        smoothHeadingRef.current = (smoothHeadingRef.current + diff * 0.15 + 360) % 360;
      }
      setHeading(smoothHeadingRef.current);
    }
    rafRef.current = requestAnimationFrame(updateSmoothing);
  }, []);

  // Device orientation (compass)
  useEffect(() => {
    const handler = (e) => {
      // Check calibration accuracy
      if (e.absolute === false && e.alpha === null) {
        setNeedsCalibration(true);
        return;
      }

      let newHeading = null;

      if (e.webkitCompassHeading !== undefined) {
        // iOS Safari
        newHeading = e.webkitCompassHeading;
        if (e.webkitCompassAccuracy && e.webkitCompassAccuracy < 0) {
          setNeedsCalibration(true);
        } else {
          setNeedsCalibration(false);
        }
      } else if (e.alpha !== null) {
        // Android / other browsers
        // For absolute orientation, alpha is the compass heading
        if (e.absolute) {
          newHeading = (360 - e.alpha) % 360;
        } else {
          newHeading = (360 - e.alpha) % 360;
        }
        setNeedsCalibration(false);
      }

      if (newHeading !== null) {
        headingRef.current = newHeading;
        setCompassSupported(true);
      }
    };

    const startListening = () => {
      window.addEventListener("deviceorientation", handler, true);
      // Also try absolute orientation
      window.addEventListener("deviceorientationabsolute", handler, true);
      // Start smoothing loop
      rafRef.current = requestAnimationFrame(updateSmoothing);
    };

    // Check if we need to request permission (iOS 13+)
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      setPermissionNeeded(true);
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      startListening();
      // Check after a short delay if compass is actually working
      setTimeout(() => {
        if (headingRef.current === null) {
          setCompassSupported(false);
        }
        setCompassChecked(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener("deviceorientation", handler, true);
      window.removeEventListener("deviceorientationabsolute", handler, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateSmoothing]);

  const requestCompassPermission = async () => {
    try {
      const state = await DeviceOrientationEvent.requestPermission();
      if (state === "granted") {
        setPermissionNeeded(false);
        window.location.reload(); // Reload to start listening
      }
    } catch {
      setPermissionNeeded(false);
    }
  };

  const qiblaBearing = location ? calculateQibla(location.lat, location.lng) : 0;
  const distance = location ? distanceToKaabah(location.lat, location.lng) : 0;

  // Compass rotation: rotate the entire compass so Qibla arrow points to actual Qibla
  const compassRotation = heading !== null ? -heading : 0;
  // Qibla arrow always points at the qibla bearing on the compass
  const qiblaArrowRotation = qiblaBearing;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Direction</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Qibla Finder</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Getting your location...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Calibration warning */}
          {needsCalibration && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <RotateCcw className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Calibration Needed</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Move your phone in a figure-8 pattern several times to calibrate the compass for accurate Qibla direction.
                </p>
              </div>
            </div>
          )}

          {/* No-compass notice — only after detection period confirms compass isn't available */}
          {compassChecked && !compassSupported && !permissionNeeded && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <Smartphone className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Use on Mobile for Live Compass</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  The compass works best on a mobile device with a magnetometer. On desktop, the Qibla bearing ({Math.round(qiblaBearing)}° {getCompassDirection(qiblaBearing)}) is shown as a fixed direction.
                </p>
              </div>
            </div>
          )}

          {/* iOS Permission button */}
          {permissionNeeded && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6">
              <Smartphone className="h-8 w-8 text-primary" />
              <p className="text-sm text-center text-muted-foreground">
                Tap below to enable your device compass for live Qibla direction.
              </p>
              <button
                onClick={requestCompassPermission}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
              >
                Enable Compass
              </button>
            </div>
          )}

          {/* Compass */}
          <div className="relative flex flex-col items-center rounded-3xl border border-border bg-card p-8">
            <div className="relative h-64 w-64 sm:h-72 sm:w-72">
              {/* Rotating compass ring */}
              <div
                className="absolute inset-0 transition-transform"
                style={{
                  transform: `rotate(${compassRotation}deg)`,
                  transitionDuration: heading !== null ? "100ms" : "0ms",
                  transitionTimingFunction: "linear",
                }}
              >
                <svg viewBox="0 0 300 300" className="h-full w-full">
                  {/* Outer ring */}
                  <circle cx="150" cy="150" r="140" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                  <circle cx="150" cy="150" r="138" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />

                  {/* Degree marks */}
                  {Array.from({ length: 72 }).map((_, i) => {
                    const angle = i * 5;
                    const rad = (angle * Math.PI) / 180;
                    const isMajor = i % 18 === 0; // N, E, S, W
                    const isMid = i % 6 === 0; // 30° marks
                    const len = isMajor ? 12 : isMid ? 8 : 4;
                    const x1 = 150 + (140 - len) * Math.sin(rad);
                    const y1 = 150 - (140 - len) * Math.cos(rad);
                    const x2 = 150 + 140 * Math.sin(rad);
                    const y2 = 150 - 140 * Math.cos(rad);
                    return (
                      <line
                        key={i}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isMajor ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                        strokeWidth={isMajor ? 2 : 0.7}
                        opacity={isMajor ? 0.8 : 0.4}
                      />
                    );
                  })}

                  {/* Cardinal directions */}
                  {[
                    { label: "N", angle: 0, color: "hsl(var(--primary))" },
                    { label: "E", angle: 90, color: "hsl(var(--muted-foreground))" },
                    { label: "S", angle: 180, color: "hsl(var(--muted-foreground))" },
                    { label: "W", angle: 270, color: "hsl(var(--muted-foreground))" },
                  ].map(({ label, angle, color }) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = 150 + 120 * Math.sin(rad);
                    const y = 150 - 120 * Math.cos(rad);
                    return (
                      <text
                        key={label}
                        x={x} y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={color}
                        fontSize={label === "N" ? "16" : "12"}
                        fontWeight="bold"
                        fontFamily="system-ui, sans-serif"
                      >
                        {label}
                      </text>
                    );
                  })}

                  {/* North indicator triangle */}
                  <polygon points="150,12 145,22 155,22" fill="hsl(var(--primary))" />

                  {/* Qibla arrow */}
                  <g transform={`rotate(${qiblaArrowRotation}, 150, 150)`}>
                    {/* Arrow line */}
                    <line x1="150" y1="150" x2="150" y2="35" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
                    {/* Arrow head */}
                    <polygon points="150,25 143,42 157,42" fill="hsl(var(--primary))" />
                    {/* Qibla label */}
                    <text x="150" y="55" textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif">
                      QIBLA
                    </text>
                  </g>
                </svg>
              </div>

              {/* Ka'bah icon center (doesn't rotate) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-card border-2 border-primary/20 shadow-lg">
                  <span className="text-2xl">🕋</span>
                </div>
              </div>
            </div>

            {/* Bearing display */}
            <div className="mt-6 text-center">
              <p className="font-heading text-3xl font-bold text-primary">
                {Math.round(qiblaBearing)}°
                <span className="text-lg ml-1 text-muted-foreground font-medium">{getCompassDirection(qiblaBearing)}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {heading !== null
                  ? "Point your phone where the arrow points"
                  : `Face ${getCompassDirection(qiblaBearing)} (${Math.round(qiblaBearing)}°) from North`
                }
              </p>
              {heading !== null && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Device heading: {Math.round(heading)}° {getCompassDirection(heading)}
                </p>
              )}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Distance to Ka'bah</p>
              <p className="mt-1 font-heading text-xl font-bold text-primary">{Math.round(distance).toLocaleString()} km</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Your Coordinates</p>
              <p className="mt-1 text-sm font-semibold">{location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°</p>
            </div>
          </div>

          {/* Calibration tip — only show when compass is active */}
          {needsCalibration && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Calibrate Compass</p>
                  <ul className="mt-1 text-xs text-muted-foreground/80 space-y-0.5 list-disc pl-3">
                    <li>Move phone in a figure-8 to calibrate</li>
                    <li>Keep away from magnets and metal objects</li>
                    <li>Best accuracy outdoors, away from buildings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
