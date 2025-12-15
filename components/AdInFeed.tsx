import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface AdInFeedProps {
  style?: any;
}

export default function AdInFeed({ style }: AdInFeedProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>Sponsored</Text>
      </View>
      <TouchableOpacity style={styles.adContent} activeOpacity={0.8}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>AD</Text>
        </View>
        <View style={styles.textContent}>
          <Text style={styles.adTitle}>Advertisement Space</Text>
          <Text style={styles.adDescription}>
            Your ad could be here. Contact for advertising opportunities.
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adLabel: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  adLabelText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D1D5DB',
    letterSpacing: 2,
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  adDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
