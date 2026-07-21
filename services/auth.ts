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

type LoginBody =
  | { email: string; member_id: string }
  | { first_name: string; last_name: string; member_id: string };

// Credentials are never checked client-side; the members table is not
// readable with the anon key at all. This just relays to the edge function
// and stores the returned session.
async function requestLogin(body: LoginBody): Promise<Member | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/member-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
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

/** Verifies email + member number. */
export async function loginWithEmailAndPassword(email: string, memberId: string): Promise<Member | null> {
  return requestLogin({ email, member_id: memberId });
}

/** Fallback for members with no email on file: first + last name + member number. */
export async function loginWithNameAndMemberId(
  firstName: string,
  lastName: string,
  memberId: string
): Promise<Member | null> {
  return requestLogin({ first_name: firstName, last_name: lastName, member_id: memberId });
}

/**
 * Silently re-issues the JWT using the stored credentials when it is expired
 * or close to expiring, so members who stay logged in never see a login
 * screen again. Uses email if the member has one, otherwise falls back to
 * name-based login. If offline, the old token keeps being used until the
 * next successful refresh.
 */
export async function refreshSessionIfNeeded(): Promise<void> {
  try {
    if (!(await tokenNeedsRefresh())) return;
    const member = await getStoredMember();
    if (!member?.member_id) return;

    if (member.email) {
      await loginWithEmailAndPassword(member.email, member.member_id);
    } else if (member.first_name && member.last_name) {
      await loginWithNameAndMemberId(member.first_name, member.last_name, member.member_id);
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
