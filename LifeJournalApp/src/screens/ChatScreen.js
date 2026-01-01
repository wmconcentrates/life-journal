import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VOID } from '../theme/colors';
import Orb from '../components/Orb';
import { chatAPI } from '../services/api';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [usageLevel, setUsageLevel] = useState('normal');
  const flatListRef = useRef(null);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Add initial coach greeting
    setMessages([{
      id: 'welcome',
      role: 'coach',
      content: "Hey there, friend. What's on your mind?",
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const result = await chatAPI.sendMessage(userMessage.content, sessionId);

      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      if (result.usageLevel) {
        setUsageLevel(result.usageLevel);
      }

      const coachMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: result.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, coachMessage]);

      // Handle auto-end
      if (result.autoEnd) {
        Alert.alert(
          'Session Complete',
          "The coach has ended this session. Your conversation has been summarized and saved to your timeline.",
          [
            {
              text: 'View Summary',
              onPress: () => {
                if (result.summary) {
                  Alert.alert('Summary', result.summary.summary);
                }
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'coach',
        content: "Hey man, something went sideways. Try that again?",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [inputText, sessionId, sending, navigation]);

  const endSession = useCallback(async () => {
    if (!sessionId) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      'End Chat?',
      'This will save a summary of your conversation to your timeline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End & Save',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await chatAPI.endSession(sessionId);
              Alert.alert(
                'Chat Saved',
                result.summary?.summary || 'Your conversation has been summarized.',
                [{ text: 'Done', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('End session error:', error);
              navigation.goBack();
            }
          },
        },
      ]
    );
  }, [sessionId, navigation]);

  const getUsageWarning = () => {
    switch (usageLevel) {
      case 'soft':
        return { show: false };
      case 'moderate':
        return { show: true, text: 'Consider stepping away soon', color: VOID.orb.warm };
      case 'strong':
        return { show: true, text: 'Time to go live a little', color: VOID.orb.accent };
      default:
        return { show: false };
    }
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const isFirst = index === 0 || messages[index - 1]?.role !== item.role;

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userContainer : styles.coachContainer,
          { opacity: fadeIn },
        ]}
      >
        {!isUser && isFirst && (
          <View style={styles.coachAvatar}>
            <Orb size={36} color={VOID.orb.primary} intensity={0.6}>
              <Text style={{ fontSize: 16 }}>🧘</Text>
            </Orb>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.coachBubble,
            !isUser && !isFirst && styles.coachBubbleNoAvatar,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userText]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const usageWarning = getUsageWarning();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[VOID.deep, VOID.dark]}
          style={StyleSheet.absoluteFill}
        />
        <Orb size={80} color={VOID.orb.primary} pulse>
          <ActivityIndicator color={VOID.text.primary} />
        </Orb>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[VOID.deep, VOID.dark, '#0F0F18']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeIn }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Orb size={44} color={VOID.orb.primary} pulse intensity={0.7}>
            <Text style={{ fontSize: 20 }}>🧘</Text>
          </Orb>
          <Text style={styles.headerTitle}>Chat with Coach</Text>
        </View>
        <TouchableOpacity onPress={endSession} style={styles.endButton}>
          <Text style={styles.endText}>End</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Usage Warning */}
      {usageWarning.show && (
        <View style={[styles.warningBanner, { backgroundColor: usageWarning.color + '33' }]}>
          <Text style={[styles.warningText, { color: usageWarning.color }]}>
            {usageWarning.text}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {sending && (
          <View style={styles.typingContainer}>
            <Orb size={30} color={VOID.orb.secondary} pulse intensity={0.5}>
              <Text style={{ fontSize: 12 }}>...</Text>
            </Orb>
            <Text style={styles.typingText}>Coach is thinking...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              placeholderTextColor={VOID.text.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            <Orb
              size={50}
              color={inputText.trim() && !sending ? VOID.orb.primary : VOID.border.medium}
              intensity={inputText.trim() && !sending ? 0.8 : 0.3}
            >
              <Text style={{ fontSize: 20 }}>↑</Text>
            </Orb>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VOID.deep,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: VOID.border.subtle,
  },
  backButton: {
    padding: 8,
    width: 60,
  },
  backText: {
    color: VOID.orb.primary,
    fontSize: 16,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: VOID.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  endButton: {
    padding: 8,
    width: 60,
    alignItems: 'flex-end',
  },
  endText: {
    color: VOID.orb.accent,
    fontSize: 16,
  },
  warningBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  coachContainer: {
    justifyContent: 'flex-start',
  },
  coachAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: VOID.orb.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  coachBubble: {
    backgroundColor: VOID.elevated,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
  },
  coachBubbleNoAvatar: {
    marginLeft: 44,
  },
  messageText: {
    color: VOID.text.secondary,
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: VOID.text.primary,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  typingText: {
    color: VOID.text.muted,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: VOID.border.subtle,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: VOID.elevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: VOID.border.subtle,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxHeight: 120,
  },
  input: {
    color: VOID.text.primary,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 96,
  },
  sendButton: {
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen;
