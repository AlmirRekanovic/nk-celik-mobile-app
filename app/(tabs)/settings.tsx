import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { AppSettings } from '@/types/news';
import { getSettings, setSettings, getLastSyncTime } from '@/services/storage';
import { DEFAULT_PAGE_SIZE } from '@/constants/config';
import { LogOut, UserCog, LogIn } from 'lucide-react-native';
import AdBanner from '@/components/AdBanner';

export default function SettingsScreen() {
  const router = useRouter();
  const { member, isGuest, signOut } = useAuth();
  const [settings, setSettingsState] = useState<AppSettings>({
    backgroundRefreshEnabled: true,
    postsPerPage: DEFAULT_PAGE_SIZE,
  });
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadLastSync();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await getSettings();
    setSettingsState(loadedSettings);
  };

  const loadLastSync = async () => {
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
  };

  const handleToggleBackgroundRefresh = async (value: boolean) => {
    const newSettings = { ...settings, backgroundRefreshEnabled: value };
    setSettingsState(newSettings);
    await setSettings(newSettings);
  };

  const handleChangePostsPerPage = async (value: number) => {
    const newSettings = { ...settings, postsPerPage: value };
    setSettingsState(newSettings);
    await setSettings(newSettings);
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Nikad';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Upravo sada';
    if (diffMins < 60) return `Prije ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Prije ${diffHours} h`;

    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Postavke</Text>
        {member && (
          <Text style={styles.headerSubtitle}>
            {member.first_name} {member.last_name}
            {member.is_admin && ' (Admin)'}
          </Text>
        )}
        {isGuest && (
          <Text style={styles.headerSubtitle}>Gost</Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {member && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Korisnički račun</Text>

            {member.is_admin && (
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/admin/polls')}>
                <UserCog size={20} color="#DC2626" />
                <Text style={styles.adminButtonText}>Upravljanje anketama</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}>
              <LogOut size={20} color="#DC2626" />
              <Text style={styles.logoutButtonText}>Odjavi se</Text>
            </TouchableOpacity>
          </View>
        )}

        {isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Korisnički račun</Text>

            <View style={styles.guestInfoCard}>
              <Text style={styles.guestInfoText}>
                Trenutno koristite aplikaciju kao gost. Prijavite se kao član da biste mogli
                glasati na anketama i koristiti sve funkcionalnosti aplikacije.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogout}>
              <LogIn size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>Prijavi se</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Osvježavanje</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Automatsko osvježavanje</Text>
              <Text style={styles.settingDescription}>
                Osvježava vijesti u pozadini svakih ~10 minuta
              </Text>
            </View>
            <Switch
              value={settings.backgroundRefreshEnabled}
              onValueChange={handleToggleBackgroundRefresh}
              trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
              thumbColor={settings.backgroundRefreshEnabled ? '#DC2626' : '#F3F4F6'}
            />
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Zadnje osvježavanje:</Text>
            <Text style={styles.infoValue}>{formatLastSync()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Broj vijesti za prikaz</Text>

          {[20, 50, 100].map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.radioRow}
              onPress={() => handleChangePostsPerPage(value)}>
              <View style={styles.radio}>
                {settings.postsPerPage === value && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioLabel}>{value} vijesti</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O aplikaciji</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Izvor podataka:</Text>
            <Text style={styles.infoValue}>nkcelik.ba</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verzija:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Developer:</Text>
            <Text style={styles.infoValue}>Reka</Text>
          </View>
        </View>

        <View style={styles.adContainer}>
          <AdBanner size="large" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>NK Čelik Novosti</Text>
          <Text style={styles.footerSubtext}>
            Aplikacija za praćenje vijesti Nogometnog kluba Čelik Zenica
          </Text>
          <Text style={styles.footerCredit}>Created by Reka</Text>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  radioLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  guestInfoCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guestInfoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerCredit: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
