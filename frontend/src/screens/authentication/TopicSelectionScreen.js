import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_OPTIONS } from '../../utils/constants';

const VOICES = [
  { id: 'voice_a', label: 'Voice A (Female)' },
  { id: 'voice_b', label: 'Voice B (Male)' },
  { id: 'voice_c', label: 'Voice C (Neutral)' }
];

export default function TopicSelectionScreen({ navigation, route }) {
  const { signupData } = route.params || {}; 
  
  const [selectedTopics, setSelectedTopics] = useState(['Technology']);
  const [selectedVoice, setSelectedVoice] = useState('voice_a');

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleNext = () => {
    navigation.navigate('FillProfile', {
      signupData: {
        ...signupData,
        topics: selectedTopics,
        ttsVoice: selectedVoice
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalize Feed</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ========================================================= */}
        {/* Topics Section */}
        {/* ========================================================= */}
        <Text style={styles.sectionLabel}>Choose your Topics</Text>
        <View style={styles.pillContainer}>
          {TOPIC_OPTIONS.map((topic) => {
            const isSelected = selectedTopics.includes(topic.label);
            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicPill, isSelected && styles.topicPillSelected]}
                onPress={() => toggleTopic(topic.label)}
              >
                <Text style={[styles.topicText, isSelected && styles.topicTextSelected]}>{topic.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ========================================================= */}
        {/* Voice Section */}
        {/* ========================================================= */}
        <Text style={styles.sectionLabel}>Select Audio Voice</Text>
        <View style={styles.pillContainer}>
          {VOICES.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <TouchableOpacity
                key={voice.id}
                style={[styles.topicPill, isSelected && styles.topicPillSelected]}
                onPress={() => setSelectedVoice(voice.id)}
              >
                <Text style={[styles.topicText, isSelected && styles.topicTextSelected]}>{voice.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Bottom padding for scroll */}
        <View style={{ height: 40 }} />
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
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#000000', marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  topicPill: { borderWidth: 1, borderColor: '#FF3B30', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  topicPillSelected: { backgroundColor: '#FF3B30' },
  topicText: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
  topicTextSelected: { color: '#FFFFFF' },
  footer: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  nextButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});