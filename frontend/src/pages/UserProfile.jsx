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
    
    setIsSubmitting(true);
    const { data, error } = await signIn(email, password);
    setIsSubmitting(false);
    
    if (error) {
      if (error.status === 429 || error.message.includes("body stream already read")) {
        toast.error("Too many login attempts. Please wait a minute and try again.");
      } else {
        toast.error(error.message || "Sign in failed. Please check your credentials.");
      }
      return;
    }
    
    toast.success("Welcome back!");
    if (data?.user?.id) {
        syncBookmarks(data.user.id);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    
    setIsSubmitting(true);
    const { data, error } = await signUp(email, password);
    setIsSubmitting(false);

    if (error) {
      // Handle Supabase's internal double-read error on 429s
      if (error.status === 429 || error.message.includes("body stream already read")) {
        toast.error("Too many registration attempts. Please wait a minute and try again.");
      } else if (error.message.includes("User already registered")) {
        toast.error("An account with this email already exists. Please sign in.");
      } else {
        toast.error(error.message || "Registration failed. Please try again.");
      }
      return;
    }
    toast.success("Account created successfully!");
    if (data?.user?.id) {
        syncBookmarks(data.user.id);
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
