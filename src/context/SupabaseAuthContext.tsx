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

  const fetchProfile = async (userId: string, userEmail?: string, role?: 'stringer' | 'customer'): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as Profile;
      }

      if (error?.code === 'PGRST116' || error?.message?.includes('No rows')) {
        const profileRole = role || pendingRole || 'customer';
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: userEmail || '',
            role: profileRole,
          }, {
            onConflict: 'id'
          });

        if (!createError) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return newProfile as Profile;
        }
      }
      return null;
    } catch (err) {
      console.error('fetchProfile error:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id, session.user.email);
          if (mounted) setProfile(profileData);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id, session.user.email);
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
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
