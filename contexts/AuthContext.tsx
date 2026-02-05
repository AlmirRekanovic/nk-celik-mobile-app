import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Member, AuthState } from '@/types/auth';
import { getStoredMember, isGuestMode, loginMember, loginMemberByEmail, loginWithEmailAndPassword, setGuestMode, logout } from '@/services/auth';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/services/notifications';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PROMPT_KEY = 'NK_CELIK_NOTIFICATION_PROMPTED';

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
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    loadAuthState();
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (member?.id && Platform.OS !== 'web') {
      checkAndShowNotificationPrompt();
    }
  }, [member?.id]);

  const checkAndShowNotificationPrompt = async () => {
    try {
      const hasPrompted = await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY);
      if (!hasPrompted) {
        setShowNotificationModal(true);
      }
    } catch (error) {
      console.error('Error checking notification prompt:', error);
    }
  };

  const handleAcceptNotifications = async () => {
    setShowNotificationModal(false);
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
    if (member?.id) {
      registerForPushNotificationsAsync(member.id).catch(error => {
        console.log('Failed to register for push notifications:', error);
      });
    }
  };

  const handleDeclineNotifications = async () => {
    setShowNotificationModal(false);
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
  };

  const loadAuthState = async () => {
    console.log('[AuthContext] Loading auth state');

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[AuthContext] Loading timeout - continuing anyway');
        resolve();
      }, 2000);
    });

    try {
      await Promise.race([
        (async () => {
          const storedMember = await getStoredMember();
          const guestMode = await isGuestMode();

          console.log('[AuthContext] Stored member:', !!storedMember, 'Guest mode:', guestMode);

          if (storedMember) {
            setMember(storedMember);
            setIsGuest(false);
          } else if (guestMode) {
            setIsGuest(true);
          }
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('[AuthContext] Error loading auth state:', error);
    } finally {
      setLoading(false);
      console.log('[AuthContext] Auth state loaded, loading:', false);
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
      <NotificationPermissionModal
        visible={showNotificationModal}
        onAccept={handleAcceptNotifications}
        onDecline={handleDeclineNotifications}
      />
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
