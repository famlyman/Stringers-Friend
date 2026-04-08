import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variable loading
console.log('Supabase Environment Variables:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
console.log('- Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');
console.log('- All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));

// Validate that credentials are present and look valid
const hasValidCredentials = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.length > 20;

if (!hasValidCredentials) {
  console.error('Supabase URL or Anon Key is missing or invalid. Check your .env file or Vercel environment variables.');
  console.error('URL:', supabaseUrl ? 'present' : 'missing', 'Key:', supabaseAnonKey ? 'present' : 'missing');
  console.error('URL length:', supabaseUrl?.length || 0, 'Key length:', supabaseAnonKey?.length || 0);
} else {
  console.log('Supabase credentials are valid - creating real client');
}

// Create a stub client for when credentials are missing - returns resolved promises
const createStubClient = (): SupabaseClient => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        // Return immediately with null session to prevent hanging
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

// Create client only if credentials are valid, otherwise use stub
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createStubClient();

// Test the client immediately
if (hasValidCredentials) {
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Supabase client test - getSession result:', { 
      hasSession: !!data.session, 
      error: error?.message 
    });
  }).catch(err => {
    console.error('Supabase client test failed:', err);
  });
} else {
  console.warn('Using stub Supabase client - no real operations will work');
}

export type { SupabaseClient };
