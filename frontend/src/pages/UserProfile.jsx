import { useState, useEffect } from "react";
import { ArrowLeft, User, LogOut, LogIn, Trash, Shield, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { syncBookmarks } from "../lib/syncBookmarks";
import { useBookmarks } from "../lib/bookmarks";
import { supabase } from "../lib/supabase";

export default function UserProfile() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  const { clearAll } = useBookmarks();
  
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role === 'admin') setIsAdmin(true);
      });
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    if (!email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    
    setIsSubmitting(true);
    try {
      const { data, error } = await signIn(email, password);
      setIsSubmitting(false);
      
      if (error) {
        const msg = (error.message || "").toLowerCase();
        const status = error.status || error?.code || 0;
        console.log("[Auth] Login error:", status, error.message);
        
        if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials") || msg.includes("invalid credentials")) {
          toast.error("Incorrect email or password. Please try again.");
        } else if (msg.includes("email not confirmed")) {
          toast.error("Please verify your email before signing in. Check your inbox.");
        } else if (msg.includes("user not found") || msg.includes("no user found")) {
          toast.error("No account found with this email. Please register first.");
        } else if (status === 429) {
          toast.error("Too many attempts. Please wait a minute and try again.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          toast.error("Network error. Please check your internet connection.");
        } else {
          toast.error("Incorrect email or password. Please try again.");
        }
        return;
      }
      
      toast.success("Welcome back!");
      if (data?.user?.id) {
          syncBookmarks(data.user.id);
      }
    } catch (err) {
      setIsSubmitting(false);
      console.log("[Auth] Login exception:", err);
      toast.error("Something went wrong. Please check your connection and try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    if (!email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    
    setIsSubmitting(true);
    try {
      const { data, error } = await signUp(email, password);
      setIsSubmitting(false);

      if (error) {
        const msg = (error.message || "").toLowerCase();
        const status = error.status || 0;
        console.log("[Auth] Register error:", status, error.message);
        
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user_already_exists") || msg.includes("already exists")) {
          toast.error("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("invalid email") || msg.includes("unable to validate")) {
          toast.error("Please enter a valid email address.");
        } else if (msg.includes("password") && (msg.includes("weak") || msg.includes("short"))) {
          toast.error("Password is too weak. Use at least 6 characters.");
        } else if (msg.includes("signup_disabled") || msg.includes("signups not allowed")) {
          toast.error("Registration is currently disabled. Please try again later.");
        } else if (status === 429 || msg.includes("rate limit")) {
          toast.error("Email rate limit reached. Please wait a few minutes before trying again.");
        } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("body stream")) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(error.message || "Registration failed. Please try again.");
        }
        return;
      }
      
      // Supabase may return user without error but with identities=[] meaning user exists
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Please sign in instead.");
        return;
      }
      
      toast.success("Account created! Check your email to verify.");
      if (data?.user?.id) {
          syncBookmarks(data.user.id);
      }
    } catch (err) {
      setIsSubmitting(false);
      console.log("[Auth] Register exception:", err);
      toast.error("Something went wrong. Please check your connection and try again.");
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully. Local bookmarks preserved.");
  };

  const handleClearLocalData = () => {
    if (window.confirm("Are you sure you want to clear all offline bookmarks? This cannot be undone.")) {
      clearAll();
      toast.success("Local data cleared.");
    }
  };

  if (loading) {
     return <div className="p-8 text-center">Loading...</div>;
  }

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
            <span className="font-heading text-3xl font-bold">{user.email.charAt(0).toUpperCase()}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{user.email}</p>

          <div className="mt-8 flex flex-col gap-3">
             <button
               onClick={handleLogout}
               className="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:bg-accent"
             >
               <LogOut className="h-4 w-4" /> Sign Out
             </button>

             {isAdmin && (
               <Link
                 to="/admin"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-primary bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
               >
                 <Shield className="h-4 w-4" /> Go to Admin Dashboard
               </Link>
             )}
             <button
               onClick={handleClearLocalData}
               className="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
             >
               <Trash className="h-4 w-4" /> Clear Local Data
             </button>
          </div>
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
          {/* Removed Name field for simpler auth */}
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70"
          >
            <LogIn className="mr-2 inline h-4 w-4" />
            {isSubmitting ? "Please wait..." : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>
      </div>
    </div>
  );
}
