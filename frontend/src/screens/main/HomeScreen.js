import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

// Dummy data to make the screen look populated
const BREAKING_NEWS = [
  { id: '1', title: 'Why Has North Korea Sent Troops to Russia?', category: 'Politics', source: 'CNN News', time: '30 min ago', imageUrl: 'https://picsum.photos/seed/news1/300/200' },
  { id: '2', title: 'SpaceX Launches New Satellite Cluster', category: 'Science', source: 'BBC', time: '1 hr ago', imageUrl: 'https://picsum.photos/seed/news2/300/200' },
];

const RECOMMENDATIONS = [
  { id: '3', title: 'The Future of AI in Healthcare', source: 'TechCrunch', time: '2 hr ago', imageUrl: 'https://picsum.photos/seed/news3/100/100' },
  { id: '4', title: 'Global Market update: Stocks rally', source: 'Bloomberg', time: '3 hr ago', imageUrl: 'https://picsum.photos/seed/news4/100/100' },
  { id: '5', title: 'New electric vehicle battery breakthrough', source: 'The Verge', time: '5 hr ago', imageUrl: 'https://picsum.photos/seed/news5/100/100' },
];

export default function HomeScreen() {
  const renderBreakingItem = ({ item }) => (
    <View style={styles.breakingCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.breakingImage} />
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <Text style={styles.breakingTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.sourceRow}>
        <FontAwesome5 name="newspaper" size={12} color="#6B7280" style={{marginRight: 4}} />
        <Text style={styles.sourceText}>{item.source} • {item.time}</Text>
      </View>
    </View>
  );

  const renderRecommendationItem = ({ item }) => (
    <View style={styles.recommendationCard}>
      <Image source={{ uri: item.imageUrl }} style={styles.recommendationImage} />
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationTitle} numberOfLines={2}>{item.title}</Text>
         <View style={styles.sourceRow}>
          <FontAwesome5 name="newspaper" size={12} color="#6B7280" style={{marginRight: 4}} />
          <Text style={styles.sourceText}>{item.source} • {item.time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
           <Ionicons name="grid-outline" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#000000" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingTitle}>Good Morning, User</Text>
          <Text style={styles.greetingSubtitle}>Explore today's world news!</Text>
        </View>

        {/* Breaking News Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Breaking News</Text>
          <TouchableOpacity>
            <Text style={styles.seeMoreText}>See More</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={BREAKING_NEWS}
          renderItem={renderBreakingItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breakingList}
        />

        {/* Recommendation Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommendation</Text>
          <TouchableOpacity>
            <Text style={styles.seeMoreText}>See More</Text>
          </TouchableOpacity>
        </View>
         <FlatList
          data={RECOMMENDATIONS}
          renderItem={renderRecommendationItem}
          keyExtractor={item => item.id}
          scrollEnabled={false} // Disable internal scrolling since it's inside a ScrollView
        />
      </ScrollView>

      {/* Dummy Bottom Tab Bar (Visual only for now) */}
      <View style={styles.bottomTabs}>
        <View style={styles.tabItem}>
            <Ionicons name="home" size={24} color="#FF3B30" />
            <Text style={[styles.tabText, {color: '#FF3B30'}]}>Home</Text>
        </View>
         <View style={styles.tabItem}>
            <Ionicons name="compass-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabText}>Explore</Text>
        </View>
         <View style={styles.tabItem}>
            <Ionicons name="bookmark-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabText}>Bookmark</Text>
        </View>
         <View style={styles.tabItem}>
            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
            <Text style={styles.tabText}>Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  headerRight: { flexDirection: 'row' },
  iconButton: { marginLeft: 16 },
  notificationBadge: { position: 'absolute', top: -2, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', borderWidth: 1.5, borderColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 80 },
  greetingContainer: { paddingHorizontal: 20, marginBottom: 24, marginTop: 10 },
  greetingTitle: { fontSize: 24, fontWeight: 'bold', color: '#000000' },
  greetingSubtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  seeMoreText: { fontSize: 14, color: '#6B7280' },
  breakingList: { paddingLeft: 20 },
  breakingCard: { width: 280, marginRight: 16 },
  breakingImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12, backgroundColor: '#E5E7EB' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#3B82F6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  categoryText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  breakingTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000', marginBottom: 8, lineHeight: 22 },
  sourceRow: { flexDirection: 'row', alignItems: 'center' },
  sourceText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  recommendationCard: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  recommendationImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#E5E7EB', marginRight: 12 },
  recommendationContent: { flex: 1, justifyContent: 'center' },
  recommendationTitle: { fontSize: 16, fontWeight: 'bold', color: '#000000', marginBottom: 8, lineHeight: 22 },
  bottomTabs: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  tabItem: { alignItems: 'center' },
  tabText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 }
});