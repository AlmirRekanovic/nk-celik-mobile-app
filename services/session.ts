import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member } from '@/types/auth';

// Session = the member profile plus the JWT issued by the member-login edge
// function. Kept in its own module (AsyncStorage only, no supabase import)
// so both the supabase client factory and the auth service can use it
// without a require cycle.

const MEMBER_KEY = 'NK_CELIK_AUTH_STATE';
const TOKEN_KEY = 'NK_CELIK_AUTH_TOKEN';

// Refresh when less than this much lifetime remains.
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredToken {
  token: string;
  expires_at: string;
}

let cachedToken: StoredToken | null | undefined;

export async function setStoredSession(member: Member, token: string, expiresAt: string): Promise<void> {
  cachedToken = { token, expires_at: expiresAt };
  await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(cachedToken));
}

export async function clearStoredSession(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(MEMBER_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredMember(): Promise<Member | null> {
  try {
    const stored = await AsyncStorage.getItem(MEMBER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading stored member:', error);
    return null;
  }
}

async function readToken(): Promise<StoredToken | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    cachedToken = stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading stored token:', error);
    cachedToken = null;
  }
  return cachedToken ?? null;
}

/**
 * The member JWT for API calls, or null when logged out / expired.
 * An expired token is treated as absent so requests fall back to the anon
 * key (public data keeps working) instead of failing with 401s.
 */
export async function getAccessToken(): Promise<string | null> {
  const stored = await readToken();
  if (!stored) return null;
  if (new Date(stored.expires_at).getTime() <= Date.now()) return null;
  return stored.token;
}

/** True when there is a member session whose token is missing, expired, or close to it. */
export async function tokenNeedsRefresh(): Promise<boolean> {
  const member = await getStoredMember();
  if (!member) return false;
  const stored = await readToken();
  if (!stored) return true;
  return new Date(stored.expires_at).getTime() - Date.now() < REFRESH_THRESHOLD_MS;
}
