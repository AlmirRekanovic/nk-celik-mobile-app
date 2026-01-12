import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NewsItem } from '@/types/news';
import { fetchPosts } from '@/services/wordpress';
import { getCachedPosts, setCachedPosts, mergePosts, setLastSyncTime } from '@/services/storage';
import { preloadNewsImages } from '@/utils/imagePreloader';

interface NewsContextType {
  posts: NewsItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  refreshPosts: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  hasMore: boolean;
  currentPage: number;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

const INITIAL_LOAD_COUNT = 20;
const PAGE_SIZE = 20;

export function NewsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    initializeNews();
  }, []);

  const initializeNews = async () => {
    console.log('[NewsContext] Starting initialization');
    try {
      setLoading(true);
      setError(null);

      console.log('[NewsContext] Loading cached posts');
      const cached = await getCachedPosts();
      console.log('[NewsContext] Cached posts loaded:', cached.length);

      if (cached.length > 0) {
        setPosts(cached);
        setInitialized(true);
        setLoading(false);
      }

      console.log('[NewsContext] Fetching fresh posts');
      const timeoutPromise = new Promise<NewsItem[]>((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 15000)
      );

      const freshPosts = await Promise.race([
        loadInitialPosts(),
        timeoutPromise
      ]).catch(err => {
        console.error('[NewsContext] Error fetching fresh posts:', err);
        return [];
      });

      console.log('[NewsContext] Fresh posts loaded:', freshPosts.length);

      if (freshPosts.length > 0) {
        const merged = cached.length > 0 ? await mergePosts(cached, freshPosts) : freshPosts;
        setPosts(merged);
        await setCachedPosts(merged);
        await setLastSyncTime(new Date().toISOString());

        preloadNewsImages(merged).catch(err =>
          console.log('[NewsContext] Image preload failed:', err)
        );
      }

      setInitialized(true);
      console.log('[NewsContext] Initialization complete');
    } catch (err) {
      console.error('[NewsContext] Error initializing news:', err);
      setError('Failed to load news');

      try {
        const cached = await getCachedPosts();
        if (cached.length > 0) {
          setPosts(cached);
        }
      } catch (cacheErr) {
        console.error('[NewsContext] Error loading cached posts in fallback:', cacheErr);
      }

      setInitialized(true);
    } finally {
      setLoading(false);
      console.log('[NewsContext] Loading complete, initialized:', true);
    }
  };

  const loadInitialPosts = async (): Promise<NewsItem[]> => {
    const allPosts: NewsItem[] = [];
    const totalPages = Math.ceil(INITIAL_LOAD_COUNT / PAGE_SIZE);

    for (let page = 1; page <= totalPages; page++) {
      try {
        const pagePosts = await fetchPosts(page, PAGE_SIZE);
        if (pagePosts.length === 0) {
          setHasMore(false);
          break;
        }
        allPosts.push(...pagePosts);

        if (pagePosts.length < PAGE_SIZE) {
          setHasMore(false);
          break;
        }
      } catch (err) {
        console.error(`Error loading page ${page}:`, err);
        break;
      }
    }

    setCurrentPage(totalPages);
    return allPosts;
  };

  const refreshPosts = async () => {
    try {
      setError(null);
      const freshPosts = await loadInitialPosts();

      if (freshPosts.length > 0) {
        setPosts(freshPosts);
        await setCachedPosts(freshPosts);
        await setLastSyncTime(new Date().toISOString());
      }
    } catch (err) {
      console.error('Error refreshing posts:', err);
      setError('Failed to refresh news');
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loading) return;

    try {
      const nextPage = currentPage + 1;
      const newPosts = await fetchPosts(nextPage, PAGE_SIZE);

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }

      setPosts(prev => [...prev, ...newPosts]);
      setCurrentPage(nextPage);

      if (newPosts.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
    }
  };

  return (
    <NewsContext.Provider
      value={{
        posts,
        loading,
        error,
        initialized,
        refreshPosts,
        loadMorePosts,
        hasMore,
        currentPage,
      }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}
