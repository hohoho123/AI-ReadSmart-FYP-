import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../backend_services/api';

// UI Components
import BottomNavBar from '../../components/BottomNavBar'; 

export default function HomeScreen({ navigation }) {
  // --- STATE MANAGEMENT ---
  const hasMounted = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  // Breaking News State (Horizontal Scroll)
  const [breakingNews, setBreakingNews] = useState([]);
  const [breakingPage, setBreakingPage] = useState(1);
  const [breakingLoading, setBreakingLoading] = useState(true);
  const [breakingHasMore, setBreakingHasMore] = useState(true);
  const [breakingFetchingMore, setBreakingFetchingMore] = useState(false); // Protects Page 2 from Page 1

  // Recommendations State (Vertical Scroll & Tabs)
  const [userTopics, setUserTopics] = useState([]); 
  const [selectedTab, setSelectedTab] = useState('All');
  const [recommendations, setRecommendations] = useState([]);
  const [recPage, setRecPage] = useState(1);
  const [recLoading, setRecLoading] = useState(false);
  const [recHasMore, setRecHasMore] = useState(true);

  // --- USE EFFECTS (LISTENERS) ---

  // Initial load on mount
  useEffect(() => {
    fetchBreakingNews(1);
    fetchRecommendations(1);
    hasMounted.current = true;
  }, []);

  // Re-fetch when returning to this screen (e.g. after topic changes in ExploreScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!hasMounted.current) return;
      setBreakingPage(1);
      setBreakingHasMore(true);
      setRecPage(1);
      setRecHasMore(true);
      setSelectedTab('All');
      fetchBreakingNews(1);
      fetchRecommendations(1);
    });
    return unsubscribe;
  }, [navigation]);

  // Listener for page number changes
  useEffect(() => {
    if (breakingPage > 1) {
      fetchBreakingNews(breakingPage);
    }
  }, [breakingPage]);

  // Listener for tab or page changes
  useEffect(() => {
    if (!hasMounted.current) return;
    fetchRecommendations(recPage);
  }, [selectedTab, recPage]);

  // --- CORE LOGIC ---

  // Format timestamp
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const diffMins = Math.round((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return `${Math.floor(diffHrs / 24)} days ago`;
  };

  // Fetch Breaking News
  const fetchBreakingNews = async (pageNumber) => {
    if (!breakingHasMore && pageNumber !== 1) return;
    
    try {
      if (pageNumber === 1) {
        setBreakingLoading(true);
      } else {
        setBreakingFetchingMore(true); // Show the small right-side spinner
      }
      
      const response = await api.get('/news/feed', { params: { page: pageNumber } });
      
      // Extract topics for dynamic tab bar on first load
      if (response.data.user_topics && pageNumber === 1) {
        setUserTopics(['All', ...response.data.user_topics]);
      }

      const newArticles = response.data.articles || [];

      if (newArticles.length === 0) {
        setBreakingHasMore(false);
      } else {
        const formatted = newArticles.map((article, index) => ({
          id: `brk-${pageNumber}-${index}-${Math.random().toString(36).substring(7)}`, // Bulletproof unique keys
          title: article.title || 'Untitled',
          source: article.source?.name || 'News Update',
          category: article.category || 'Breaking',
          time: formatTimeAgo(article.publishedAt),
          imageUrl: article.urlToImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400&auto=format&fit=crop',
          description: article.description || '',
          content: article.content || '',
          url: article.url || '',
          publishedAt: article.publishedAt || '',
        }));

        setBreakingNews(prev => pageNumber === 1 ? formatted : [...prev, ...formatted]);
      }
    } catch (err) {
      console.log('Breaking fetch error:', err);
    } finally {
      // Turn off whichever spinner was currently active
      if (pageNumber === 1) setBreakingLoading(false);
      else setBreakingFetchingMore(false);
    }
  };

  // I am using this handler to strictly protect against API spamming on horizontal scroll
  const handleLoadMoreBreaking = () => {
    if (!breakingLoading && !breakingFetchingMore && breakingHasMore) {
      setBreakingPage(p => p + 1);
    }
  };

  // I am fetching Recommendations. 5 at a time, appending seamlessly on vertical scroll.
  const fetchRecommendations = async (pageNumber) => {
    if ((recLoading || !recHasMore) && pageNumber !== 1) return;
    try {
      setRecLoading(true);
      const response = await api.get('/news/recommendations', {
        params: { topic: selectedTab, page: pageNumber }
      });

      const newArticles = response.data.articles || [];
      if (newArticles.length === 0) {
        setRecHasMore(false);
      } else {
        const formatted = newArticles.map((article, index) => ({
          id: `rec-${selectedTab}-${pageNumber}-${index}-${Math.random().toString(36).substring(7)}`,
          title: article.title || 'Untitled',
          source: article.source?.name || 'News',
          category: selectedTab !== 'All' ? selectedTab : (article.category || ''),
          time: formatTimeAgo(article.publishedAt),
          imageUrl: article.urlToImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400&auto=format&fit=crop',
          description: article.description || '',
          content: article.content || '',
          url: article.url || '',
          publishedAt: article.publishedAt || '',
        }));

        setRecommendations(prev => pageNumber === 1 ? formatted : [...prev, ...formatted]);
      }
    } catch (err) {
      console.log('Rec fetch error:', err);
    } finally {
      setRecLoading(false);
    }
  };

  // I am implementing Pull-to-Refresh to wipe the slate clean and reload everything
  const onRefresh = async () => {
    setRefreshing(true);
    setBreakingPage(1);
    setBreakingHasMore(true);
    setRecPage(1);
    setRecHasMore(true);
    await Promise.all([fetchBreakingNews(1), fetchRecommendations(1)]);
    setRefreshing(false);
  };

  // I am handling tab switches. It clears the old topic and starts fresh.
  const handleTabPress = (tab) => {
    if (selectedTab !== tab) {
      setSelectedTab(tab);
      setRecPage(1);
      setRecommendations([]);
      setRecHasMore(true);
    }
  };

  // --- RENDERERS ---

  // I am leaving your Breaking Card UI untouched
  const renderBreakingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.breakingCard}
      onPress={() => navigation.navigate('ArticleDetail', { article: item })}
      activeOpacity={0.92}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.breakingImage} />
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <Text style={styles.breakingTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.sourceRow}>
        <FontAwesome5 name="newspaper" size={12} color="#6B7280" style={{marginRight: 4}} />
        <Text style={styles.sourceText}>{item.source} • {item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  // I am building the Recommendation Card with the image strictly on the left
  const renderRecommendationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recCard}
      onPress={() => navigation.navigate('ArticleDetail', { article: item })}
      activeOpacity={0.92}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.recImageLeft} />
      <View style={styles.recContentRight}>
        <Text style={styles.recTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.sourceRow}>
          <FontAwesome5 name="newspaper" size={12} color="#9CA3AF" style={{marginRight: 6}} />
          <Text style={styles.recSourceText}>{item.source} • {item.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appNameRed}>AI-</Text>
          <Text style={styles.appNameBlack}>ReadSmart</Text>
          <Ionicons name="book" size={24} color="#FF3B30" style={{ marginLeft: 8 }} />
        </View>
      </View>

      {/* MAIN CONTENT (Vertical Infinite Scroll) */}
      <FlatList
        data={recommendations}
        renderItem={renderRecommendationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        
        // I am attaching the Pull-to-Refresh control
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3B30" />}
        
        // I am triggering the vertical infinite scroll
        onEndReached={() => { if (!recLoading && recHasMore) setRecPage(p => p + 1); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={recLoading && recPage > 1 ? <ActivityIndicator size="small" color="#FF3B30" style={{ margin: 20 }} /> : null}
        
        ListHeaderComponent={
          <>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingTitle}>Your Personalized Feed</Text>
              <Text style={styles.greetingSubtitle}>Based on your followed topics</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Breaking News</Text>
            </View>
            
            {breakingLoading && breakingPage === 1 ? (
              <ActivityIndicator size="large" color="#FF3B30" style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={breakingNews}
                renderItem={renderBreakingItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.breakingList}
                
                // I am wiring up the secure infinite scroll handler here
                onEndReached={handleLoadMoreBreaking}
                onEndReachedThreshold={0.2}
                
                // I am adding the spinner for Page 2+ requests
                ListFooterComponent={breakingFetchingMore ? <ActivityIndicator size="small" color="#FF3B30" style={{ marginHorizontal: 20, alignSelf: 'center' }} /> : null}
              />
            )}

            {/* Added padding to separate Recommendations from Breaking News */}
            <View style={[styles.sectionHeader, { marginTop: 40, marginBottom: 12 }]}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
            </View>

            {/* Dynamic Tab Bar */}
            <FlatList
              data={userTopics}
              keyExtractor={item => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarList}
              renderItem={({ item }) => {
                const isSelected = item === selectedTab;
                return (
                  <TouchableOpacity onPress={() => handleTabPress(item)} style={styles.tabButton}>
                    <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && <View style={styles.tabIndicator} />}
                  </TouchableOpacity>
                );
              }}
            />
            
            {recLoading && recPage === 1 && <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 40 }} />}
          </>
        }
      />

      {/* Dropped in our clean, reusable Bottom Nav Component */}
      <BottomNavBar activeTab="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

