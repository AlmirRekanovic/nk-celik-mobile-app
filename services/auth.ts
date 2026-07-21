import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member } from '@/types/auth';
import {
  setStoredSession,
  clearStoredSession,
  getStoredMember,
  tokenNeedsRefresh,
} from './session';

const GUEST_MODE_KEY = 'NK_CELIK_GUEST_MODE';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export { getStoredMember };

/**
 * Verifies email + member number against the member-login edge function.
 * Credentials are never checked client-side; the members table is not
 * readable with the anon key at all.
 */
export async function loginWithEmailAndPassword(email: string, memberId: string): Promise<Member | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/member-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, member_id: memberId }),
    });

    if (!response.ok) {
      if (response.status !== 401) {
        console.error('Login failed with status:', response.status);
      }
      return null;
    }

    const { token, expires_at, member } = await response.json();
    if (!token || !member) return null;

    await setStoredSession(member, token, expires_at);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    return member;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Silently re-issues the JWT using the stored credentials (email + member
 * number) when it is expired or close to expiring. Members who stay logged
 * in never see a login screen again; if the device is offline the old token
 * simply keeps being used until the next successful refresh.
 */
export async function refreshSessionIfNeeded(): Promise<void> {
  try {
    if (!(await tokenNeedsRefresh())) return;
    const member = await getStoredMember();
    if (member?.email && member?.member_id) {
      await loginWithEmailAndPassword(member.email, member.member_id);
    }
  } catch (error) {
    console.error('Session refresh error:', error);
  }
}

export async function setGuestMode(): Promise<void> {
  await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  await clearStoredSession();
}

export async function isGuestMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GUEST_MODE_KEY)) === 'true';
  } catch (error) {
    console.error('Error checking guest mode:', error);
    return false;
  }
}

export async function logout(): Promise<void> {
  await clearStoredSession();
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}
