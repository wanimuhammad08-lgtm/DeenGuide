import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { AIProvider } from "@/context/AIContext";
import { AuthProvider } from "@/context/AuthContext";
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

    let timer;
    let done = false;

    // Show "waking up" toast if Render cold-start takes >4 seconds
    timer = setTimeout(() => {
      if (!done) {
        toastId.current = "server-wake";
        toast.loading(
          "🕌 Server is waking up… First visit takes ~30 seconds.",
          { duration: Infinity, id: "server-wake" }
        );
      }
    }, 4000);

    // Ping /api/health immediately to wake the Render dyno
    fetch(`${BACKEND_URL}/api/health`, { method: "GET" })
      .then(() => {
        done = true;
        clearTimeout(timer);
        if (toastId.current) {
          toast.success("✅ Connected! Loading your content.", {
            id: "server-wake",
            duration: 2000,
          });
          toastId.current = null;
        }
      })
      .catch(() => {
        done = true;
        clearTimeout(timer);
        if (toastId.current) {
          toast.error("⚠️ Server offline. Some features may not load.", {
            id: "server-wake",
            duration: 5000,
          });
          toastId.current = null;
        }
      });

    return () => clearTimeout(timer);
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
