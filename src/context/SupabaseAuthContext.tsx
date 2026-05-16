import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, profileData?: Partial<Profile>) => Promise<{ error: Error | null; data: AuthResponse['data'] }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string, userEmail?: string, role?: 'stringer' | 'customer') => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized'), data: { user: null, session: null } }),
  signOut: async () => {},
  updateProfile: async () => ({ error: new Error('AuthContext not initialized') }),
  fetchProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRole, setPendingRole] = useState<'stringer' | 'customer' | null>(null);

  const fetchProfile = async (userId: string, userEmail?: string, role?: 'stringer' | 'customer', retries = 2): Promise<Profile | null> => {
    try {
      // Use maybeSingle to avoid 406/PGRST116 errors when a row isn't found
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        return data as Profile;
      }

      // If not found and we have a role to set (registration flow), try a safe upsert
      const targetRole = role || pendingRole;
      if (!data && targetRole && retries > 0) {
        console.log(`[Auth] Profile missing for ${userId}, attempting safe upsert with role: ${targetRole}`);
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: userEmail || '',
            role: targetRole,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          
        if (upsertError) {
          console.warn('[Auth] Upsert fallback failed (likely race condition), will retry fetch:', upsertError.message);
        }
        
        // Wait a bit for the upsert/trigger to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfile(userId, userEmail, role, retries - 1);
      }

      // Standard retry if still not found
      if (retries > 0) {
        console.log(`[Auth] Profile not found for ${userId}, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfile(userId, userEmail, role, retries - 1);
      }

      if (error) console.error('fetchProfile final error:', error);
      return null;
    } catch (err) {
      console.error('fetchProfile unexpected error:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    console.log('[Auth] Initializing...');

    let activeFetch: Promise<void> | null = null;

    const handleSession = async (session: any) => {
      if (!mounted || !session?.user) return;
      setUser(session.user);
      const profileData = await fetchProfile(session.user.id, session.user.email);
      if (mounted) {
        if (profileData) setProfile(profileData);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session?.user) {
          activeFetch = handleSession(session);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial check — load session and wait for profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] getSession:', !!session);
      if (mounted && session?.user) {
        activeFetch = handleSession(session);
      } else if (mounted) {
        setLoading(false);
      }
    }).catch(err => {
      console.error('[Auth] getSession error:', err);
      if (mounted) setLoading(false);
    });

    // Safety timeout: force loading off after 12s
    const safetyTimeout = setTimeout(() => {
      if (mounted && activeFetch) {
        console.warn('[Auth] Safety timeout — forcing loading false');
        setLoading(false);
      }
    }, 12000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, profileData?: Partial<Profile>) => {
    if (profileData?.role) setPendingRole(profileData.role);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: profileData }
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { error: new Error('No user') };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (!error) setProfile(prev => (prev ? { ...prev, ...updates } : null));
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
