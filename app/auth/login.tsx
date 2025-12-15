import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { User, Key, Mail } from 'lucide-react-native';

type LoginMode = 'member' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithEmail, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<LoginMode>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (mode === 'email') {
      if (!email.trim()) {
        setError('Molimo unesite email adresu');
        return;
      }

      setLoading(true);
      setError('');

      const success = await loginWithEmail(email.trim().toLowerCase());

      if (success) {
        router.replace('/(tabs)');
      } else {
        setError('Email adresa nije pronađena.');
      }

      setLoading(false);
    } else {
      if (!firstName.trim() || !lastName.trim() || !memberId.trim()) {
        setError('Molimo popunite sva polja');
        return;
      }

      setLoading(true);
      setError('');

      const success = await login(firstName.trim(), lastName.trim(), memberId.trim());

      if (success) {
        router.replace('/(tabs)');
      } else {
        setError('Pogrešni podaci. Provjerite ime, prezime i članski broj.');
      }

      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    await continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>NK Čelik</Text>
          <Text style={styles.appSubtitle}>Mobilna Aplikacija</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Prijava člana</Text>
          <Text style={styles.subtitle}>
            Prijavite se sa Vašim podacima ili nastavite kao gost
          </Text>

          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'email' && styles.modeButtonActive]}
              onPress={() => setMode('email')}
              disabled={loading}>
              <Mail size={18} color={mode === 'email' ? '#FFFFFF' : '#6B7280'} />
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'email' && styles.modeButtonTextActive,
                ]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'member' && styles.modeButtonActive]}
              onPress={() => setMode('member')}
              disabled={loading}>
              <User size={18} color={mode === 'member' ? '#FFFFFF' : '#6B7280'} />
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'member' && styles.modeButtonTextActive,
                ]}>
                Članski broj
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            {mode === 'email' ? (
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email adresa"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            ) : (
              <>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ime"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <User size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Prezime"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Key size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Članski broj"
                    placeholderTextColor="#9CA3AF"
                    value={memberId}
                    onChangeText={setMemberId}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>
              </>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Prijavi se</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ili</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestMode}
            disabled={loading}>
            <Text style={styles.guestButtonText}>Nastavi kao gost</Text>
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Kao gost možete pregledati vijesti i glasati na anketama, ali nećete moći koristiti sve
            funkcionalnosti aplikacije.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#D4AF37',
    letterSpacing: 2,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#D4AF37',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 14,
    marginHorizontal: 16,
  },
  guestButton: {
    backgroundColor: '#F3F4F6',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  guestButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#D4AF37',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#000000',
  },
});
