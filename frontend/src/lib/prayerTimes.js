// Prayer Time Calculation Engine
// Based on astronomical formulas for sun position

const CALC_METHODS = [
  { id: "karachi", name: "University of Islamic Sciences, Karachi", fajrAngle: 18.0, ishaAngle: 18.0 },
  { id: "mwl", name: "Muslim World League", fajrAngle: 18.0, ishaAngle: 17.0 },
  { id: "egypt", name: "Egyptian General Authority of Survey", fajrAngle: 19.5, ishaAngle: 17.5 },
  { id: "umm_al_qura", name: "Umm Al-Qura Committee", fajrAngle: 18.5, ishaAngle: 0, ishaMinutes: 90 },
  { id: "north_america", name: "North America (ISNA)", fajrAngle: 15.0, ishaAngle: 15.0 },
  { id: "france", name: "Organisations Islamiques de France", fajrAngle: 12.0, ishaAngle: 12.0 },
  { id: "singapore", name: "Majlis Ugama Islam Singapura", fajrAngle: 20.0, ishaAngle: 18.0 },
  { id: "turkey", name: "Diyanet İşleri Başkanlığı, Turkey", fajrAngle: 18.0, ishaAngle: 17.0 },
  { id: "russia", name: "Spiritual Administration of Muslims of Russia", fajrAngle: 16.0, ishaAngle: 15.0 },
  { id: "tunisia", name: "Tunisian Ministry of Religious Affairs", fajrAngle: 18.0, ishaAngle: 18.0 },
  { id: "algeria", name: "Algerian Ministry of Religious Affairs and Wakfs", fajrAngle: 18.0, ishaAngle: 17.0 },
  { id: "kemenag", name: "Sihat/Kemenag", fajrAngle: 20.0, ishaAngle: 18.0 },
  { id: "jakim", name: "JAKIM", fajrAngle: 18.0, ishaAngle: 18.0 },
  { id: "jafri", name: "Shia Ithna-Ashari, Leva Institute, Qum (Jafri)", fajrAngle: 16.0, ishaAngle: 14.0 },
];

const JURISTIC_METHODS = [
  { id: "shafi", name: "Shafi / Maliki / Hanbali", shadowFactor: 1 },
  { id: "hanafi", name: "Hanafi", shadowFactor: 2 },
];

// Math helpers
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const sin = (d) => Math.sin(rad(d));
const cos = (d) => Math.cos(rad(d));
const tan = (d) => Math.tan(rad(d));
const arcsin = (x) => deg(Math.asin(x));
const arccos = (x) => deg(Math.acos(x));
const arctan2 = (y, x) => deg(Math.atan2(y, x));
const fixHour = (h) => ((h % 24) + 24) % 24;

// Julian date from Gregorian
function julianDate(year, month, day) {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

// Sun position calculations
function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * sin(g) + 0.020 * sin(2 * g)) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const decl = arcsin(sin(e) * sin(L));
  const eqt = q / 15 - fixHour(RA);
  return { declination: decl, equation: eqt };
}

// Compute mid-day (Dhuhr) time
function midDay(jd, timezone, lng) {
  const sun = sunPosition(jd + 0.5);
  return fixHour(12 - sun.equation - lng / 15 + timezone);
}

// Time for a given angle below horizon
function sunAngleTime(jd, angle, lat, timezone, lng, direction) {
  const sun = sunPosition(jd + 0.5);
  const decl = sun.declination;
  const noon = midDay(jd, timezone, lng);
  const t = (1 / 15) * arccos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat)));
  return noon + (direction === "ccw" ? -t : t);
}

// Asr time
function asrTime(jd, shadowFactor, lat, timezone, lng) {
  const sun = sunPosition(jd + 0.5);
  const decl = sun.declination;
  const noon = midDay(jd, timezone, lng);
  const angle = -arccos((sin(arccos(1 / (shadowFactor + tan(Math.abs(lat - decl))))) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat)));
  // fallback calculation
  const a = Math.atan(1 / (shadowFactor + Math.tan(rad(Math.abs(lat - decl)))));
  const cosT = (Math.sin(a) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
  const t = deg(Math.acos(Math.max(-1, Math.min(1, cosT)))) / 15;
  return noon + t;
}

