import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CACHE_KEY_POSTS,
  CACHE_KEY_LAST_SYNC,
  CACHE_KEY_SETTINGS,
  MAX_CACHED_POSTS,
  DEFAULT_PAGE_SIZE
} from '@/constants/config';
import { NewsItem, AppSettings } from '@/types/news';

export async function getCachedPosts(): Promise<NewsItem[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_POSTS);
    if (cached) {
      return JSON.parse(cached);
    }
    return [];
  } catch (error) {
    console.error('Error getting cached posts:', error);
    return [];
  }
}

export async function setCachedPosts(posts: NewsItem[]): Promise<void> {
  try {
    const limitedPosts = posts.slice(0, MAX_CACHED_POSTS);
    await AsyncStorage.setItem(CACHE_KEY_POSTS, JSON.stringify(limitedPosts));
  } catch (error) {
    console.error('Error setting cached posts:', error);
  }
}

export async function mergePosts(existingPosts: NewsItem[], newPosts: NewsItem[]): Promise<NewsItem[]> {
  const postsMap = new Map<number, NewsItem>();

  existingPosts.forEach(post => postsMap.set(post.id, post));

  newPosts.forEach(post => {
    const existing = postsMap.get(post.id);
    if (!existing || new Date(post.updatedAt) > new Date(existing.updatedAt)) {
      postsMap.set(post.id, post);
    }
  });

  const merged = Array.from(postsMap.values());
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return merged.slice(0, MAX_CACHED_POSTS);
}

export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_KEY_LAST_SYNC);
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

export async function setLastSyncTime(timestamp: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_LAST_SYNC, timestamp);
  } catch (error) {
    console.error('Error setting last sync time:', error);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY_SETTINGS);
    if (cached) {
      return JSON.parse(cached);
    }
    return {
      backgroundRefreshEnabled: true,
      postsPerPage: DEFAULT_PAGE_SIZE,
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      backgroundRefreshEnabled: true,
      postsPerPage: DEFAULT_PAGE_SIZE,
    };
  }
}

export async function setSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error setting settings:', error);
  }
}
