import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ALL_TOPICS = [
  'National', 'International', 'Sport', 'Lifestyle', 'Business', 
  'Health', 'Fashion', 'Technology', 'Science', 'Art', 'Politics'
];

export default function TopicSelectionScreen({ navigation, route }) {
  // 1. Catch the data passed from the Signup Screen
  const { signupData } = route.params || {}; 
  
  const [search, setSearch] = useState('');
  const [selectedTopics, setSelectedTopics] = useState(['Technology']);

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleNext = () => {
    // 2. Pass the old data PLUS the new topics forward to the final screen
    navigation.navigate('FillProfile', {
      signupData: {
        ...signupData,
        topics: selectedTopics
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose your Topics</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
        />
        <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.topicsContainer}>
        {ALL_TOPICS.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          return (
            <TouchableOpacity
              key={topic}
              style={[styles.topicPill, isSelected && styles.topicPillSelected]}
              onPress={() => toggleTopic(topic)}
            >
              <Text style={[styles.topicText, isSelected && styles.topicTextSelected]}>
                {topic}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next: Setup Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  searchIcon: { marginLeft: 8 },
  topicsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  topicPill: { borderWidth: 1, borderColor: '#FF3B30', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  topicPillSelected: { backgroundColor: '#FF3B30' },
  topicText: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
  topicTextSelected: { color: '#FFFFFF' },
  footer: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  nextButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});