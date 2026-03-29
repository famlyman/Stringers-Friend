import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  role: 'stringer' | 'customer';
  shop_id?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        // Set a timeout as a fallback to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 5000);

        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          clearTimeout(timeoutId);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.warn("User authenticated but no profile found in Firestore");
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          clearTimeout(timeoutId);
          console.error("Error fetching user profile:", error);
          setProfile(null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
