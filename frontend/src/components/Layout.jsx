import { Link, NavLink, Outlet } from "react-router-dom";
import { Home, BookOpen, Hand, Bookmark, LayoutGrid, Menu, X, Sparkles, Clock, ScrollText } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { to: "/", label: "Home", icon: Home, testid: "nav-home", exact: true },
  { to: "/ask", label: "Ask AI", icon: Sparkles, testid: "nav-ask" },
  { to: "/quran", label: "Quran", icon: BookOpen, testid: "nav-quran" },
  { to: "/hadith", label: "Hadith", icon: ScrollText, testid: "nav-hadith" },
  { to: "/duas", label: "Dua", icon: Hand, testid: "nav-duas" },
  { to: "/more", label: "More", icon: LayoutGrid, testid: "nav-more" },
];

const desktopNavItems = [
  { to: "/ask", label: "Ask AI", icon: Sparkles, testid: "nav-ask" },
  { to: "/quran", label: "Quran", icon: BookOpen, testid: "nav-quran" },
  { to: "/prayer-times", label: "Prayer", icon: Clock, testid: "nav-prayer" },
  { to: "/duas", label: "Dua", icon: Hand, testid: "nav-duas" },
  { to: "/more", label: "More", icon: LayoutGrid, testid: "nav-more" },
];

const Brand = () => (
  <Link to="/" data-testid="brand-link" className="flex items-center gap-2.5 font-heading">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <span className="font-arabic text-lg leading-none">د</span>
    </span>
    <span className="text-lg font-bold tracking-tight">DeenGuide</span>
  </Link>
);

export const Layout = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            {desktopNavItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              data-testid="mobile-menu-toggle"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Open menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-testid={`${n.testid}-mobile`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/60"
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-8 sm:pb-12 sm:pt-10">
        <Outlet />
      </main>

      {/* Bottom mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-6">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              data-testid={`${n.testid}-bottom`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <footer className="hidden border-t border-border bg-card/40 py-8 text-center text-xs text-muted-foreground md:block">
        <p>DeenGuide · An AI-powered Islamic knowledge companion · Always verify with scholars</p>
      </footer>
    </div>
  );
};
