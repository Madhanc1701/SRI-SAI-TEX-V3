import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@shared/schema";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    // Fetch profile from backend or directly from Supabase (using RLS)
    // We'll use the backend endpoint for consistency
    try {
      // Direct supabase query for profile is faster and easier with RLS
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    } finally {
      setIsLoading(false);
    }
  }

  return { 
    user, 
    profile, 
    isLoading,
    isAuthenticated: !!user,
    isOwner: profile?.role === 'owner',
    isLabour: profile?.role === 'labour'
  };
}

export function useLogout() {
  const [_, setLocation] = useLocation();

  return {
    mutate: async () => {
      await supabase.auth.signOut();
      setLocation("/");
    }
  };
}
