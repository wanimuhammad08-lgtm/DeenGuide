import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
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
