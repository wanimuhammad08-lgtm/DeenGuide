import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      return result;
    } catch (err) {
      return { data: null, error: { message: "Network error. Please check your connection.", status: 0 } };
    }
  };

  const signUp = async (email, password) => {
    try {
      const result = await supabase.auth.signUp({ email, password });
      return result;
    } catch (err) {
      return { data: null, error: { message: "Network error. Please check your connection.", status: 0 } };
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    },
    signIn,
    signUp,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
