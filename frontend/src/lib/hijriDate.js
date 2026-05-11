// Centralized Hijri Date Utilities
// Uses Aladhan API for location-aware, accurate Hijri dates
// Falls back to browser Intl.DateTimeFormat when API is unavailable

export const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi ul-Awwal", "Rabi ul-Thani",
  "Jumada al-Ula", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhul-Qadah", "Dhul-Hijjah",
];

// In-memory cache to avoid redundant API calls
const cache = {};

function cacheKey(prefix, ...args) {
  return `${prefix}:${args.join(":")}`;
}

// ─── Client-side Hijri conversion (instant, no API) ───────────────────────

/**
 * Convert Gregorian date to Hijri using browser's Intl API.
 * Instant, no network needed. Uses Umm al-Qura calendar.
 * @param {number} gY - Gregorian year
 * @param {number} gM - Gregorian month (1-12)
 * @param {number} gD - Gregorian day
 * @returns {{ year: number, month: number, day: number }}
 */
export function gregorianToHijri(gY, gM, gD) {
  try {
    const date = new Date(gY, gM - 1, gD);
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value, 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value, 10);
    const day = parseInt(parts.find(p => p.type === 'day')?.value, 10);
    return { year, month, day };
  } catch {
    return gregorianToHijriFallback(gY, gM, gD);
  }
}

function gregorianToHijriFallback(gY, gM, gD) {
  const jd = Math.floor((1461 * (gY + 4800 + Math.floor((gM - 14) / 12))) / 4)
    + Math.floor((367 * (gM - 2 - 12 * Math.floor((gM - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((gY + 4900 + Math.floor((gM - 14) / 12)) / 100)) / 4)
    + gD - 32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const lr = l - 10631 * n + 354;
  const j = Math.floor((10985 - lr) / 5316) * Math.floor((50 * lr) / 17719)
    + Math.floor(lr / 5670) * Math.floor((43 * lr) / 15238);
  const ld = lr - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hM = Math.floor((24 * ld) / 709);
  const hD = ld - Math.floor((709 * hM) / 24);
  const hY = 30 * n + j - 30;
  return { year: hY, month: hM, day: hD };
}

/**
 * Convert Hijri date to Gregorian (algorithmic).
 */
export function hijriToGregorian(hY, hM, hD) {
  const jd = Math.floor((11 * hY + 3) / 30) + 354 * hY + 30 * hM
    - Math.floor((hM - 1) / 2) + hD + 1948440 - 385;
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const ll = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (ll + 1)) / 1461001);
  const lll = ll - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * lll) / 2447);
  const gD = lll - Math.floor((2447 * j) / 80);
  const l2 = Math.floor(j / 11);
  const gM = j + 2 - 12 * l2;
  const gY = 100 * (n - 49) + i + l2;
  return { year: gY, month: gM, day: gD };
}

export function formatHijriDate(hijri) {
  return `${hijri.day} ${HIJRI_MONTHS[hijri.month - 1]} ${hijri.year} AH`;
}

// ─── Strict Islamic Event Rules ─────────────────────────────────────────────
// Generates events strictly based on Hijri month and day.
// Excludes unverified/weakly sourced events (Mawlid, Shab-e-Barat, etc.)
// Adapts automatically to local region since hMonth/hDay are fetched dynamically.

export function getStrictIslamicEvents(hMonth, hDay) {
  const events = [];

  // 1. Muharram
  if (hMonth === 1 && hDay === 10) {
    events.push("Day of Aashoraa");
  }

  // 9. Ramadan
  if (hMonth === 9) {
    if (hDay === 1) events.push("First Day of Ramadan");
    if (hDay === 20) events.push("Lailat-ul-Qadr - First");
  }

  // 10. Shawwal
  if (hMonth === 10 && hDay === 1) {
    events.push("Eid-ul-Fitr");
  }

  // 12. Dhul Hijjah
  if (hMonth === 12) {
    if (hDay === 8) events.push("Hajj Starting Day");
    if (hDay === 9) events.push("Arafa Day");
    if (hDay === 10) events.push("Eid-ul-Adha");
  }

  return events;
}

// ─── Aladhan API: Live, location-aware Hijri dates ────────────────────────

const ALADHAN_BASE = "https://api.aladhan.com/v1";

