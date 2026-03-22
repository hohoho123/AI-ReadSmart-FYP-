import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { preferencesService } from '../../backend_services';
import { VOICE_OPTIONS } from '../../utils/constants';

export default function AudioControlScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('voice_a');

  useEffect(() => {
    (async () => {
      try {
        const prefs = await preferencesService.getPreferences();
        if (prefs) {
          setSelectedVoice(prefs.tts_voice || 'voice_a');
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await preferencesService.updatePreferences({
        ttsVoice: selectedVoice,
      });
      Alert.alert('Saved', 'Audio settings updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save audio settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top || 44 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}><ActivityIndicator size="large" color="#FF3B30" /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top || 44 }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio Control</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Voice selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TTS Voice</Text>
        {VOICE_OPTIONS.map((voice) => (
          <TouchableOpacity
            key={voice.id}
            style={[styles.optionRow, selectedVoice === voice.id && styles.optionRowActive]}
            onPress={() => setSelectedVoice(voice.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.optionName}>{voice.name}</Text>
              <Text style={styles.optionDesc}>{voice.description}</Text>
            </View>
            {selectedVoice === voice.id && (
              <Ionicons name="checkmark-circle" size={22} color="#FF3B30" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Save */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    marginBottom: 10, backgroundColor: '#F9FAFB',
  },
  optionRowActive: { borderColor: '#FF3B30', backgroundColor: '#FFF5F5' },
  optionName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  optionDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  footer: { paddingHorizontal: 24, marginTop: 'auto', marginBottom: 40 },
  saveBtn: {
    backgroundColor: '#FF3B30', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
