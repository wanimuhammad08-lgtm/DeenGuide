import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Bell, List, CalendarDays, Loader2 } from "lucide-react";
import { gregorianToHijri, HIJRI_MONTHS, fetchMonthCalendar, fetchUpcomingEvents } from "@/lib/hijriDate";
import { Link, useNavigate } from "react-router-dom";

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function IslamicCalendar() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState("calendar");

  // Location from localStorage (shared with PrayerTimes)
  const [location] = useState(() => {
    const saved = localStorage.getItem("dg_location");
    return saved ? JSON.parse(saved) : null;
  });

  // Live API data
  const [calendarData, setCalendarData] = useState(null);
  const [loadingCal, setLoadingCal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Today's Hijri (instant, for header)
  const todayHijri = useMemo(
    () => gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    [today]
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Fetch calendar data from Aladhan API when month/year changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingCal(true);
      const lat = location?.lat || 21.42;
      const lng = location?.lng || 39.83;
      try {
        const data = await fetchMonthCalendar(viewYear, viewMonth, lat, lng);
        if (!cancelled) setCalendarData(data);
      } catch {
        if (!cancelled) setCalendarData(null);
      }
      if (!cancelled) setLoadingCal(false);
    }
    load();
    return () => { cancelled = true; };
  }, [viewYear, viewMonth, location]);

  // Fetch upcoming events
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingEvents(true);
      const lat = location?.lat || 21.42;
      const lng = location?.lng || 39.83;
      try {
        const events = await fetchUpcomingEvents(lat, lng, 13);
        if (!cancelled) setUpcomingEvents(events);
      } catch {
        if (!cancelled) setUpcomingEvents([]);
      }
      if (!cancelled) setLoadingEvents(false);
    }
    load();
    return () => { cancelled = true; };
  }, [location]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build calendar grid cells using API data or fallback
  const cells = useMemo(() => {
    const arr = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      const prevDays = getDaysInMonth(viewYear, viewMonth - 1 || 12);
      arr.push({ day: prevDays - firstDay + i + 1, current: false });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const apiDay = calendarData?.find(cd => cd.day === d);
      if (apiDay) {
        arr.push({
          day: d,
          current: true,
          hijriDay: apiDay.hijri.day,
          hijriMonth: apiDay.hijri.month,
          hijriYear: apiDay.hijri.year,
          holidays: apiDay.holidays,
        });
      } else {
        // Fallback to local conversion
        const hijri = gregorianToHijri(viewYear, viewMonth, d);
        arr.push({ day: d, current: true, hijriDay: hijri.day, hijriMonth: hijri.month, hijriYear: hijri.year, holidays: [] });
      }
    }
    // Trailing empty cells
    const remaining = 42 - arr.length;
    for (let i = 1; i <= remaining; i++) {
      arr.push({ day: i, current: false });
    }
    return arr;
  }, [viewYear, viewMonth, daysInMonth, firstDay, calendarData]);

  // Hijri range for the month header
  const firstHijri = calendarData?.[0]?.hijri || gregorianToHijri(viewYear, viewMonth, 1);
  const lastHijri = calendarData?.[calendarData.length - 1]?.hijri || gregorianToHijri(viewYear, viewMonth, daysInMonth);

  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const hasEvent = (cell) => cell.holidays && cell.holidays.length > 0;

  // Events visible in calendar view (this month)
  const monthEvents = cells.filter(c => c.current && hasEvent(c));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-xl font-bold">Islamic Calendar</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("calendar")}
            className={`grid h-10 w-10 place-items-center rounded-full border transition ${viewMode === "calendar" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("events")}
            className={`grid h-10 w-10 place-items-center rounded-full border transition ${viewMode === "events" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="font-heading text-lg font-bold">{MONTHS[viewMonth - 1]}, {viewYear}</p>
              <p className="text-xs text-primary font-semibold">
                {firstHijri.monthName || HIJRI_MONTHS[firstHijri.month - 1]} {firstHijri.year}
                {lastHijri.month !== firstHijri.month && ` – ${lastHijri.monthName || HIJRI_MONTHS[lastHijri.month - 1]} ${lastHijri.year}`}
              </p>
            </div>
            <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="rounded-2xl border border-border bg-card p-4">
            {loadingCal && (
              <div className="flex items-center justify-center py-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                <span className="text-xs text-muted-foreground">Updating dates...</span>
              </div>
            )}
            <div className="mb-3 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                const evt = cell.current && hasEvent(cell);
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center rounded-xl py-1.5 text-center transition ${
                      !cell.current ? "text-muted-foreground/40" :
                      isToday(cell.day) ? "bg-primary text-primary-foreground font-bold" :
                      evt ? "bg-red-500/15 text-red-600 dark:text-red-400 font-semibold" :
                      "hover:bg-accent"
                    }`}
                    title={evt ? cell.holidays.join(", ") : ""}
                  >
                    <span className="text-sm">{cell.day}</span>
                    {cell.current && cell.hijriDay && (
                      <span className={`text-[9px] ${isToday(cell.day) ? "text-primary-foreground/70" : "text-primary"}`}>
                        {cell.hijriDay}
                      </span>
                    )}
                    {evt && (
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events this month (from API) */}
          {monthEvents.length > 0 && (
            <div className="space-y-2">
              {monthEvents.map((c) => (
                <div key={`${c.day}-${c.holidays[0]}`} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {c.holidays.map((holiday, hi) => (
                    <div key={hi} className={`flex items-center gap-4 p-4 ${hi > 0 ? "border-t border-border" : ""}`}>
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-red-500 text-white text-xs font-bold">
                        <span>{c.day}</span>
                        <span className="text-[9px]">{MONTHS[viewMonth - 1].slice(0, 3)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-heading text-sm font-bold">{holiday}</p>
                        <p className="text-xs text-muted-foreground">{c.hijriDay} {HIJRI_MONTHS[c.hijriMonth - 1]} {c.hijriYear}</p>
                      </div>
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loadingCal && monthEvents.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No Islamic events this month</p>
            </div>
          )}
        </div>
      ) : (
        /* Events list view — live from API */
        <div className="space-y-0">
          {/* Today */}
          <div className="flex items-center gap-4 border-l-2 border-primary py-4 pl-6">
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow">
              <span>{today.getDate()}</span>
              <span className="text-[9px]">{MONTHS[today.getMonth()].slice(0, 3)}</span>
            </div>
            <div>
              <p className="font-heading font-bold">{todayHijri.day} {HIJRI_MONTHS[todayHijri.month - 1]}, {todayHijri.year}</p>
              <p className="text-xs text-primary font-semibold">Today</p>
            </div>
          </div>

          {loadingEvents && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading upcoming events...</span>
            </div>
          )}

          {!loadingEvents && upcomingEvents.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No upcoming events found
            </div>
          )}

          {upcomingEvents.map((evt, i) => (
            <div key={i} className="flex items-center gap-4 border-l-2 border-border py-4 pl-6">
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-border bg-card text-xs font-bold">
                <span>{evt.gregorianDate.getDate()}</span>
                <span className="text-[9px] text-muted-foreground">{MONTHS[evt.gregorianDate.getMonth()].slice(0, 3)}</span>
              </div>
              <div className="flex-1">
                <p className="font-heading text-sm font-bold">{evt.label}</p>
                <p className="text-xs text-muted-foreground">{evt.hijriDate}</p>
                {evt.daysUntil > 0 && <p className="text-xs text-primary font-medium">{evt.daysUntil} days left</p>}
                {evt.daysUntil === 0 && <p className="text-xs text-red-500 font-semibold">Today!</p>}
              </div>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
