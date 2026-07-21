import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Member, AuthState } from '@/types/auth';
import { getStoredMember, isGuestMode, loginWithEmailAndPassword, refreshSessionIfNeeded, setGuestMode, logout } from '@/services/auth';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/services/notifications';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PROMPT_KEY = 'NK_CELIK_NOTIFICATION_PROMPTED';

interface AuthContextType extends AuthState {
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
      handleNotificationSetup();
    }
  }, [member?.id]);

  const handleNotificationSetup = async () => {
    try {
      // If OS permission is already granted, register (or re-register) the
      // token unconditionally. This handles the case where the user tapped
      // "Allow" on a previous install / previous login — we don't want to
      // rely on the AsyncStorage prompt flag to gate token registration.
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        registerForPushNotificationsAsync().catch(error => {
          console.log('Auto push registration failed:', error);
        });
        return;
      }

      // Permission not yet granted — show the in-app modal the first time
      // (once per install), then let the user grant OS permission from there.
      const hasPrompted = await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY);
      if (!hasPrompted) {
        setShowNotificationModal(true);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const handleAcceptNotifications = async () => {
    setShowNotificationModal(false);
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
    if (member?.id) {
      registerForPushNotificationsAsync().catch(error => {
        console.log('Failed to register for push notifications:', error);
      });
    }
  };

  const handleDeclineNotifications = async () => {
    setShowNotificationModal(false);
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true');
  };

  const loadAuthState = async () => {
    try {
      const storedMember = await getStoredMember();
      const guestMode = await isGuestMode();

      if (storedMember) {
        setMember(storedMember);
        setIsGuest(false);
        // Re-issue the JWT in the background when it's expired or aging out;
        // existing installs (which have a member but no token yet) get their
        // first token through this same path.
        refreshSessionIfNeeded().catch(error => {
          console.error('[AuthContext] Session refresh failed:', error);
        });
      } else if (guestMode) {
        setIsGuest(true);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading auth state:', error);
    } finally {
      setLoading(false);
    }
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
