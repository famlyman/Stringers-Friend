import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'stringer' | 'customer';
  shop_id?: string;
  full_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, profileData?: Partial<UserProfile>) => Promise<{ error: Error | null; data: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string, userEmail?: string, role?: 'stringer' | 'customer') => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized'), data: null }),
  signOut: async () => {},
  updateProfile: async () => ({ error: new Error('AuthContext not initialized') }),
  fetchProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Temporary storage for role during signup to prevent race condition
  const [pendingRole, setPendingRole] = useState<'stringer' | 'customer' | null>(null);

  // Fetch profile from Supabase, create if missing
  const fetchProfile = async (userId: string, userEmail?: string, role?: 'stringer' | 'customer') => {
    try {
      // First, try to fetch existing profile - no artificial timeout
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as UserProfile;
      }

      // Check if profile not found (PGRST116 = "could not find row")
      if (error?.code === 'PGRST116' || error?.message?.includes('No rows')) {
        // Profile not found - create one
        const profileRole = role || pendingRole || 'customer';
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail || '',
            role: profileRole,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return null;
        }

        return newProfile as UserProfile;
      }

      // Other error - log but don't throw
      if (error) {
        console.error('Error fetching profile:', error);
      }

      return null;
    } catch (err) {
      console.error('fetchProfile error:', err);
      return null;
    }
  };

  
  useEffect(() => {
    let mounted = true;
    let authInitialized = false;
    
    // Get initial session first
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          // Fetch profile
          const profileData = await fetchProfile(session.user.id, session.user.email);
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        // Mark as initialized
        authInitialized = true;
        // Always set loading to false after initialization
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
