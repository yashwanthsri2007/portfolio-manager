// src/context/AuthContext.tsx
// Real Firebase Authentication context.
// Falls back to localStorage-only mode when Firebase is not configured.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types';
import { isFirebaseConfigured, auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as fbUpdateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  firebaseReady: boolean;
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
  // Error state
  authError: string | null;
  clearAuthError: () => void;
}

// ─── Default user (used in fallback / pre-auth state) ─────────────────────────

const DEFAULT_USER: UserProfile = {
  name: 'Yashwanth',
  email: '',
  avatarUrl: '',
  plan: 'PRO',
  isLoggedIn: false,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper: load profile overrides from localStorage ─────────────────────────

function loadProfileOverrides(uid: string): Partial<UserProfile> {
  try {
    const raw = localStorage.getItem(`pm_profile_${uid}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfileOverrides(uid: string, data: Partial<UserProfile>) {
  try {
    const existing = loadProfileOverrides(uid);
    localStorage.setItem(`pm_profile_${uid}`, JSON.stringify({ ...existing, ...data }));
  } catch {}
}

// ─── Helper: build UserProfile from FirebaseUser ──────────────────────────────

function buildProfile(fbUser: FirebaseUser): UserProfile {
  const overrides = loadProfileOverrides(fbUser.uid);
  return {
    name: overrides.name || fbUser.displayName || 'Yashwanth',
    email: fbUser.email || '',
    avatarUrl: overrides.avatarUrl || fbUser.photoURL || '',
    plan: overrides.plan || 'PRO',
    isLoggedIn: true,
    uid: fbUser.uid,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const firebaseReady = isFirebaseConfigured();

  // ── Firebase auth state listener ────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseReady || !auth) {
      // Firebase not configured — fall back to localStorage session
      try {
        const stored = localStorage.getItem('pm_local_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Correct legacy name
          if (parsed.name === 'Ashwanth') parsed.name = 'Yashwanth';
          setUser({ ...parsed, isLoggedIn: true });
        }
      } catch {}
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const profile = buildProfile(fbUser);
        setFirebaseUser(fbUser);
        setUser(profile);
      } else {
        setFirebaseUser(null);
        setUser(DEFAULT_USER);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [firebaseReady]);

  // ── Helper: friendly error messages ─────────────────────────────────────────
  const friendlyError = (code: string): string => {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please wait and try again.',
      'auth/popup-closed-by-user': 'Sign-in cancelled.',
      'auth/network-request-failed': 'Network error. Check your internet connection.',
    };
    return map[code] || `Authentication error: ${code}`;
  };

  // ── Login (email + password) ─────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    if (!firebaseReady || !auth) {
      // Fallback local login — no real auth
      const localUser: UserProfile = {
        name: 'Yashwanth',
        email,
        avatarUrl: '',
        plan: 'PRO',
        isLoggedIn: true,
      };
      localStorage.setItem('pm_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  }, [firebaseReady]);

  // ── Login with Google ────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!firebaseReady || !auth) {
      setAuthError('Google Sign-In requires Firebase to be configured.');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(friendlyError(err.code));
      }
      throw err;
    }
  }, [firebaseReady]);

  // ── Sign up ──────────────────────────────────────────────────────────────────
  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    if (!firebaseReady || !auth) {
      setAuthError('Registration requires Firebase to be configured.');
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await fbUpdateProfile(cred.user, { displayName: displayName || 'Yashwanth' });
      // Force refresh to pick up the displayName
      setUser(buildProfile(cred.user));
    } catch (err: any) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  }, [firebaseReady]);

  // ── Forgot / reset password ──────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthError(null);
    if (!firebaseReady || !auth) {
      setAuthError('Password reset requires Firebase to be configured.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setAuthError(friendlyError(err.code));
      throw err;
    }
  }, [firebaseReady]);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (firebaseReady && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('pm_local_user');
      setUser(DEFAULT_USER);
    }
  }, [firebaseReady]);

  // ── Update display name / profile locally ────────────────────────────────────
  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      if (firebaseUser) {
        saveProfileOverrides(firebaseUser.uid, data);
      } else {
        localStorage.setItem('pm_local_user', JSON.stringify(updated));
      }
      return updated;
    });
  }, [firebaseUser]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      isLoading,
      firebaseReady,
      login,
      loginWithGoogle,
      signup,
      sendPasswordReset,
      logout,
      updateProfile,
      authError,
      clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
