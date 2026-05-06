import { ArrowLeft, Moon, Sun, Type, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppSettings() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preferences</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">App Settings</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
                <Moon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Appearance</p>
                <p className="text-xs text-muted-foreground">Toggle dark/light mode</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
              <Monitor className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">App Version</p>
              <p className="text-xs text-muted-foreground">DeenGuide v1.0.0</p>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold mb-3">Data & Privacy</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Bookmarks are stored locally on your device</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">No personal data is collected or shared</p>
            </div>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
            >
              Clear All App Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
