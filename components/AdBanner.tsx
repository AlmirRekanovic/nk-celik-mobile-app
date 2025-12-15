import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AdBannerProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function AdBanner({ size = 'medium', style }: AdBannerProps) {
  const height = size === 'small' ? 50 : size === 'medium' ? 100 : 250;

  return (
    <TouchableOpacity
      style={[styles.container, { height }, style]}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.label}>AD SPACE</Text>
        <Text style={styles.size}>{size.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 2,
  },
  size: {
    fontSize: 10,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