// I am styling this with a strict designer eye: clean spacing, subtle colors, precise typography.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#fff', zIndex: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appNameRed: { fontSize: 22, fontWeight: '900', color: '#FF3B30', letterSpacing: -0.5 },
  appNameBlack: { fontSize: 22, fontWeight: '900', color: '#000000', letterSpacing: -0.5 },
  
  mainScrollContent: { paddingBottom: 110 },
  greetingContainer: { paddingHorizontal: 20, marginBottom: 20, marginTop: 16 },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  greetingSubtitle: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  
  breakingList: { paddingLeft: 20 },
  breakingCard: { width: 280, marginRight: 16 },
  breakingImage: { width: '100%', height: 160, borderRadius: 16, marginBottom: 12, backgroundColor: '#E5E7EB' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#3B82F6', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  categoryText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  breakingTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8, lineHeight: 22 },
  sourceRow: { flexDirection: 'row', alignItems: 'center' },
  sourceText: { fontSize: 12, color: '#6B7280', marginLeft: 4, fontWeight: '500' },
  
  tabBarList: { paddingLeft: 20, paddingRight: 20, paddingBottom: 20 },
  tabButton: { marginRight: 24, paddingBottom: 6 },
  tabButtonText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  tabButtonTextSelected: { color: '#111827', fontWeight: '800' },
  tabIndicator: { height: 3, width: '100%', backgroundColor: '#FF3B30', marginTop: 6, borderRadius: 2 }, 

  recCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recImageLeft: { 
    width: 85, 
    height: 85, 
    borderRadius: 12, 
    backgroundColor: '#E5E7EB', 
    marginRight: 16 
  },
  recContentRight: { 
    flex: 1, 
    justifyContent: 'space-between',
    height: 75
  },
  recTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827', 
    lineHeight: 22,
    letterSpacing: -0.2
  },
  recSourceText: { 
    fontSize: 12, 
    color: '#9CA3AF', 
    fontWeight: '500' 
  }
});