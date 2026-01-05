import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Member, AuthState } from '@/types/auth';
import { getStoredMember, isGuestMode, loginMember, loginMemberByEmail, loginWithEmailAndPassword, setGuestMode, logout } from '@/services/auth';

interface AuthContextType extends AuthState {
  login: (firstName: string, lastName: string, memberId: string) => Promise<boolean>;
  loginWithEmail: (email: string) => Promise<boolean>;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const storedMember = await getStoredMember();
      const guestMode = await isGuestMode();

      if (storedMember) {
        setMember(storedMember);
        setIsGuest(false);
      } else if (guestMode) {
        setIsGuest(true);
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (firstName: string, lastName: string, memberId: string): Promise<boolean> => {
    const loggedInMember = await loginMember(firstName, lastName, memberId);

    if (loggedInMember) {
      setMember(loggedInMember);
      setIsGuest(false);
      return true;
    }

    return false;
  };

  const loginWithEmail = async (email: string): Promise<boolean> => {
    const loggedInMember = await loginMemberByEmail(email);

    if (loggedInMember) {
      setMember(loggedInMember);
      setIsGuest(false);
      return true;
    }

    return false;
  };

  const loginWithPassword = async (email: string, password: string): Promise<boolean> => {
    const loggedInMember = await loginWithEmailAndPassword(email, password);

    if (loggedInMember) {
      setMember(loggedInMember);
      setIsGuest(false);
      return true;
    }

    return false;
  };

  const continueAsGuest = async () => {
    await setGuestMode();
    setIsGuest(true);
    setMember(null);
  };

  const signOut = async () => {
    await logout();
    setMember(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider
      value={{
        member,
        isGuest,
        isAuthenticated: !!member || isGuest,
        login,
        loginWithEmail,
        loginWithPassword,
        continueAsGuest,
        signOut,
        loading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
