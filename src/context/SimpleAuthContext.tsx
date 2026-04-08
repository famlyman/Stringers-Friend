import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  password: string;
  login: (password: string) => boolean;
  logout: () => void;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// Generic password - change this to whatever you want
const CORRECT_PASSWORD = 'Stringers2024';
const STORAGE_KEY = 'sf_auth_password';

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setPassword(stored);
    }
    setLoading(false);
  }, []);

  const login = (inputPassword: string): boolean => {
    if (inputPassword === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, inputPassword);
      setPassword(inputPassword);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPassword('');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0f172a'
      }}>
        <div style={{ color: 'white' }}>Loading...</div>
      </div>
    );
  }

  return (
    <SimpleAuthContext.Provider value={{ isAuthenticated, password, login, logout }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}

// Password Gate Component
export function PasswordGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, login } = useSimpleAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(input)) {
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ color: 'white', marginBottom: '8px', fontSize: '24px' }}>
          Stringer's Friend
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          Enter password to continue
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}
          />
          
          {error && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
