import { Link } from "react-router-dom";
import {
  Calendar, Star, Heart, MapPin, Plane,
  ArrowLeftRight, Calculator, Settings, HelpCircle, User, Bookmark,
  ChevronRight,
} from "lucide-react";

const sections = [
  {
    title: "Spiritual Tools",
    items: [
      { to: "/more/calendar", label: "Islamic Calendar", desc: "Hijri dates & events", icon: Calendar, color: "bg-red-500" },
      { to: "/more/names-of-allah", label: "99 Names of Allah", desc: "Al-Asma ul-Husna", icon: Star, color: "bg-amber-500" },
      { to: "/more/date-converter", label: "Date Converter", desc: "Hijri ↔ Gregorian", icon: ArrowLeftRight, color: "bg-cyan-500" },
      { to: "/more/zakat", label: "Zakat Calculator", desc: "Calculate your Zakat", icon: Calculator, color: "bg-green-600" },
    ],
  },
  {
    title: "Essential Guides",
    items: [
      { to: "/more/menstrual-guide", label: "Menstrual Guide", desc: "Islamic rulings for women", icon: Heart, color: "bg-pink-500" },
      { to: "/more/hajj-guide", label: "Hajj Guide", desc: "Step-by-step pilgrimage", icon: MapPin, color: "bg-orange-500" },
      { to: "/more/umrah-guide", label: "Umrah Guide", desc: "Minor pilgrimage steps", icon: Plane, color: "bg-teal-500" },
    ],
  },
  {
    title: "Preferences & Account",
    items: [
      { to: "/bookmarks", label: "Bookmarks", desc: "Your saved items", icon: Bookmark, color: "bg-violet-500" },
      { to: "/more/settings", label: "App Settings", desc: "Customize your experience", icon: Settings, color: "bg-slate-500" },
      { to: "/more/profile", label: "User Profile", desc: "Manage your account", icon: User, color: "bg-rose-500" },
      { to: "/more/help", label: "Help & About", desc: "FAQ and app info", icon: HelpCircle, color: "bg-blue-500" },
    ],
  },
];

export default function More() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Explore</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">App Features</h1>
        <p className="mt-2 text-sm text-muted-foreground">Advanced Islamic tools, interactive guides, and system settings.</p>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.color} text-white shadow-sm`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                  <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
