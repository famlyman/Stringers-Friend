import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'stringer' | 'customer';
  shop_id?: string;
  name?: string;
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
    console.log('fetchProfile called for userId:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile not found - create one
      const profileRole = role || pendingRole || 'customer';
      console.log('Profile not found, creating new profile for user:', userId, 'with role:', profileRole);
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

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    console.log('fetchProfile success:', data);
    return data as UserProfile;
  };

  // Subscribe to profile changes
  const subscribeToProfile = (userId: string) => {
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile change received:', payload);
          if (payload.new) {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe((status) => {
        console.log('Profile subscription status:', status);
      });

    return channel;
  };

  useEffect(() => {
    let mounted = true;
    let lastUserId: string | null = null;
    
    // Get initial session first
    const initializeAuth = async () => {
      try {
        console.log('AuthContext - initializing...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('AuthContext - user found, fetching profile:', session.user.id);
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id, session.user.email);
          console.log('AuthContext - profile fetched:', profileData);
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          console.log('AuthContext - no session found');
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
        console.log('AuthContext - initialization complete, setting loading false');
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    // Set a timeout to ensure loading is always set to false
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('AuthContext - timeout reached, forcing loading false');
        setLoading(false);
      }
    }, 5000);

    initializeAuth();

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Skip if this is the same user (prevent loops)
        const currentUserId = session?.user?.id || null;
        if (currentUserId === lastUserId && event !== 'SIGNED_OUT') {
          console.log('Auth state change skipped - same user');
          return;
        }
        lastUserId = currentUserId;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          setUser(session.user);
          try {
            const profileData = await fetchProfile(session.user.id, session.user.email);
            if (mounted) {
              setProfile(profileData);
            }
          } catch (err) {
            console.error('Error fetching profile on auth change:', err);
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to profile changes when user is available
  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToProfile(user.id);

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

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
      // Debug logging to see what we're working with
      console.log('Signup data.user:', data.user);
      console.log('data.user.id:', data.user.id);
      console.log('profileData:', profileData);
      
      // First, update existing profile immediately to fix wrong role
      if (profileData.role && data.user.id) {
        console.log('Updating existing profile role to:', profileData.role, 'for user:', data.user.id);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: profileData.role })
          .eq('id', data.user.id);
          
        if (updateError) {
          console.error('Error updating existing profile role:', updateError);
        } else {
          // Force profile refresh after role update
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
          if (updatedProfile) {
            setProfile(updatedProfile);
          }
        }
      } else {
        console.warn('Skipping profile update - missing role or user.id:', {
          hasRole: !!profileData.role,
          hasUserId: !!data.user.id,
          userId: data.user.id
        });
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
    console.log('updateProfile called with:', updates);
    console.log('updateProfile - user:', user);
    console.log('updateProfile - user.id:', user?.id);
    console.log('updateProfile call stack:', new Error().stack);
    
    if (!user?.id) {
      console.error('updateProfile - No user.id available, returning error');
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
