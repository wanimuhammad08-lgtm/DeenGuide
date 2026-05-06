import { useState, useEffect } from "react";
import { ArrowLeft, User, LogOut, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("deenguide_user"));
  } catch { return null; }
}

export default function UserProfile() {
  const [user, setUser] = useState(getUser);
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    // Simple localStorage auth (demo)
    const stored = JSON.parse(localStorage.getItem("deenguide_users") || "{}");
    const found = stored[email];
    if (!found || found.password !== password) {
      toast.error("Invalid email or password");
      return;
    }
    const u = { name: found.name, email };
    localStorage.setItem("deenguide_user", JSON.stringify(u));
    setUser(u);
    toast.success(`Welcome back, ${found.name}!`);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Please fill in all fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const stored = JSON.parse(localStorage.getItem("deenguide_users") || "{}");
    if (stored[email]) { toast.error("Account already exists. Please login."); return; }
    stored[email] = { name, password };
    localStorage.setItem("deenguide_users", JSON.stringify(stored));
    const u = { name, email };
    localStorage.setItem("deenguide_user", JSON.stringify(u));
    setUser(u);
    toast.success(`Account created! Welcome, ${name}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("deenguide_user");
    setUser(null);
    toast.success("Logged out successfully");
  };

  if (user) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Profile</h1>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <span className="font-heading text-3xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <h2 className="mt-4 font-heading text-xl font-bold">{user.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-6 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{mode === "login" ? "Sign In" : "Create Account"}</h1>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to sync your bookmarks" : "Create an account to save your progress"}
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-6 flex rounded-full border border-border bg-background p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${mode === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${mode === "register" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Muhammad"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <LogIn className="mr-2 inline h-4 w-4" />
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
