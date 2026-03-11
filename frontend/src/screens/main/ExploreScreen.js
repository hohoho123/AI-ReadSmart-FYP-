import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_OPTIONS } from '../../utils/constants';
import { preferencesService } from '../../backend_services';
import BottomNavBar from '../../components/BottomNavBar';

// ─────────────────────────────────────────────
// SINGLE TOPIC ROW COMPONENT
// ─────────────────────────────────────────────
const TopicRow = ({ topic, isFollowing, onToggle, isLoading }) => (
  <View style={styles.topicRow}>
    <Image source={{ uri: topic.image }} style={styles.topicImage} />

    <View style={styles.topicInfo}>
      <Text style={styles.topicName}>{topic.label}</Text>
      <Text style={styles.topicDesc} numberOfLines={2}>
        {topic.description}
      </Text>
    </View>

    <TouchableOpacity
      style={[styles.followBtn, isFollowing && styles.followingBtn]}
      onPress={() => onToggle(topic)}
      disabled={isLoading}
      activeOpacity={0.75}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isFollowing ? '#FFFFFF' : '#FF3B30'} />
      ) : (
        <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────
// MAIN EXPLORE SCREEN
// ─────────────────────────────────────────────
export default function ExploreScreen({ navigation }) {
  const [followedTopics, setFollowedTopics] = useState([]);  // labels from backend
  const [pageLoading, setPageLoading]       = useState(true);  // initial fetch
  const [loadingTopic, setLoadingTopic]     = useState(null);  // per-row spinner

  // ─── Load current preferences on mount ──────────────────────────────────
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setPageLoading(true);
      const prefs = await preferencesService.getPreferences();
      if (prefs?.followed_topics) {
        setFollowedTopics(prefs.followed_topics);
      }
    } catch (err) {
      console.log('ExploreScreen: failed to load preferences:', err);
      Alert.alert('Error', 'Could not load your topics. Please try again.');
    } finally {
      setPageLoading(false);
    }
  };

  // ─── Follow / Unfollow toggle ────────────────────────────────────────────
  const handleToggle = useCallback(
    async (topic) => {
      const isCurrentlyFollowing = followedTopics.includes(topic.label);
      setLoadingTopic(topic.id);

      try {
        if (isCurrentlyFollowing) {
          // Optimistic UI update
          setFollowedTopics((prev) => prev.filter((t) => t !== topic.label));
          await preferencesService.removeTopic(topic.label);
        } else {
          // Optimistic UI update
          setFollowedTopics((prev) => [...prev, topic.label]);
          await preferencesService.addTopic(topic.label);
        }
      } catch (err) {
        // Rollback on failure
        console.log('Toggle topic error:', err);
        setFollowedTopics((prev) =>
          isCurrentlyFollowing
            ? [...prev, topic.label]        // re-add on unfollow failure
            : prev.filter((t) => t !== topic.label) // remove on follow failure
        );
        Alert.alert('Error', `Could not update "${topic.label}". Please check your connection.`);
      } finally {
        setLoadingTopic(null);
      }
    },
    [followedTopics]
  );


  // ─── Render ──────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <TopicRow
      topic={item}
      isFollowing={followedTopics.includes(item.label)}
      onToggle={handleToggle}
      isLoading={loadingTopic === item.id}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>

      {/* ── BLUE UNDERLINE ───────────────────────────────────────── */}
      <View style={styles.headerUnderline} />


      {/* ── SECTION LABEL ────────────────────────────────────────── */}
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>Topics</Text>
      </View>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      {pageLoading ? (
        <ActivityIndicator size="large" color="#FF3B30" style={styles.centeredLoader} />
      ) : (
        <FlatList
          data={TOPIC_OPTIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <BottomNavBar activeTab="Explore" navigation={navigation} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: -0.5,
  },
  headerUnderline: {
    height: 2,
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 16,
  },

  // Search
  // (removed)

  // Section label
  sectionLabelRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.2,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  // Topic row
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  topicImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    marginRight: 14,
  },
  topicInfo: {
    flex: 1,
    marginRight: 12,
  },
  topicName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  topicDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    fontWeight: '400',
  },

  // Follow button
  followBtn: {
    minWidth: 88,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
  },
  followingBtn: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  followingBtnText: {
    color: '#FFFFFF',
  },

  // Loading / empty
  centeredLoader: {
    flex: 1,
    alignSelf: 'center',
  },
});
