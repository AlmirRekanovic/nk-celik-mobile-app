import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { createPoll } from '@/services/polls';
import { ArrowLeft, Plus, X } from 'lucide-react-native';

export default function CreatePollScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<'yes_no_neutral' | 'custom'>('yes_no_neutral');
  const [customOptions, setCustomOptions] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddOption = () => {
    setCustomOptions([...customOptions, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (customOptions.length > 1) {
      const newOptions = customOptions.filter((_, i) => i !== index);
      setCustomOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!title.trim()) {
      setError('Molimo unesite naslov ankete');
      return;
    }

    if (!member) {
      setError('Nemate pristup za kreiranje anketa');
      return;
    }

    let options: string[];
    if (pollType === 'yes_no_neutral') {
      options = ['DA', 'NE', 'NEUTRALNO'];
    } else {
      const filteredOptions = customOptions.filter(opt => opt.trim() !== '');
      if (filteredOptions.length < 2) {
        setError('Molimo dodajte barem 2 opcije');
        return;
      }
      options = filteredOptions;
    }

    setLoading(true);
    setError('');

    const poll = await createPoll(
      title.trim(),
      description.trim(),
      pollType,
      options,
      member.id
    );

    setLoading(false);

    if (poll) {
      router.back();
    } else {
      setError('Greška pri kreiranju ankete');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kreiranje ankete</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Naslov ankete *</Text>
          <TextInput
            style={styles.input}
            placeholder="Unesite naslov ankete"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Opis (opciono)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Unesite opis ankete"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Tip ankete</Text>
          <View style={styles.pollTypeContainer}>
            <TouchableOpacity
              style={[
                styles.pollTypeButton,
                pollType === 'yes_no_neutral' && styles.pollTypeButtonActive,
              ]}
              onPress={() => setPollType('yes_no_neutral')}
              disabled={loading}>
              <Text
                style={[
                  styles.pollTypeText,
                  pollType === 'yes_no_neutral' && styles.pollTypeTextActive,
                ]}>
                DA / NE / NEUTRALNO
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pollTypeButton,
                pollType === 'custom' && styles.pollTypeButtonActive,
              ]}
              onPress={() => setPollType('custom')}
              disabled={loading}>
              <Text
                style={[
                  styles.pollTypeText,
                  pollType === 'custom' && styles.pollTypeTextActive,
                ]}>
                Prilagođene opcije
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {pollType === 'custom' && (
          <View style={styles.section}>
            <View style={styles.optionsHeader}>
              <Text style={styles.label}>Opcije</Text>
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={handleAddOption}
                disabled={loading}>
                <Plus size={20} color="#DC2626" />
                <Text style={styles.addOptionText}>Dodaj opciju</Text>
              </TouchableOpacity>
            </View>

            {customOptions.map((option, index) => (
              <View key={index} style={styles.optionInputContainer}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  placeholder={`Opcija ${index + 1}`}
                  placeholderTextColor="#9CA3AF"
                  value={option}
                  onChangeText={(value) => handleOptionChange(index, value)}
                  editable={!loading}
                />
                {customOptions.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeOptionButton}
                    onPress={() => handleRemoveOption(index)}
                    disabled={loading}>
                    <X size={20} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreatePoll}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Kreiraj anketu</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
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
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pollTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pollTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  pollTypeButtonActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  pollTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  pollTypeTextActive: {
    color: '#DC2626',
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeOptionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#DC2626',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
