import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidCredentials = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.length > 20;

// Create a stub client for when credentials are missing
const createStubClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        callback('INITIAL_SESSION', { session: null });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      updateUser: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient;
};

export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createStubClient();

export type { SupabaseClient };
