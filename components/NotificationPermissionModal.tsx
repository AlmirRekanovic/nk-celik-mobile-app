import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell, X } from './Icons';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function NotificationPermissionModal({
  visible,
  onAccept,
  onDecline,
}: NotificationPermissionModalProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onDecline}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Bell size={48} color="#D4AF37" />
          </View>

          <Text style={styles.title}>Omogući obavještenja</Text>

          <Text style={styles.description}>
            Primi obavještenja o:
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>📰</Text>
              <Text style={styles.featureText}>Novim vijestima i člancima</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>📊</Text>
              <Text style={styles.featureText}>Novim anketama za glasanje</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>⚽</Text>
              <Text style={styles.featureText}>Važnim obavijestima kluba</Text>
            </View>
          </View>

          <Text style={styles.note}>
            Možeš uvijek isključiti obavještenja u postavkama.
          </Text>

          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Omogući obavještenja</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Ne sada</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  bullet: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  note: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  acceptButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  declineButton: {
    paddingVertical: 12,
  },
  declineButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
