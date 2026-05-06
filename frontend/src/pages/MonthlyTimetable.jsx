import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Link } from "react-router-dom";
import { calculatePrayerTimes } from "@/lib/prayerTimes";
import { gregorianToHijri, fetchMonthCalendar, HIJRI_MONTHS } from "@/lib/hijriDate";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getTimezone() {
  return -new Date().getTimezoneOffset() / 60;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export default function MonthlyTimetable() {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Load location from localStorage (shared with PrayerTimes) or fallback
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem("dg_location");
    return saved ? JSON.parse(saved) : null;
  });
  const [locationName, setLocationName] = useState(() => {
    return localStorage.getItem("dg_location_name") || "";
  });

  // Live Hijri data from Aladhan API
  const [apiCalData, setApiCalData] = useState(null);
  const [loadingHijri, setLoadingHijri] = useState(false);

  const calcMethod = localStorage.getItem("dg_calc_method") || "karachi";
  const juristicMethod = localStorage.getItem("dg_juristic") || "shafi";
  const timezone = getTimezone();

  // Fallback to geolocation if no saved location
  useEffect(() => {
    if (location) return;
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          setLocationName(data.address?.city || data.address?.town || "Your Location");
        } catch { setLocationName("Your Location"); }
      },
      () => setLocation({ lat: 21.42, lng: 39.83 }) // default Makkah
    );
  }, [location]);

  // Fetch Hijri calendar data from Aladhan API
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoadingHijri(true);
    fetchMonthCalendar(viewYear, viewMonth, location.lat, location.lng)
      .then((data) => {
        if (!cancelled) setApiCalData(data);
      })
      .catch(() => {
        if (!cancelled) setApiCalData(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingHijri(false);
      });
    return () => { cancelled = true; };
  }, [viewYear, viewMonth, location]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  const monthData = useMemo(() => {
    if (!location) return [];
    const rows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth - 1, d);
      const times = calculatePrayerTimes(date, location.lat, location.lng, timezone, calcMethod, juristicMethod);

      // Use API Hijri data if available, otherwise fallback
      const apiDay = apiCalData?.find(cd => cd.day === d);
      const hijri = apiDay ? apiDay.hijri : gregorianToHijri(viewYear, viewMonth, d);

      const isToday = d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
      rows.push({
        day: d,
        weekday: WEEKDAYS_SHORT[date.getDay()],
        hijriDay: hijri.day,
        hijriMonth: HIJRI_MONTHS[hijri.month - 1],
        holidays: apiDay?.holidays || [],
        fajr: times.fajr.time,
        dhuhr: times.dhuhr.time,
        asr: times.asr.time,
        maghrib: times.maghrib.time,
        isha: times.isha.time,
        isToday,
      });
    }
    return rows;
  }, [location, viewYear, viewMonth, daysInMonth, timezone, calcMethod, juristicMethod, today, apiCalData]);

  // Hijri range for the month
  const firstHijri = apiCalData?.[0]?.hijri || (location ? gregorianToHijri(viewYear, viewMonth, 1) : null);
  const lastHijri = apiCalData?.[apiCalData?.length - 1]?.hijri || (location ? gregorianToHijri(viewYear, viewMonth, daysInMonth) : null);
  const hijriRange = firstHijri && lastHijri
    ? `${firstHijri.monthName || HIJRI_MONTHS[firstHijri.month - 1]} ${firstHijri.year}${lastHijri.month !== firstHijri.month ? ` – ${lastHijri.monthName || HIJRI_MONTHS[lastHijri.month - 1]} ${lastHijri.year}` : ""}`
    : "";

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleSharePdf = async () => {
    const element = document.getElementById("timetable-container");
    if (!element) return;
    
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const pdfBlob = pdf.output('blob');
      const filename = `Prayer-Timetable-${MONTHS[viewMonth - 1]}-${viewYear}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Prayer Timetable - ${locationName}`,
          files: [file]
        });
      } else {
        pdf.save(filename);
      }
    } catch (err) {
      console.error("Error generating PDF", err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <Link to="/prayer-times" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-xl font-bold">Monthly Prayer Time</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleSharePdf} disabled={generatingPdf} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-accent disabled:opacity-50 transition">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          </button>
          <button onClick={prevMonth} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-accent transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextMonth} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:bg-accent transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The content to be captured in PDF */}
      <div id="timetable-container" className="bg-background p-2 -mx-2 sm:mx-0 sm:p-0">
        {/* Hijri banner */}
        <div className="mb-4 rounded-2xl bg-primary p-4 text-center text-primary-foreground">
        <p className="font-heading text-sm font-bold">
          {loadingHijri ? "Loading Hijri dates..." : hijriRange}
        </p>
        <p className="text-xs opacity-80">Prayer Times in {locationName}</p>
      </div>

      {/* Month/Year */}
      <div className="mb-4 text-center">
        <p className="font-heading text-lg font-bold">{MONTHS[viewMonth - 1]} {viewYear}</p>
      </div>

      {/* Table */}
      {!location ? (
        <div className="p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-primary text-primary-foreground">
                <th className="px-2 py-3 text-left text-xs font-semibold">Day</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">{MONTHS[viewMonth - 1].slice(0, 3)}</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Hijri</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Fajr</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Dhuhr</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Asr</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Maghrib</th>
                <th className="px-2 py-3 text-center text-xs font-semibold">Isha</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((row) => (
                <tr
                  key={row.day}
                  className={`border-b border-border transition ${
                    row.isToday ? "bg-primary/10 font-bold" :
                    row.holidays.length > 0 ? "bg-red-500/5" :
                    "hover:bg-accent/50"
                  }`}
                  title={row.holidays.length > 0 ? row.holidays.join(", ") : ""}
                >
                  <td className="px-2 py-2.5 text-xs font-medium">{row.weekday}</td>
                  <td className="px-2 py-2.5 text-center text-xs">{row.day}</td>
                  <td className={`px-2 py-2.5 text-center text-xs ${
                    row.isToday ? "text-primary font-bold" :
                    row.holidays.length > 0 ? "text-red-500 font-bold" :
                    "text-primary/80"
                  }`}>
                    {row.hijriDay}
                    {row.holidays.length > 0 && <span className="ml-1">•</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs tabular-nums">{row.fajr}</td>
                  <td className="px-2 py-2.5 text-center text-xs tabular-nums">{row.dhuhr}</td>
                  <td className="px-2 py-2.5 text-center text-xs tabular-nums">{row.asr}</td>
                  <td className="px-2 py-2.5 text-center text-xs tabular-nums">{row.maghrib}</td>
                  <td className="px-2 py-2.5 text-center text-xs tabular-nums">{row.isha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
