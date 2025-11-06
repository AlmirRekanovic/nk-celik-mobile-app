import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NewsItem } from '@/types/news';
import { fetchPosts } from '@/services/wordpress';
import { getCachedPosts, setCachedPosts, mergePosts, setLastSyncTime, getSettings } from '@/services/storage';
import { RefreshCw } from 'lucide-react-native';

export default function NewsListScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const loadCachedPosts = async () => {
    const cached = await getCachedPosts();
    if (cached.length > 0) {
      setPosts(cached);
    }
  };

  const loadPosts = async (page: number = 1, append: boolean = false) => {
    try {
      const settings = await getSettings();
      const newPosts = await fetchPosts(page, settings.postsPerPage);

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }

      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        const merged = await mergePosts(posts, newPosts);
        setPosts(merged);
        await setCachedPosts(merged);
      }

      await setLastSyncTime(new Date().toISOString());
      setIsOffline(false);
      setHasNewPosts(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      setIsOffline(true);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await loadPosts(1, false);
    setRefreshing(false);
  }, [posts]);

  const onLoadMore = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadPosts(nextPage, true);
    setLoadingMore(false);
  };

  useEffect(() => {
    const initialize = async () => {
      await loadCachedPosts();
      await loadPosts(1, false);
      setLoading(false);
    };

    initialize();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim().substring(0, 150) + '...';
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => router.push(`/news/${item.id}`)}>
      {item.featuredImageUrl && (
        <Image
          source={{ uri: item.featuredImageUrl }}
          style={styles.newsImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.newsContent}>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.newsDate}>{formatDate(item.publishedAt)}</Text>
        <Text style={styles.newsExcerpt} numberOfLines={3}>
          {stripHtml(item.excerptHtml)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>NK Čelik Novosti</Text>
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
      {hasNewPosts && (
        <TouchableOpacity style={styles.newPostsBanner} onPress={onRefresh}>
          <RefreshCw size={16} color="#DC2626" />
          <Text style={styles.newPostsText}>Pojavile su se nove vijesti – osvježi</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#DC2626" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nema vijesti za prikaz</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {renderHeader()}
      <FlatList
        data={posts}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#DC2626"
            colors={['#DC2626']}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.listContent}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Podaci preuzeti sa nkcelik.ba</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#DC2626',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  offlineBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  newPostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  newPostsText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  newsDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  newsExcerpt: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
