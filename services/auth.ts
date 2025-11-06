import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Member } from '@/types/auth';

const AUTH_STORAGE_KEY = 'NK_CELIK_AUTH_STATE';
const GUEST_MODE_KEY = 'NK_CELIK_GUEST_MODE';

export async function loginMember(firstName: string, lastName: string, memberId: string): Promise<Member | null> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('first_name', firstName)
      .eq('last_name', lastName)
      .eq('member_id', memberId)
      .maybeSingle();

    if (error) {
      console.error('Login error:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    await supabase
      .from('members')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.id);

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    await AsyncStorage.removeItem(GUEST_MODE_KEY);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

export async function setGuestMode(): Promise<void> {
  await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function getStoredMember(): Promise<Member | null> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error getting stored member:', error);
    return null;
  }
}

export async function isGuestMode(): Promise<boolean> {
  try {
    const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return guestMode === 'true';
  } catch (error) {
    console.error('Error checking guest mode:', error);
    return false;
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}

export async function createMember(
  memberId: string,
  firstName: string,
  lastName: string,
  isAdmin: boolean = false
): Promise<Member | null> {
  try {
    const { data, error } = await supabase
      .from('members')
      .insert({
        member_id: memberId,
        first_name: firstName,
        last_name: lastName,
        is_admin: isAdmin,
      })
      .select()
      .single();

    if (error) {
      console.error('Create member error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Create member error:', error);
    return null;
  }
}
