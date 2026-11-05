import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  sendPasswordReset as fbSendPasswordReset,
  signOutUser as fbSignOutUser,
  isUserAdmin,
} from '../services/firebase';
import { storageAdapter } from '../services/storage/storageAdapter';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isRegisteredUser: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<User | null>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  registerWithEmail: (email: string, pass: string) => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (profileData: Partial<UserProfile>) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileAndRole = async (currentUser: User | null) => {
    if (!currentUser || currentUser.isAnonymous) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const [userProf, adminCheck] = await Promise.all([
        storageAdapter.getUserProfile(currentUser.uid),
        isUserAdmin(currentUser),
      ]);

      setIsAdmin(adminCheck);
      setProfile(userProf);
    } catch (err) {
      console.warn('Error fetching user profile or role:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      await fetchProfileAndRole(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const u = await fbSignInWithGoogle();
      if (u) {
        await fetchProfileAndRole(u);
      }
      return u;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await fbSignInWithEmail(email, pass);
      if (u) {
        await fetchProfileAndRole(u);
      }
      return u;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await fbRegisterWithEmail(email, pass);
      if (u) {
        await fetchProfileAndRole(u);
      }
      return u;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await fbSendPasswordReset(email);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fbSignOutUser();
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user) throw new Error('Usuario no autenticado');

    const now = new Date().toISOString();
    const existing = profile || {
      uid: user.uid,
      email: user.email || '',
      nombre: user.displayName || '',
      institucion: '',
      semestre_nivel: 'No aplica',
      motivo_uso: 'practica_academica' as const,
      role: 'registered_user' as const,
      status: 'active' as const,
      termsAccepted: true,
      termsVersion: '1.0.0',
      privacyAccepted: true,
      createdAt: now,
      lastLoginAt: now,
    };

    const updated: UserProfile = {
      ...existing,
      ...profileData,
      uid: user.uid,
      email: user.email || existing.email,
      lastLoginAt: now,
    };

    await storageAdapter.saveUserProfile(updated);
    setProfile(updated);
    return updated;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRole(user);
    }
  };

  // Profile completion check
  const isProfileComplete = Boolean(
    profile &&
    profile.institucion?.trim() &&
    profile.semestre_nivel?.trim() &&
    profile.motivo_uso?.trim() &&
    profile.termsAccepted === true
  );

  const isRegisteredUser = Boolean(user && !user.isAnonymous);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isRegisteredUser,
        isProfileComplete,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        saveProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
