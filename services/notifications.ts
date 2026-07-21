import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Identity comes from the member JWT (auth.uid() server-side); the
// register/unregister RPCs handle a device token moving between accounts.

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    if (token) {
      const { error } = await supabase.rpc('register_push_token', {
        p_token: token,
        p_platform: Platform.OS,
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error registering push token:', error);
    return null;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) {
    console.error('Error removing push token:', error);
    throw error;
  }
}

export async function updateNotificationPreference(
  memberId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ enabled })
    .eq('member_id', memberId);
  if (error) {
    console.error('Error updating notification preference:', error);
    throw error;
  }
}

export async function getNotificationPreference(memberId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('push_tokens')
      .select('enabled')
      .eq('member_id', memberId)
      .maybeSingle();

    return data?.enabled ?? false;
  } catch (error) {
    console.error('Error getting notification preference:', error);
    return false;
  }
}

export interface NotificationPreferences {
  enabled: boolean;
  news_enabled: boolean;
  polls_enabled: boolean;
}

export async function getAllNotificationPreferences(
  memberId: string
): Promise<NotificationPreferences> {
  const fallback: NotificationPreferences = {
    enabled: false,
    news_enabled: true,
    polls_enabled: true,
  };

  try {
    const { data } = await supabase
      .from('push_tokens')
      .select('enabled, news_enabled, polls_enabled')
      .eq('member_id', memberId)
      .maybeSingle();

    if (!data) return fallback;

    return {
      enabled: data.enabled ?? false,
      news_enabled: data.news_enabled ?? true,
      polls_enabled: data.polls_enabled ?? true,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return fallback;
  }
}

export async function updateNewsNotificationPreference(
  memberId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ news_enabled: enabled })
    .eq('member_id', memberId);
  if (error) {
    console.error('Error updating news notification preference:', error);
    throw error;
  }
}

export async function updatePollsNotificationPreference(
  memberId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ polls_enabled: enabled })
    .eq('member_id', memberId);
  if (error) {
    console.error('Error updating polls notification preference:', error);
    throw error;
  }
}

export function setupNotificationListeners() {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
