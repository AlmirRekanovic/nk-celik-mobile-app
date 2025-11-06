import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchPosts } from './wordpress';
import { getCachedPosts, mergePosts, setCachedPosts, setLastSyncTime, getSettings } from './storage';
import { BACKGROUND_FETCH_INTERVAL_MINUTES } from '@/constants/config';

const BACKGROUND_FETCH_TASK = 'nk-celik-background-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const settings = await getSettings();

    if (!settings.backgroundRefreshEnabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const cachedPosts = await getCachedPosts();
    const newPosts = await fetchPosts(1, settings.postsPerPage);

    if (newPosts.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const merged = await mergePosts(cachedPosts, newPosts);
    await setCachedPosts(merged);
    await setLastSyncTime(new Date().toISOString());

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch() {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: BACKGROUND_FETCH_INTERVAL_MINUTES * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background fetch registered successfully');
    } else {
      console.log('Background fetch not available:', status);
    }
  } catch (error) {
    console.error('Error registering background fetch:', error);
  }
}

export async function unregisterBackgroundFetch() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    console.log('Background fetch unregistered');
  } catch (error) {
    console.error('Error unregistering background fetch:', error);
  }
}

export async function isBackgroundFetchRegistered(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    return isRegistered;
  } catch (error) {
    console.error('Error checking background fetch status:', error);
    return false;
  }
}
