import { supabase } from '../lib/supabase';

export const clearAllAuthTokens = async () => {
  try {
    console.log('Clearing all Supabase auth tokens...');
    
    // Sign out the current user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
    } else {
      console.log('Successfully signed out');
    }
    
    // Clear any local storage items
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
    
    // Force reload to clear any in-memory state
    window.location.reload();
    
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
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
