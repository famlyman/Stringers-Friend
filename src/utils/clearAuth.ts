import { supabase } from '../lib/supabase';

export const clearAllAuthTokens = async () => {
  try {
    console.log('Clearing all Supabase auth tokens...');
    
    // Clear ALL storage items aggressively
    if (typeof window !== 'undefined') {
      console.log('Clearing localStorage...');
      // Clear ALL localStorage items
      Object.keys(localStorage).forEach(key => {
        console.log('Removing localStorage item:', key);
        localStorage.removeItem(key);
      });
      
      console.log('Clearing sessionStorage...');
      // Clear ALL sessionStorage items
      Object.keys(sessionStorage).forEach(key => {
        console.log('Removing sessionStorage item:', key);
        sessionStorage.removeItem(key);
      });
      
      // Clear cookies that might contain auth info
      console.log('Clearing cookies...');
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('supabase') || name.includes('auth')) {
          console.log('Removing cookie:', name);
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
    
    // Try to sign out but don't wait
    console.log('Attempting sign out...');
    supabase.auth.signOut().catch(err => {
      console.warn('Sign out error (expected):', err);
    });
    
    // Wait a moment then force reload
    setTimeout(() => {
      console.log('Forcing page reload...');
      window.location.href = window.location.origin; // Hard redirect to clear all state
    }, 500);
    
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    // Force redirect anyway
    window.location.href = window.location.origin;
  }
};

// Auto-execute if this is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('clearAuth=true')) {
  clearAllAuthTokens();
}

// Nuclear option - completely bypass Supabase
export const nuclearAuthClear = () => {
  console.log('NUCLEAR AUTH CLEAR - bypassing Supabase entirely');
  
  // Clear everything
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  }
  
  // Force redirect to clean state
  window.location.href = window.location.origin;
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).clearAuthTokens = clearAllAuthTokens;
  (window as any).nuclearAuthClear = nuclearAuthClear;
  console.log('clearAuthTokens() and nuclearAuthClear() functions available in console');
}
