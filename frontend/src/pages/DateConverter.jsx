import { useState } from "react";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { gregorianToHijri, hijriToGregorian, HIJRI_MONTHS } from "@/lib/hijriDate";

// Hijri conversion imported from @/lib/hijriDate
const GREG_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function DateConverter() {
  const navigate = useNavigate();
  const today = new Date();
  const [mode, setMode] = useState("g2h"); // "g2h" or "h2g"
  const [gDay, setGDay] = useState(today.getDate());
  const [gMonth, setGMonth] = useState(today.getMonth() + 1);
  const [gYear, setGYear] = useState(today.getFullYear());
  const todayH = gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [hDay, setHDay] = useState(todayH.day);
  const [hMonth, setHMonth] = useState(todayH.month);
  const [hYear, setHYear] = useState(todayH.year);

  const result = mode === "g2h"
    ? gregorianToHijri(gYear, gMonth, gDay)
    : hijriToGregorian(hYear, hMonth, hDay);

  const resultDate = mode === "g2h"
    ? `${result.day} ${HIJRI_MONTHS[result.month - 1]} ${result.year} AH`
    : (() => {
        const d = new Date(result.year, result.month - 1, result.day);
        return `${WEEKDAYS[d.getDay()]}, ${result.day} ${GREG_MONTHS[result.month - 1]} ${result.year} CE`;
      })();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Converter</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Date Converter</h1>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <button
          onClick={() => setMode("g2h")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${mode === "g2h" ? "bg-primary text-primary-foreground shadow" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
        >
          Gregorian → Hijri
        </button>
        <button
          onClick={() => setMode("h2g")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${mode === "h2g" ? "bg-primary text-primary-foreground shadow" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
        >
          Hijri → Gregorian
        </button>
      </div>

      {/* Input */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {mode === "g2h" ? "Gregorian Date" : "Hijri Date"}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Day</label>
            <input
              type="number"
              min={1} max={31}
              value={mode === "g2h" ? gDay : hDay}
              onChange={(e) => mode === "g2h" ? setGDay(Number(e.target.value)) : setHDay(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center font-heading text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Month</label>
            <select
              value={mode === "g2h" ? gMonth : hMonth}
              onChange={(e) => mode === "g2h" ? setGMonth(Number(e.target.value)) : setHMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-2 py-2.5 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {(mode === "g2h" ? GREG_MONTHS : HIJRI_MONTHS).map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Year</label>
            <input
              type="number"
              value={mode === "g2h" ? gYear : hYear}
              onChange={(e) => mode === "g2h" ? setGYear(Number(e.target.value)) : setHYear(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center font-heading text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="my-4 flex justify-center">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
      </div>

      {/* Result */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {mode === "g2h" ? "Hijri Date" : "Gregorian Date"}
        </p>
        <p className="mt-2 font-heading text-2xl font-bold">{resultDate}</p>
      </div>
    </div>
  );
}
