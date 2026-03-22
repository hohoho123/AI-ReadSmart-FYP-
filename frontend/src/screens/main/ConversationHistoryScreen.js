import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Animated, PanResponder, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { conversationService } from '../../backend_services';
import BottomNavBar from '../../components/BottomNavBar';

// ===================================
// helpers
// ===================================
const formatGroupLabel = (dateStr) => {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86400000); // days
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const groupByDate = (conversations) => {
  const groups = {};
  conversations.forEach((c) => {
    const label = formatGroupLabel(c.updated_at || c.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  });
  // Convert to array format
  return Object.entries(groups).map(([label, data]) => ({ label, data }));
};

// ===================================
// screen
// ===================================
export default function ConversationHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { conversations } = await conversationService.getSaved();
      setGroups(groupByDate(conversations || []));
    } catch (e) {
      console.error('Load conversations failed:', e);
      setError('Could not load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

// ===================================
// delete handler
// ===================================
  const handleDelete = async (conversationId) => {
    try {
      await conversationService.delete(conversationId);
      // Update local state
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            data: g.data.filter((c) => c.conversation_id !== conversationId),
          }))
          .filter((g) => g.data.length > 0)
      );
    } catch (e) {
      console.error('Delete failed:', e);
      Alert.alert('Delete Failed', 'Could not delete the conversation.');
    }
  };

// ===================================
// swipeable card
// ===================================
  const SwipeableCard = ({ item }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);
    const DELETE_WIDTH = 70;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          const base = isOpen.current ? -DELETE_WIDTH : 0;
          const val = Math.min(0, Math.max(-DELETE_WIDTH, base + g.dx));
          translateX.setValue(val);
        },
        onPanResponderRelease: (_, g) => {
          const base = isOpen.current ? -DELETE_WIDTH : 0;
          const final = base + g.dx;
          if (final < -DELETE_WIDTH / 2) {
            isOpen.current = true;
            Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
          } else {
            isOpen.current = false;
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      })
    ).current;

    const preview = item.preview || 'No messages';

    return (
      <View style={styles.swipeWrapper}>
        {/* Delete button behind the card */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.8}
          onPress={() => handleDelete(item.conversation_id)}
        >
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Foreground card */}
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ConversationDetail', {
              conversationId: item.conversation_id,
              articleTitle: item.article_title,
            })}
          >
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.article_title || 'Untitled Article'}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {preview}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top || (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24) }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversation</Text>
      </View>
      <View style={styles.separator} />

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadConversations}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No saved conversations yet.</Text>
          <Text style={styles.emptySubText}>
            Open an article, chat with the AI, and tap the bookmark icon to save.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.data.map((conv) => (
                <SwipeableCard key={conv.conversation_id} item={conv} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Bottom Nav ── */}
      <BottomNavBar activeTab="Conversation" navigation={navigation} />
    </View>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  separator: {
    height: 2,
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
  },
  cardInner: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  swipeWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 8,
    width: 70,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
