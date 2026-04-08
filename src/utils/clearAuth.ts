import { supabase } from '../lib/supabase';

export const clearAllAuthTokens = async () => {
  try {
    console.log('Clearing all Supabase auth tokens...');
    
    // Clear any local storage items first
    if (typeof window !== 'undefined') {
      // Clear Supabase auth items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          console.log('Removing localStorage item:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          console.log('Removing sessionStorage item:', key);
          sessionStorage.removeItem(key);
        }
      });
    }
    
    // Sign out the current user with timeout
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign out timeout')), 2000);
    });
    
    try {
      const result = await Promise.race([signOutPromise, timeoutPromise]) as any;
      
      if (result?.error) {
        console.error('Error signing out:', result.error);
      } else {
        console.log('Successfully signed out');
      }
    } catch (err) {
      console.warn('Sign out timed out or failed:', err);
    }
    
    // Force reload to clear any in-memory state
    console.log('Forcing page reload...');
    window.location.reload();
    
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    // Force reload anyway
    window.location.reload();
  }
};

// Auto-execute if this is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('clearAuth=true')) {
  clearAllAuthTokens();
}

// Make function available globally for console access
if (typeof window !== 'undefined') {
  (window as any).clearAuthTokens = clearAllAuthTokens;
  console.log('clearAuthTokens() function available in console');
}
