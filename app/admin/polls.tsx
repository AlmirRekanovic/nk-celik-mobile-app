import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { PollWithVotes } from '@/types/auth';
import { getAllPolls, updatePoll, deletePoll } from '@/services/polls';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react-native';

export default function AdminPollsScreen() {
  const router = useRouter();
  const { member } = useAuth();
  const [polls, setPolls] = useState<PollWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!member?.is_admin) {
      router.replace('/(tabs)');
      return;
    }

    initialize();
  }, [member]);

  const initialize = async () => {
    await loadPolls();
    setLoading(false);
  };

  const loadPolls = async () => {
    if (!member) return;
    const allPolls = await getAllPolls(member.id);
    setPolls(allPolls);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  }, [member]);

  const handleToggleActive = async (pollId: string, currentStatus: boolean) => {
    const success = await updatePoll(pollId, { is_active: !currentStatus });
    if (success) {
      await loadPolls();
    }
  };

  const handleDeletePoll = (pollId: string, title: string) => {
    if (Platform.OS === 'web') {
      const confirmed = confirm(`Da li ste sigurni da želite obrisati anketu "${title}"?`);
      if (confirmed) {
        executePollDeletion(pollId);
      }
    } else {
      Alert.alert(
        'Potvrda brisanja',
        `Da li ste sigurni da želite obrisati anketu "${title}"?`,
        [
          { text: 'Otkaži', style: 'cancel' },
          { text: 'Obriši', style: 'destructive', onPress: () => executePollDeletion(pollId) },
        ]
      );
    }
  };

  const executePollDeletion = async (pollId: string) => {
    const success = await deletePoll(pollId);
    if (success) {
      await loadPolls();
    }
  };

  const renderPoll = (poll: PollWithVotes) => (
    <View key={poll.id} style={styles.pollCard}>
      <View style={styles.pollHeader}>
        <View style={styles.pollTitleContainer}>
          <Text style={styles.pollTitle}>{poll.title}</Text>
          <View style={[styles.statusBadge, poll.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, poll.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {poll.is_active ? 'Aktivna' : 'Neaktivna'}
            </Text>
          </View>
        </View>
      </View>

      {poll.description ? (
        <Text style={styles.pollDescription}>{poll.description}</Text>
      ) : null}

      <View style={styles.pollOptions}>
        <Text style={styles.pollOptionsTitle}>Opcije:</Text>
        {poll.options.map((option, index) => (
          <View key={index} style={styles.optionRow}>
            <Text style={styles.optionText}>• {option}</Text>
            <Text style={styles.optionVotes}>
              {poll.vote_counts[option] || 0} glasova
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.pollStats}>
        <Text style={styles.pollStatsText}>
          Ukupno glasova: {poll.total_votes}
        </Text>
        <Text style={styles.pollDate}>
          Kreirana: {new Date(poll.created_at).toLocaleDateString('bs-BA')}
        </Text>
      </View>

      <View style={styles.pollActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleActive(poll.id, poll.is_active)}>
          {poll.is_active ? (
            <ToggleRight size={20} color="#D4AF37" />
          ) : (
            <ToggleLeft size={20} color="#6B7280" />
          )}
          <Text style={styles.actionButtonText}>
            {poll.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/admin/edit-poll?id=${poll.id}`)}>
          <Edit3 size={20} color="#2563EB" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
            Uredi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={() => handleDeletePoll(poll.id, poll.title)}>
          <Trash2 size={20} color="#D4AF37" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
            Obriši
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upravljanje anketama</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={polls.length === 0 ? styles.emptyScrollContent : styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }>
        {polls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nema kreiranih anketa</Text>
            <Text style={styles.emptySubtext}>
              Kreirajte novu anketu pomoću dugmeta ispod
            </Text>
          </View>
        ) : (
          polls.map(renderPoll)
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/admin/create-poll')}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#1A1A1A',
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
    color: '#D4AF37',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyScrollContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pollHeader: {
    marginBottom: 12,
  },
  pollTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#2A2A2A',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#D4AF37',
  },
  pollDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  pollOptions: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  pollOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  optionText: {
    fontSize: 14,
    color: '#1F2937',
  },
  optionVotes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pollStats: {
    paddingTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pollStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  pollDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pollActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionButtonTextPrimary: {
    color: '#2563EB',
  },
  actionButtonTextDanger: {
    color: '#D4AF37',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
