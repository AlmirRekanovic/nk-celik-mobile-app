import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { getAccessToken } from './session';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Logged-in members authenticate with the JWT issued by the member-login
// edge function (so RLS sees auth.uid()); guests fall back to the anon key
// and only reach data with explicit anon policies.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await getAccessToken()) ?? supabaseAnonKey,
});
