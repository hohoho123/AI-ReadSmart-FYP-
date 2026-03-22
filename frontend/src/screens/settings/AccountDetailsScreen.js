import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../backend_services';
import api from '../../backend_services/api';
import { storage } from '../../utils/storage';

export default function AccountDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get('/auth/me');
        const user = response.data.user;
        setUsername(user.display_name || '');
        setFullName(user.full_name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!username.trim() || !fullName.trim()) {
      Alert.alert('Error', 'Username and Full Name are required.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('/auth/update-profile', {
        display_name: username.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      await storage.saveUser(response.data.user);
      Alert.alert('Saved', 'Your account details have been updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save.');
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
        <Text style={styles.headerTitle}>Account Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" />

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, styles.disabled]} value={email} editable={false} />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" keyboardType="phone-pad" />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  form: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 18 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1F2937',
  },
  disabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  saveBtn: {
    backgroundColor: '#FF3B30', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
