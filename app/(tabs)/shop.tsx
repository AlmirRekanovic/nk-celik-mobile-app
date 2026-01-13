import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { fetchProducts } from '@/services/woocommerce';
import { Product } from '@/types/products';
import { ShoppingCart, ExternalLink } from '@/components/Icons';
import { getCachedProducts, setCachedProducts } from '@/services/storage';

export default function ShopScreen() {
  const { member, isGuest } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async (skipCache = false) => {
    try {
      setError(null);

      if (!skipCache) {
        const cached = await getCachedProducts();
        if (cached.length > 0) {
          setProducts(cached);
          setLoading(false);
        }
      }

      const timeoutPromise = new Promise<Product[]>((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 15000)
      );

      const freshProducts = await Promise.race([
        fetchProducts(),
        timeoutPromise
      ]).catch(err => {
        console.error('Error fetching fresh products:', err);
        if (err.message?.includes('credentials not configured')) {
          throw err;
        }
        return [];
      });

      if (freshProducts.length > 0) {
        setProducts(freshProducts);
        await setCachedProducts(freshProducts);
      } else if (products.length === 0) {
        setError('Nije moguće učitati proizvode. Molimo pokušajte kasnije.');
      }
    } catch (err: any) {
      const errorMessage = err.message?.includes('credentials')
        ? 'Prodavnica nije pravilno konfigurirana. Kontaktirajte administratora.'
        : 'Greška pri učitavanju proizvoda. Provjerite internet konekciju.';
      setError(errorMessage);
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(true);
  };

  const openProduct = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => openProduct(item.permalink)}
      activeOpacity={0.7}
    >
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
      )}
      <View style={styles.productContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.shortDescription ? (
          <Text style={styles.productDescription} numberOfLines={3}>
            {item.shortDescription.replace(/<[^>]*>/g, '')}
          </Text>
        ) : null}
        <View style={styles.productFooter}>
          <View style={styles.priceContainer}>
            {item.onSale && item.salePrice ? (
              <>
                <Text style={styles.regularPrice}>{item.price} KM</Text>
                <Text style={styles.salePrice}>{item.salePrice} KM</Text>
              </>
            ) : (
              <Text style={styles.price}>{item.price} KM</Text>
            )}
          </View>
          <View style={styles.buyButton}>
            <ExternalLink size={16} color="#FFFFFF" />
            <Text style={styles.buyButtonText}>Kupi</Text>
          </View>
        </View>
        {item.stockStatus === 'outofstock' && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Nema na stanju</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prodavnica</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Učitavanje proizvoda...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Prodavnica</Text>
            {member && (
              <Text style={styles.headerSubtitle}>
                {member.first_name} {member.last_name}
              </Text>
            )}
            {isGuest && <Text style={styles.headerSubtitle}>Gost</Text>}
          </View>
          <ShoppingCart size={28} color="#FFFFFF" />
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>Pokušaj ponovo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.productList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nema dostupnih proizvoda</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  productList: {
    padding: 16,
  },
  productCard: {
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
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  productContent: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  regularPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  salePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  buyButton: {
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  outOfStockBadge: {
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
