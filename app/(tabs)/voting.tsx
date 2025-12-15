import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PollWithVotes } from '@/types/auth';
import { getActivePolls, castVote } from '@/services/polls';
import { CheckCircle2, Circle, BarChart3 } from 'lucide-react-native';
import AdBanner from '@/components/AdBanner';
import AdInFeed from '@/components/AdInFeed';

export default function VotingScreen() {
  const { member, isGuest } = useAuth();
  const [polls, setPolls] = useState<PollWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const loadPolls = async () => {
    const activePolls = await getActivePolls(member?.id);
    setPolls(activePolls);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  }, [member]);

  useEffect(() => {
    const initialize = async () => {
      await loadPolls();
      setLoading(false);
    };

    initialize();
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadPolls();
      }
    }, [member, loading])
  );

  const handleVote = async (pollId: string, optionValue: string) => {
    if (!member) {
      return;
    }

    setVotingPollId(pollId);

    const success = await castVote(pollId, member.id, optionValue);

    if (success) {
      await loadPolls();
    }

    setVotingPollId(null);
  };

  const renderPollOption = (poll: PollWithVotes, option: string) => {
    const hasVoted = !!poll.user_vote;
    const isSelected = poll.user_vote?.option_value === option;
    const voteCount = poll.vote_counts[option] || 0;
    const percentage = poll.total_votes > 0 ? (voteCount / poll.total_votes) * 100 : 0;

    return (
      <TouchableOpacity
        key={option}
        style={[
          styles.optionButton,
          hasVoted && styles.optionButtonDisabled,
          isSelected && styles.optionButtonSelected,
        ]}
        onPress={() => handleVote(poll.id, option)}
        disabled={hasVoted || votingPollId === poll.id || !member}>
        <View style={styles.optionContent}>
          <View style={styles.optionLeft}>
            {isSelected ? (
              <CheckCircle2 size={24} color="#D4AF37" />
            ) : (
              <Circle size={24} color={hasVoted ? '#9CA3AF' : '#D4AF37'} />
            )}
            <Text style={[styles.optionText, hasVoted && styles.optionTextDisabled]}>
              {option}
            </Text>
          </View>
          {hasVoted && (
            <View style={styles.optionRight}>
              <Text style={styles.voteCount}>
                {voteCount} ({percentage.toFixed(0)}%)
              </Text>
            </View>
          )}
        </View>
        {hasVoted && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${percentage}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPoll = (poll: PollWithVotes, index: number) => (
    <>
      <View key={poll.id} style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <Text style={styles.pollTitle}>{poll.title}</Text>
          {poll.user_vote && (
            <View style={styles.votedBadge}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.votedText}>Glasali ste</Text>
            </View>
          )}
        </View>

        {poll.description ? (
          <Text style={styles.pollDescription}>{poll.description}</Text>
        ) : null}

        <View style={styles.optionsContainer}>
          {poll.options.map(option => renderPollOption(poll, option))}
        </View>

        <View style={styles.pollFooter}>
          <View style={styles.pollStats}>
            <BarChart3 size={16} color="#6B7280" />
            <Text style={styles.pollStatsText}>
              Ukupno glasova: {poll.total_votes}
            </Text>
          </View>
          {poll.ends_at && (
            <Text style={styles.pollEndsAt}>
              Završava: {new Date(poll.ends_at).toLocaleDateString('bs-BA')}
            </Text>
          )}
        </View>

        {!member && (
          <View style={styles.guestWarning}>
            <Text style={styles.guestWarningText}>
              Prijavite se kao član da biste mogli glasati
            </Text>
          </View>
        )}
      </View>
      {(index + 1) % 2 === 0 && index < polls.length - 1 && (
        <AdInFeed style={styles.adSpacing} />
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <BarChart3 size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>Trenutno nema aktivnih anketa</Text>
      <Text style={styles.emptySubtext}>
        Nove ankete će se pojaviti ovdje kada ih admin kreira
      </Text>
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
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Glasanje</Text>
        {member && (
          <Text style={styles.headerSubtitle}>
            {member.first_name} {member.last_name}
          </Text>
        )}
        {isGuest && (
          <Text style={styles.headerSubtitle}>Gost</Text>
        )}
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
          renderEmpty()
        ) : (
          <>
            <AdBanner size="medium" style={styles.topBanner} />
            {polls.map((poll, index) => renderPoll(poll, index))}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Created by Reka</Text>
            </View>
          </>
        )}
      </ScrollView>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    marginTop: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  votedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  pollDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  optionButtonDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionButtonSelected: {
    backgroundColor: '#FFF9E6',
    borderColor: '#D4AF37',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  optionTextDisabled: {
    color: '#6B7280',
  },
  optionRight: {
    marginLeft: 12,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#D4AF37',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pollStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollStatsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  pollEndsAt: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  guestWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  guestWarningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  topBanner: {
    marginBottom: 8,
  },
  adSpacing: {
    marginBottom: 0,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
