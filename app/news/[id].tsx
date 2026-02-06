import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { ArrowLeft } from '@/components/Icons';
import { NewsItem } from '@/types/news';
import { fetchPostById } from '@/services/wordpress';
import { useNews } from '@/contexts/NewsContext';
import { useTheme } from '@/contexts/ThemeContext';
import OptimizedImage from '@/components/OptimizedImage';
import AdBanner from '@/components/AdBanner';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { posts } = useNews();
  const { isDarkMode } = useTheme();
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cachedPost = useMemo(() => {
    return posts.find(p => p.id === parseInt(id as string));
  }, [posts, id]);

  useEffect(() => {
    const loadPost = async () => {
      try {
        if (!id) {
          setError(true);
          setLoading(false);
          return;
        }

        if (cachedPost) {
          setPost(cachedPost);
          setLoading(false);
        }

        try {
          const fetchedPost = await fetchPostById(parseInt(id));
          setPost(fetchedPost);
          setLoading(false);
        } catch (fetchError) {
          if (!cachedPost) {
            throw fetchError;
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPost();
  }, [id, cachedPost]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('bs-BA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const backgroundColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#F9FAFB' : '#1F2937';
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';

  const dynamicTagsStyles = {
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: textColor,
    },
    p: {
      marginBottom: 16,
      color: textColor,
    },
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 24,
      marginBottom: 16,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 20,
      marginBottom: 12,
    },
    h3: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 16,
      marginBottom: 8,
    },
    a: {
      color: '#D4AF37',
      textDecorationLine: 'underline' as const,
    },
    ul: {
      marginBottom: 16,
    },
    ol: {
      marginBottom: 16,
    },
    li: {
      marginBottom: 8,
      color: textColor,
    },
    strong: {
      fontWeight: '700' as const,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    img: {
      marginVertical: 16,
    },
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <Text style={[styles.errorText, { color: subtextColor }]}>Greška pri učitavanju vijesti</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Vijest
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {post.featuredImageUrl && (
          <OptimizedImage
            uri={post.featuredImageUrl}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]}>{post.title}</Text>

          <View style={[styles.metadata, { borderBottomColor: borderColor }]}>
            <Text style={[styles.date, { color: subtextColor }]}>
              {formatDate(post.publishedAt)} u {formatTime(post.publishedAt)}
            </Text>
            {post.authorName && (
              <Text style={[styles.author, { color: subtextColor }]}>Autor: {post.authorName}</Text>
            )}
            {post.updatedAt !== post.publishedAt && (
              <Text style={[styles.updated, { color: isDarkMode ? '#6B7280' : '#9CA3AF' }]}>
                Ažurirano: {formatDate(post.updatedAt)} u {formatTime(post.updatedAt)}
              </Text>
            )}
          </View>

          <AdBanner size="medium" style={styles.adBanner} />

          <RenderHtml
            contentWidth={width - 32}
            source={{ html: post.contentHtml }}
            tagsStyles={dynamicTagsStyles}
            renderersProps={{
              a: {
                onPress: (event, href) => {
                  if (href) {
                    Linking.openURL(href);
                  }
                },
              },
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
  },
  header: {
    backgroundColor: '#DC2626',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  featuredImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 32,
  },
  metadata: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  adBanner: {
    marginVertical: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
