import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { fetchMemberTickets } from '@/services/tickets';
import { Ticket } from '@/types/products';
import { Ticket as TicketIcon, Calendar, Clock } from '@/components/Icons';
import QRCode from 'react-native-qrcode-svg';

export default function KarteScreen() {
  const { member, isGuest } = useAuth();
  const { isDarkMode } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!member || isGuest) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchMemberTickets(member.id);
      setTickets(data);
    } catch (err) {
      setError('Greška pri učitavanju karata');
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [member]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const toggleTicket = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Datum nije naveden';
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'used':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktivna';
      case 'used':
        return 'Iskorištena';
      case 'cancelled':
        return 'Otkazana';
      default:
        return status;
    }
  };

  const backgroundColor = isDarkMode ? '#000000' : '#F9FAFB';
  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';

  const renderTicket = ({ item }: { item: Ticket }) => {
    const isExpanded = expandedTicketId === item.id;

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: cardBg }]}
        onPress={() => toggleTicket(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketInfo}>
            <Text style={[styles.ticketType, { color: textColor }]} numberOfLines={2}>
              {item.ticket_type || item.event_name}
            </Text>
            <View style={styles.ticketMeta}>
              {item.event_date && (
                <View style={styles.metaItem}>
                  <Calendar size={14} color={subtextColor} />
                  <Text style={[styles.metaText, { color: subtextColor }]}>{formatDate(item.event_date)}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={[styles.ticketExpanded, { borderTopColor: borderColor }]}>
            <View style={styles.qrContainer}>
              <QRCode value={item.ticket_code} size={200} backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.qrLabel}>Skeniraj QR kod na ulazu</Text>
            <View style={[styles.ticketDetails, { backgroundColor: isDarkMode ? '#374151' : '#F9FAFB' }]}>
              <Text style={[styles.detailLabel, { color: subtextColor }]}>Kod karte:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{item.ticket_code}</Text>
              {item.event_name && (
                <>
                  <Text style={[styles.detailLabel, { color: subtextColor }]}>Događaj:</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{item.event_name}</Text>
                </>
              )}
              <Text style={[styles.detailLabel, { color: subtextColor }]}>Naručilac:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{item.customer_name}</Text>
            </View>
          </View>
        )}

        {!isExpanded && (
          <Text style={styles.tapToExpand}>Klikni za prikaz QR koda</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Moje Karte</Text>
        </View>
        <View style={styles.emptyContainer}>
          <TicketIcon size={64} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: subtextColor }]}>Prijavite se da vidite svoje karte</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Moje Karte</Text>
        </View>
        <View style={[styles.loadingContainer, { backgroundColor }]}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={[styles.loadingText, { color: subtextColor }]}>Učitavanje karata...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Moje Karte</Text>
            {member && (
              <Text style={styles.headerSubtitle}>
                {member.first_name} {member.last_name}
              </Text>
            )}
          </View>
          <TicketIcon size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.headerDescription}>
          {tickets.length > 0
            ? `Imate ${tickets.length} ${tickets.length === 1 ? 'kartu' : 'karte/karata'}`
            : 'Nemate kupljenih karata'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTickets}>
            <Text style={styles.retryButtonText}>Pokušaj ponovo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ticketList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <TicketIcon size={64} color="#9CA3AF" />
              <Text style={[styles.emptyText, { color: subtextColor }]}>Nemate kupljenih karata</Text>
              <Text style={[styles.emptySubtext, { color: isDarkMode ? '#6B7280' : '#9CA3AF' }]}>
                Karte kupljene na webu će se automatski pojaviti ovdje
              </Text>
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
    marginBottom: 8,
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
  headerDescription: {
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
  ticketList: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ticketExpanded: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },
  ticketDetails: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginTop: 2,
  },
  tapToExpand: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