/**
 * Fetch today's Hijri date from the Aladhan API (location-aware).
 * Falls back to Intl-based conversion.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ year: number, month: number, day: number, monthName: string, weekday: string, holidays: string[] }>}
 */
export async function fetchTodayHijri(lat, lng) {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const key = cacheKey("today", dd, mm, yyyy, lat?.toFixed(2), lng?.toFixed(2));

  if (cache[key]) return cache[key];

  try {
    const url = `${ALADHAN_BASE}/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 200 && data.data?.date?.hijri) {
      const h = data.data.date.hijri;
      const result = {
        year: parseInt(h.year, 10),
        month: parseInt(h.month.number, 10),
        day: parseInt(h.day, 10),
        monthName: h.month.en,
        weekday: h.weekday.en,
        holidays: getStrictIslamicEvents(parseInt(h.month.number, 10), parseInt(h.day, 10)),
      };
      cache[key] = result;
      return result;
    }
  } catch { /* fall through */ }

  // Fallback
  const fb = gregorianToHijri(yyyy, today.getMonth() + 1, today.getDate());
  return { ...fb, monthName: HIJRI_MONTHS[fb.month - 1], weekday: "", holidays: getStrictIslamicEvents(fb.month, fb.day) };
}

/**
 * Fetch a full Gregorian month's calendar with Hijri dates + holidays from Aladhan API.
 * Returns an array of day objects, one per day.
 * @param {number} year - Gregorian year
 * @param {number} month - Gregorian month (1-12)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Array<{ day: number, hijri: { year, month, day, monthName }, holidays: string[] }>>}
 */
export async function fetchMonthCalendar(year, month, lat, lng) {
  const key = cacheKey("cal", year, month, lat?.toFixed(2), lng?.toFixed(2));
  if (cache[key]) return cache[key];

  try {
    const url = `${ALADHAN_BASE}/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 200 && Array.isArray(data.data)) {
      const result = data.data.map((d) => {
        const h = d.date.hijri;
        return {
          day: parseInt(d.date.gregorian.day, 10),
          hijri: {
            year: parseInt(h.year, 10),
            month: parseInt(h.month.number, 10),
            day: parseInt(h.day, 10),
            monthName: h.month.en,
          },
          holidays: getStrictIslamicEvents(parseInt(h.month.number, 10), parseInt(h.day, 10)),
        };
      });
      cache[key] = result;
      return result;
    }
  } catch { /* fall through */ }

  // Fallback: generate from local conversion
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const h = gregorianToHijri(year, month, d);
    result.push({
      day: d,
      hijri: { ...h, monthName: HIJRI_MONTHS[h.month - 1] },
      holidays: getStrictIslamicEvents(h.month, h.day),
    });
  }
  return result;
}

/**
 * Fetch upcoming Islamic holidays/events for the next N months from Aladhan API.
 * Scans upcoming Gregorian months and collects all holidays found.
 * @param {number} lat
 * @param {number} lng
 * @param {number} monthsAhead - How many months to scan (default 13)
 * @returns {Promise<Array<{ label, gregorianDate: Date, hijriDate: string, daysUntil: number }>>}
 */
export async function fetchUpcomingEvents(lat, lng, monthsAhead = 13) {
  const key = cacheKey("events", lat?.toFixed(2), lng?.toFixed(2), monthsAhead);
  if (cache[key]) return cache[key];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = [];
  const seen = new Set();

  for (let offset = 0; offset < monthsAhead; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    try {
      const calData = await fetchMonthCalendar(year, month, lat, lng);
      for (const dayData of calData) {
        if (dayData.holidays && dayData.holidays.length > 0) {
          const gregDate = new Date(year, month - 1, dayData.day);
          gregDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.round((gregDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntil < -1) continue;

          for (const label of dayData.holidays) {
            const uniqueKey = label; // deduplicate by label to show multi-day events only once
            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);

            events.push({
              label,
              gregorianDate: gregDate,
              hijriDate: `${dayData.hijri.day} ${dayData.hijri.monthName} ${dayData.hijri.year}`,
              hijriMonth: dayData.hijri.month,
              hijriDay: dayData.hijri.day,
              hijriYear: dayData.hijri.year,
              daysUntil: Math.max(0, daysUntil),
            });
          }
        }
      }
    } catch {
      // Skip failed months
    }
  }

  events.sort((a, b) => a.daysUntil - b.daysUntil);
  cache[key] = events;
  return events;
}
