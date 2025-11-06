import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { NewsItem } from '@/types/news';
import { fetchPostById } from '@/services/wordpress';
import { getCachedPosts } from '@/services/storage';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      try {
        if (!id) {
          setError(true);
          setLoading(false);
          return;
        }

        const cachedPosts = await getCachedPosts();
        const cachedPost = cachedPosts.find(p => p.id === parseInt(id));

        if (cachedPost) {
          setPost(cachedPost);
        }

        try {
          const fetchedPost = await fetchPostById(parseInt(id));
          setPost(fetchedPost);
        } catch (fetchError) {
          if (!cachedPost) {
            throw fetchError;
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading post:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>Greška pri učitavanju vijesti</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Image
            source={{ uri: post.featuredImageUrl }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.metadata}>
            <Text style={styles.date}>
              {formatDate(post.publishedAt)} u {formatTime(post.publishedAt)}
            </Text>
            {post.authorName && (
              <Text style={styles.author}>Autor: {post.authorName}</Text>
            )}
            {post.updatedAt !== post.publishedAt && (
              <Text style={styles.updated}>
                Ažurirano: {formatDate(post.updatedAt)} u {formatTime(post.updatedAt)}
              </Text>
            )}
          </View>

          <RenderHtml
            contentWidth={width - 32}
            source={{ html: post.contentHtml }}
            tagsStyles={tagsStyles}
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

const tagsStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
  },
  p: {
    marginBottom: 16,
  },
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 16,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  h3: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  a: {
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
  ul: {
    marginBottom: 16,
  },
  ol: {
    marginBottom: 16,
  },
  li: {
    marginBottom: 8,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  img: {
    marginVertical: 16,
  },
};

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
