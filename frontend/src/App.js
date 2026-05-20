import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { AIProvider } from "@/context/AIContext";
import { AuthProvider } from "@/context/AuthContext";

// Force light mode — remove any stored dark preference
if (typeof window !== "undefined") {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("deenguide-theme");
}
import Home from "@/pages/Home";
import Ask from "@/pages/Ask";
import Quran from "@/pages/Quran";
import SurahReader from "@/pages/SurahReader";
import Hadith from "@/pages/Hadith";
import Duas from "@/pages/Duas";
import DuaCategory from "@/pages/DuaCategory";
import Bookmarks from "@/pages/Bookmarks";
import PrayerTimes from "@/pages/PrayerTimes";
import MonthlyTimetable from "@/pages/MonthlyTimetable";
import More from "@/pages/More";
import TasbihCounter from "@/pages/TasbihCounter";
import IslamicCalendar from "@/pages/IslamicCalendar";
import NamesOfAllah from "@/pages/NamesOfAllah";
import QiblaDirection from "@/pages/QiblaDirection";
import MenstrualGuide from "@/pages/MenstrualGuide";
import HajjGuide from "@/pages/HajjGuide";
import UmrahGuide from "@/pages/UmrahGuide";
import DateConverter from "@/pages/DateConverter";
import ZakatCalculator from "@/pages/ZakatCalculator";
import AppSettings from "@/pages/AppSettings";
import Help from "@/pages/Help";
import UserProfile from "@/pages/UserProfile";
import AdminDashboard from "@/pages/AdminDashboard";

function ServerWakeup() {
  const toastId = useRef(null);
  const isLocalhost = window.location.hostname === "localhost";
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ||
    (isLocalhost ? "http://127.0.0.1:8001" : "https://deenguide.onrender.com");

  useEffect(() => {
    // On localhost the server is always running — skip the wakeup ping
    if (isLocalhost) return;

    // Check if server was recently confirmed alive (within 14 minutes)
    const lastAlive = parseInt(sessionStorage.getItem("dg_server_alive") || "0");
    if (Date.now() - lastAlive < 14 * 60 * 1000) return; // Server was alive recently

    let timer;
    let done = false;

    // Only show toast after 8 seconds (most requests finish faster)
    timer = setTimeout(() => {
      if (!done) {
        toastId.current = "server-wake";
        toast.loading(
          "Loading content… Please wait a moment.",
          { duration: Infinity, id: "server-wake" }
        );
      }
    }, 8000);

    // Ping /api/ to wake the server — with retry
    const ping = (attempt = 0) => {
      fetch(`${BACKEND_URL}/api/`, { method: "GET" })
        .then((r) => {
          if (r.ok) {
            done = true;
            clearTimeout(timer);
            sessionStorage.setItem("dg_server_alive", String(Date.now()));
            if (toastId.current) {
              toast.success("Connected!", { id: "server-wake", duration: 1500 });
              toastId.current = null;
            }
          } else if (attempt < 2) {
            setTimeout(() => ping(attempt + 1), 5000);
          }
        })
        .catch(() => {
          if (attempt < 2) {
            setTimeout(() => ping(attempt + 1), 5000);
          } else {
            done = true;
            clearTimeout(timer);
            if (toastId.current) {
              toast.error("Server is starting up. Content will load shortly.", {
                id: "server-wake",
                duration: 5000,
              });
              toastId.current = null;
            }
          }
        });
    };
    ping();

    // Keep-alive: ping every 14 minutes to prevent Render from sleeping
    const keepAlive = setInterval(() => {
      fetch(`${BACKEND_URL}/api/`, { method: "GET" })
        .then(() => sessionStorage.setItem("dg_server_alive", String(Date.now())))
        .catch(() => {});
    }, 14 * 60 * 1000);

    return () => { clearTimeout(timer); clearInterval(keepAlive); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AIProvider>
            <ScrollToTop />
            <ServerWakeup />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="/quran" element={<Quran />} />
              <Route path="/quran/:number" element={<SurahReader />} />
              <Route path="/hadith" element={<Hadith />} />
              <Route path="/duas" element={<Duas />} />
              <Route path="/duas/topic/:topicId" element={<DuaCategory />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/prayer-times" element={<PrayerTimes />} />
              <Route path="/prayer-times/monthly" element={<MonthlyTimetable />} />
              <Route path="/more" element={<More />} />
              <Route path="/more/qibla" element={<QiblaDirection />} />
              <Route path="/more/calendar" element={<IslamicCalendar />} />
              <Route path="/more/names-of-allah" element={<NamesOfAllah />} />
              <Route path="/more/menstrual-guide" element={<MenstrualGuide />} />
              <Route path="/more/hajj-guide" element={<HajjGuide />} />
              <Route path="/more/umrah-guide" element={<UmrahGuide />} />
              <Route path="/more/date-converter" element={<DateConverter />} />
              <Route path="/more/zakat" element={<ZakatCalculator />} />
              <Route path="/more/settings" element={<AppSettings />} />
              <Route path="/more/help" element={<Help />} />
              <Route path="/more/profile" element={<UserProfile />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            {/* Tasbih is fullscreen, no layout */}
            <Route path="/more/tasbih" element={<TasbihCounter />} />
          </Routes>
        </AIProvider>
      </BrowserRouter>
      </AuthProvider>
      <Toaster richColors position="top-center" />
    </div>
  );
}

export default App;
