import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingCart, ArrowLeft } from '@/components/Icons';

const SHOP_URL = 'https://nkcelik.ba/shop/';

// A WooCommerce page pulls in many subresources (images, fonts, analytics,
// the cart fragments AJAX call). Any one of them can return a 4xx/5xx without
// the page itself being broken. We only surface an error when the MAIN
// document fails, otherwise a single 404 favicon would blank the whole shop.
function isMainFrameUrl(url?: string): boolean {
  if (!url) return true;
  try {
    return new URL(url).hostname === new URL(SHOP_URL).hostname;
  } catch {
    return false;
  }
}

// Some hosting WAFs serve a block page (or nothing) to the stock Android
// WebView user-agent. A normal Chrome UA avoids that.
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export default function ShopScreen() {
  const { member, isGuest } = useAuth();
  const { isDarkMode } = useTheme();
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const backgroundColor = isDarkMode ? '#000000' : '#F9FAFB';
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const handleNavStateChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  const handleBack = () => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {canGoBack ? (
              <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={10}>
                <ArrowLeft size={22} color="#D4AF37" />
              </TouchableOpacity>
            ) : null}
            <View>
              <Text style={styles.headerTitle}>Prodavnica</Text>
              {member && (
                <Text style={styles.headerSubtitle}>
                  {member.first_name} {member.last_name}
                </Text>
              )}
              {isGuest && <Text style={styles.headerSubtitle}>Gost</Text>}
            </View>
          </View>
          <ShoppingCart size={28} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.webContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: isDarkMode ? '#F87171' : '#DC2626' }]}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Pokušaj ponovo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <WebView
              key={reloadKey}
              ref={webviewRef}
              source={{ uri: SHOP_URL }}
              style={styles.webview}
              originWhitelist={['*']}
              userAgent={USER_AGENT}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={({ nativeEvent }) => {
                // Ignore subresource load failures; only the main document matters.
                if (!isMainFrameUrl(nativeEvent.url)) return;
                setLoading(false);
                setError(
                  nativeEvent.description ||
                    'Nije moguće učitati prodavnicu. Provjerite internet konekciju.'
                );
              }}
              onHttpError={({ nativeEvent }) => {
                // Only the main page's status should ever show the error screen.
                if (!isMainFrameUrl(nativeEvent.url)) return;
                if (nativeEvent.statusCode >= 400) {
                  setLoading(false);
                  setError(`Server je vratio grešku (${nativeEvent.statusCode}).`);
                }
              }}
              onNavigationStateChange={handleNavStateChange}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              allowsBackForwardNavigationGestures
              setSupportMultipleWindows={false}
              pullToRefreshEnabled
            />
            {loading && (
              <View style={[styles.loadingOverlay, { backgroundColor }]} pointerEvents="none">
                <ActivityIndicator size="large" color="#D4AF37" />
                <Text style={[styles.loadingText, { color: subtextColor }]}>
                  Učitavanje prodavnice...
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#D4AF37' },
  headerSubtitle: { fontSize: 14, color: '#FEE2E2', marginTop: 4 },
  webContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
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
});
