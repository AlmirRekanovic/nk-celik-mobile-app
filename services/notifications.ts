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
  }),
});

export async function registerForPushNotificationsAsync(memberId: string): Promise<string | null> {
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
      await savePushToken(memberId, token);
    }
  } catch (error) {
    console.error('Error getting push token:', error);
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

async function savePushToken(memberId: string, token: string): Promise<void> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    await supabase.rpc('set_member_context', { member_id: memberId });

    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id, enabled')
      .eq('token', token)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('push_tokens')
        .update({
          member_id: memberId,
          platform,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('push_tokens')
        .insert({
          member_id: memberId,
          token,
          platform,
          enabled: true,
        });
    }
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

export async function unregisterPushToken(memberId: string, token: string): Promise<void> {
  try {
    await supabase.rpc('set_member_context', { member_id: memberId });

    await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);
  } catch (error) {
    console.error('Error removing push token:', error);
    throw error;
  }
}

export async function updateNotificationPreference(
  memberId: string,
  enabled: boolean
): Promise<void> {
  try {
    await supabase.rpc('set_member_context', { member_id: memberId });

    await supabase
      .from('push_tokens')
      .update({ enabled })
      .eq('member_id', memberId);
  } catch (error) {
    console.error('Error updating notification preference:', error);
    throw error;
  }
}

export async function getNotificationPreference(memberId: string): Promise<boolean> {
  try {
    await supabase.rpc('set_member_context', { member_id: memberId });

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

export function setupNotificationListeners() {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
