import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { chatService } from '@/services/chat';
import { ChatMessage } from '@/types/chat';
import { Trash2, Send } from '@/components/Icons';

export default function ChatScreen() {
  const { member: user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    const unsubscribe = chatService.subscribeToMessages((message) => {
      setMessages((prev) => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadMessages = async () => {
    try {
      const data = await chatService.getMessages(1000);
      setMessages(data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      Alert.alert('Greška', 'Nije moguće učitati poruke');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    console.log('handleSend called', {
      hasMessage: !!newMessage.trim(),
      hasUser: !!user,
      isSending: sending,
      userId: user?.id
    });

    if (!newMessage.trim()) {
      console.log('No message to send');
      return;
    }

    if (!user) {
      console.log('No user found');
      Alert.alert('Greška', 'Morate biti prijavljeni da biste slali poruke');
      return;
    }

    if (sending) {
      console.log('Already sending');
      return;
    }

    console.log('Sending message:', { message: newMessage, userId: user.id });
    setSending(true);
    try {
      const result = await chatService.sendMessage(newMessage, user.id);
      console.log('Message sent successfully:', result);

      setMessages((prev) => [...prev, result]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      setNewMessage('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint);
      Alert.alert('Greška', `Nije moguće poslati poruku: ${error?.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user) return;

    Alert.alert(
      'Obriši poruku',
      'Da li ste sigurni da želite obrisati ovu poruku?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteMessage(messageId, user.id);
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Greška', 'Nije moguće obrisati poruku');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.member_id === user?.id;
    const isAdmin = user?.is_admin || false;
    const nickname = item.member?.chat_nickname || 'Unknown';
    const timestamp = new Date(item.created_at).toLocaleTimeString('hr-BA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
          <Text style={[styles.nickname, isOwn && styles.ownNickname]}>{nickname}</Text>
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
              {timestamp}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteButton}
              >
                <Trash2 size={14} color={isOwn ? "#000" : "#D4AF37"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Učitavanje chata...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Čelik Chat</Text>
        <Text style={styles.headerSubtitle}>Samo za članove</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Napišite poruku..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#D4AF37',
  },
  header: {
    backgroundColor: '#000',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B8960F',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  ownMessageBubble: {
    backgroundColor: '#D4AF37',
    borderColor: '#B8960F',
  },
  nickname: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 4,
  },
  ownNickname: {
    color: '#000',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
  },
  ownTimestamp: {
    color: '#3a3a3a',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 2,
    borderTopColor: '#D4AF37',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#D4AF37',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#4a4a4a',
  },
});
