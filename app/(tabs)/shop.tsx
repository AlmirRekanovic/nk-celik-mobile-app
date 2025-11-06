import { View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink } from 'lucide-react-native';

export default function ShopScreen() {
  const { member, isGuest } = useAuth();
  const webShopUrl = 'https://nkcelik.ba/shop';

  const openShop = async () => {
    const supported = await Linking.canOpenURL(webShopUrl);
    if (supported) {
      await Linking.openURL(webShopUrl);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prodavnica</Text>
          {member && (
            <Text style={styles.headerSubtitle}>
              {member.first_name} {member.last_name}
            </Text>
          )}
          {isGuest && (
            <Text style={styles.headerSubtitle}>Gost</Text>
          )}
        </View>

        <WebView
          source={{ uri: webShopUrl }}
          style={styles.webContainer}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prodavnica</Text>
        {member && (
          <Text style={styles.headerSubtitle}>
            {member.first_name} {member.last_name}
          </Text>
        )}
        {isGuest && (
          <Text style={styles.headerSubtitle}>Gost</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <ExternalLink size={48} color="#DC2626" />
          <Text style={styles.infoTitle}>Posjetite našu online prodavnicu</Text>
          <Text style={styles.infoDescription}>
            Kliknite na dugme ispod da otvorite NK Čelik online prodavnicu u Vašem internet pregledniku.
          </Text>
          <TouchableOpacity style={styles.openButton} onPress={openShop}>
            <ExternalLink size={20} color="#FFFFFF" />
            <Text style={styles.openButtonText}>Otvori prodavnicu</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