// Main calculation function
export function calculatePrayerTimes(date, lat, lng, timezone, calcMethodId = "karachi", juristicId = "shafi") {
  const method = CALC_METHODS.find((m) => m.id === calcMethodId) || CALC_METHODS[0];
  const juristic = JURISTIC_METHODS.find((j) => j.id === juristicId) || JURISTIC_METHODS[0];

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const jd = julianDate(year, month, day);

  const dhuhr = midDay(jd, timezone, lng);
  const sunrise = sunAngleTime(jd, 0.833, lat, timezone, lng, "ccw");
  const fajr = sunAngleTime(jd, method.fajrAngle, lat, timezone, lng, "ccw");
  const sunset = sunAngleTime(jd, 0.833, lat, timezone, lng, "cw");
  const maghrib = sunset;
  const asr = asrTime(jd, juristic.shadowFactor, lat, timezone, lng);

  let isha;
  if (method.ishaMinutes) {
    isha = maghrib + method.ishaMinutes / 60;
  } else {
    isha = sunAngleTime(jd, method.ishaAngle, lat, timezone, lng, "cw");
  }

  // Qiyam (last third of night)
  const nightDuration = (fajr + 24 - maghrib);
  const qiyam = fajr - nightDuration / 3;

  const format = (hours) => {
    if (isNaN(hours)) return "--:--";
    const h = fixHour(hours);
    const hr = Math.floor(h);
    const min = Math.round((h - hr) * 60);
    const period = hr >= 12 ? "PM" : "AM";
    const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${hr12}:${String(min).padStart(2, "0")} ${period}`;
  };

  const toMs = (hours) => {
    if (isNaN(hours)) return null;
    const h = fixHour(hours);
    const d = new Date(date);
    d.setHours(Math.floor(h), Math.round((h - Math.floor(h)) * 60), 0, 0);
    return d.getTime();
  };

  return {
    fajr: { name: "Fajr", time: format(fajr), ms: toMs(fajr), icon: "fajr" },
    sunrise: { name: "Sunrise", time: format(sunrise), ms: toMs(sunrise), icon: "sunrise" },
    dhuhr: { name: "Dhuhr", time: format(dhuhr), ms: toMs(dhuhr), icon: "dhuhr" },
    asr: { name: "Asr", time: format(asr), ms: toMs(asr), icon: "asr" },
    maghrib: { name: "Maghrib", time: format(maghrib), ms: toMs(maghrib), icon: "maghrib" },
    isha: { name: "Isha", time: format(isha), ms: toMs(isha), icon: "isha" },
    qiyam: { name: "Qiyam", time: format(fixHour(qiyam)), ms: toMs(fixHour(qiyam)), icon: "qiyam" },
  };
}

// Get current/next prayer
export function getCurrentPrayer(times) {
  const now = Date.now();
  // Standard daytime prayer order (qiyam handled separately)
  const dayOrder = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

  // Check if we are in the late-night qiyam period:
  // Qiyam is active from its start time until fajr.
  // Qiyam time can be before midnight (same ms day) or after midnight.
  const qiyamMs = times.qiyam?.ms;
  const fajrMs = times.fajr?.ms;

  if (qiyamMs && fajrMs) {
    // If current time is before fajr today
    if (now < fajrMs) {
      // We are in the pre-fajr window. Check if qiyam has started.
      // Since qiyam time from calculation is set on today's date but represents
      // late night (e.g. 1:26 AM), check if now >= qiyam's ms
      if (now >= qiyamMs) {
        return { current: "qiyam", next: "fajr" };
      }
      // Before qiyam time but still before fajr → isha from previous night is still "current"
      return { current: "isha", next: "qiyam" };
    }
  }

  // Standard daytime flow: iterate backwards to find the latest prayer that has passed
  for (let i = dayOrder.length - 1; i >= 0; i--) {
    const t = times[dayOrder[i]];
    if (t.ms && now >= t.ms) {
      const nextIdx = i + 1;
      if (nextIdx < dayOrder.length) {
        return { current: dayOrder[i], next: dayOrder[nextIdx] };
      }
      // After isha → next is qiyam
      return { current: dayOrder[i], next: "qiyam" };
    }
  }

  // Fallback: before fajr
  return { current: "qiyam", next: "fajr" };
}

export { CALC_METHODS, JURISTIC_METHODS };
