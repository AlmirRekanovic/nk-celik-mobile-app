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
import { useTheme } from '@/contexts/ThemeContext';
import { AppSettings } from '@/types/news';
import { getSettings, setSettings, getLastSyncTime } from '@/services/storage';
import { DEFAULT_PAGE_SIZE } from '@/constants/config';
import { LogOut, UserCog, LogIn } from '@/components/Icons';
import AdBanner from '@/components/AdBanner';
import {
  getNotificationPreferences,
  updateCategoryPreference,
  updateNotificationPreference,
  NotificationPreferences,
} from '@/services/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const { member, isGuest, signOut } = useAuth();
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [settings, setSettingsState] = useState<AppSettings>({
    backgroundRefreshEnabled: true,
    postsPerPage: DEFAULT_PAGE_SIZE,
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enabled: false,
    news_enabled: false,
    polls_enabled: false,
  });

  useEffect(() => {
    loadSettings();
    loadLastSync();
    loadNotificationPreferences();
  }, [member?.id]);

  const loadSettings = async () => {
    const loadedSettings = await getSettings();
    setSettingsState(loadedSettings);
  };

  const loadLastSync = async () => {
    const syncTime = await getLastSyncTime();
    setLastSync(syncTime);
  };

  const loadNotificationPreferences = async () => {
    if (member?.id) {
      const prefs = await getNotificationPreferences(member.id);
      setNotificationPrefs(prefs);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!member?.id) return;
    const previous = notificationPrefs;
    setNotificationPrefs((prev) => ({ ...prev, enabled: value }));
    try {
      await updateNotificationPreference(member.id, value);
    } catch (error) {
      console.error('Failed to update notifications:', error);
      setNotificationPrefs(previous);
    }
  };

  const handleToggleCategory = async (
    category: 'news' | 'polls',
    value: boolean
  ) => {
    if (!member?.id) return;
    const key = category === 'news' ? 'news_enabled' : 'polls_enabled';
    const previous = notificationPrefs;
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await updateCategoryPreference(member.id, category, value);
    } catch (error) {
      console.error('Failed to update category preference:', error);
      setNotificationPrefs(previous);
    }
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

  const backgroundColor = isDarkMode ? '#000000' : '#F9FAFB';
  const headerBg = '#000000';
  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF';
  const textColor = isDarkMode ? '#F9FAFB' : '#1F2937';
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { backgroundColor: headerBg }]}>
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
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: subtextColor }]}>Izgled</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Tamni način rada</Text>
              <Text style={[styles.settingDescription, { color: subtextColor }]}>
                Uključi tamnu temu za lakše gledanje noću
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D1D5DB', true: '#FFE8A1' }}
              thumbColor={isDarkMode ? '#D4AF37' : '#F3F4F6'}
            />
          </View>
        </View>

        {member && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: subtextColor }]}>Korisnički račun</Text>

            {member.is_admin && (
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push('/admin/polls')}>
                <UserCog size={20} color="#D4AF37" />
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
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: subtextColor }]}>Korisnički račun</Text>

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

        {member && (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: subtextColor }]}>Obavještenja</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Push obavještenja</Text>
                <Text style={[styles.settingDescription, { color: subtextColor }]}>
                  Glavni prekidač za sva obavještenja
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#D1D5DB', true: '#FFE8A1' }}
                thumbColor={notificationPrefs.enabled ? '#D4AF37' : '#F3F4F6'}
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Nove vijesti</Text>
                <Text style={[styles.settingDescription, { color: subtextColor }]}>
                  Obavještenja o novim novostima sa nkcelik.ba
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enabled && notificationPrefs.news_enabled}
                onValueChange={(v) => handleToggleCategory('news', v)}
                disabled={!notificationPrefs.enabled}
                trackColor={{ false: '#D1D5DB', true: '#FFE8A1' }}
                thumbColor={
                  notificationPrefs.enabled && notificationPrefs.news_enabled
                    ? '#D4AF37'
                    : '#F3F4F6'
                }
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Nove ankete</Text>
                <Text style={[styles.settingDescription, { color: subtextColor }]}>
                  Obavještenja kada admin otvori novu anketu
                </Text>
              </View>
              <Switch
                value={notificationPrefs.enabled && notificationPrefs.polls_enabled}
                onValueChange={(v) => handleToggleCategory('polls', v)}
                disabled={!notificationPrefs.enabled}
                trackColor={{ false: '#D1D5DB', true: '#FFE8A1' }}
                thumbColor={
                  notificationPrefs.enabled && notificationPrefs.polls_enabled
                    ? '#D4AF37'
                    : '#F3F4F6'
                }
              />
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: subtextColor }]}>Osvježavanje</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: textColor }]}>Automatsko osvježavanje</Text>
              <Text style={[styles.settingDescription, { color: subtextColor }]}>
                Osvježava vijesti u pozadini svakih ~10 minuta
              </Text>
            </View>
            <Switch
              value={settings.backgroundRefreshEnabled}
              onValueChange={handleToggleBackgroundRefresh}
              trackColor={{ false: '#D1D5DB', true: '#FFE8A1' }}
              thumbColor={settings.backgroundRefreshEnabled ? '#D4AF37' : '#F3F4F6'}
            />
          </View>

          <View style={[styles.infoRow, { borderTopColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtextColor }]}>Zadnje osvježavanje:</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatLastSync()}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: subtextColor }]}>Broj vijesti za prikaz</Text>

          {[20, 50, 100].map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.radioRow}
              onPress={() => handleChangePostsPerPage(value)}>
              <View style={styles.radio}>
                {settings.postsPerPage === value && <View style={styles.radioSelected} />}
              </View>
              <Text style={[styles.radioLabel, { color: textColor }]}>{value} vijesti</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.adContainer, { backgroundColor: cardBg, borderColor }]}>
          <AdBanner size="large" />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textColor }]}>NK Čelik Novosti</Text>
          <Text style={[styles.footerSubtext, { color: subtextColor }]}>
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
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
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
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
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
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4AF37',
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
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
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
