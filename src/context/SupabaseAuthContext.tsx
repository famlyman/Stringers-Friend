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
  
  // Temporary storage for role during signup to prevent race condition
  const [pendingRole, setPendingRole] = useState<'stringer' | 'customer' | null>(null);

  // Fetch profile from Supabase, create if missing
  const fetchProfile = async (userId: string, userEmail?: string, role?: 'stringer' | 'customer'): Promise<Profile | null> => {
    try {
      // Race between query and timeout (5 seconds)
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise<{ data: null, error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 5000);
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const data = response.data;
      const error = response.error as any;

      // Handle timeout - return null to show retry UI
      if (error?.message === 'timeout') {
        return null;
      }

      if (!error && data) {
        return data as Profile;
      }

      // Check if profile not found - create it
      if (error?.code === 'PGRST116' || error?.message?.includes('No rows')) {
        const profileRole = role || pendingRole || 'customer';
        
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: userEmail || '',
            role: profileRole,
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (!createError || createError?.code === '23505') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (newProfile) {
            return newProfile as Profile;
          }
        } else {
          console.error('Error creating profile:', createError);
        }
      }

      return null;
    } catch (err: any) {
      console.error('fetchProfile error:', err.message || err);
      return null;
    }
  };

  
  useEffect(() => {
    console.log('AuthContext useEffect FIRED');
    let mounted = true;
    let authInitialized = false;
    
    // Get initial session first
    const initializeAuth = async () => {
      try {
        // Try getSession first
        let sessionData;
        try {
          const result = await supabase.auth.getSession();
          sessionData = result.data.session;
        } catch (e) {
          // Fallback - try to get user without checking session
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            sessionData = { user: data.user };
          }
        }
        
        if (!mounted) return;
        
        if (sessionData?.user) {
          setUser(sessionData.user);
          const profileData = await fetchProfile(sessionData.user.id, sessionData.user.email);
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          // Try to get user directly
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              setUser(userData.user);
              const profileData = await fetchProfile(userData.user.id, userData.user.email);
              if (mounted) {
                setProfile(profileData);
              }
            } else {
              setUser(null);
              setProfile(null);
            }
          } catch {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        authInitialized = true;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    // Safety timeout - ensure loading is never stuck if Supabase is completely down
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 15000);

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Skip INITIAL_SESSION if we already initialized
        if (event === 'INITIAL_SESSION' && authInitialized) {
          return;
        }
        
        // Skip other events if we're still initializing
        if (!authInitialized && event !== 'SIGNED_IN') {
          return;
        }
        
        try {
          if (session?.user) {
            setUser(session.user);
            const profileData = await fetchProfile(session.user.id, session.user.email);
            if (mounted) {
              // Only update profile if we got valid data, otherwise keep existing
              if (profileData) {
                setProfile(profileData);
              }
              setLoading(false);
            }
          } else {
            setUser(null);
            setProfile(null);
            if (mounted) {
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          // Don't nullify user/profile on timeout - keep existing state
          if (mounted && profile) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, profileData?: Partial<UserProfile>) => {
    // Set pending role before auth signup to prevent race condition
    if (profileData?.role) {
      setPendingRole(profileData.role);
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profileData,
      },
    });

    // If signup successful, create/update profile with role data using upsert
    if (data?.user && profileData) {
      // First, update existing profile immediately to fix wrong role
      if (profileData.role && data.user.id) {
        await supabase
          .from('profiles')
          .update({ role: profileData.role })
          .eq('id', data.user.id);
      }
      
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || '',
          ...profileData,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error setting profile after signup:', upsertError);
      }
      
      // Clear pending role after successful signup
      setPendingRole(null);
    }

    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) {
      return { error: new Error('No user logged in') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    }

    return { error };
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
