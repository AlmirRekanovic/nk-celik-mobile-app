import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ComponentType, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Vote,
  ShoppingBag,
  Settings as SettingsIcon,
  MessageCircle,
  X,
  ChevronRight,
} from '@/components/Icons';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerItem {
  key: string;
  label: string;
  Icon: ComponentType<{ size: number; color: string }>;
  route: string;
  show: boolean;
}

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.85);

export default function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { member, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const isAdmin = member?.is_admin || false;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slide.setValue(DRAWER_WIDTH);
      fade.setValue(0);
    }
  }, [visible]);

  const items: DrawerItem[] = [
    {
      key: 'voting',
      label: 'Glasanje',
      Icon: Vote,
      route: '/(tabs)/voting',
      show: true,
    },
    {
      key: 'shop',
      label: 'Fan Shop',
      Icon: ShoppingBag,
      route: '/(tabs)/shop',
      show: true,
    },
    {
      key: 'chat',
      label: 'Chat',
      Icon: MessageCircle,
      route: '/(tabs)/chat',
      show: isAdmin && !isGuest,
    },
    {
      key: 'settings',
      label: 'Postavke',
      Icon: SettingsIcon,
      route: '/(tabs)/settings',
      show: true,
    },
  ];

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 180);
  };

  const bg = isDarkMode ? '#111827' : '#FFFFFF';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderColor = isDarkMode ? '#1F2937' : '#F3F4F6';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: bg,
            width: DRAWER_WIDTH,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX: slide }],
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: textColor }]}>Meni</Text>
            {member && (
              <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                {member.first_name} {member.last_name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <X size={22} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.items}>
          {items
            .filter(i => i.show)
            .map(item => (
              <Pressable
                key={item.key}
                onPress={() => handleNavigate(item.route)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    borderBottomColor: borderColor,
                    backgroundColor: pressed
                      ? isDarkMode
                        ? '#1F2937'
                        : '#F9FAFB'
                      : 'transparent',
                  },
                ]}
              >
                <View style={styles.itemLeft}>
                  <item.Icon size={22} color="#D4AF37" />
                  <Text style={[styles.itemLabel, { color: textColor }]}>{item.label}</Text>
                </View>
                <ChevronRight size={18} color={subtextColor} />
              </Pressable>
            ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  closeButton: { padding: 4 },
  items: { flex: 1 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  itemLabel: { fontSize: 16, fontWeight: '500' },
});
