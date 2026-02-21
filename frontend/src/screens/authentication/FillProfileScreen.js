import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../backend_services';

export default function FillProfileScreen({ navigation, route }) {
  // 1. Catch ALL the data from the previous screens
  const { signupData } = route.params || {};

  // Pre-fill fields from the first screen to match your mockup design
  const [username, setUsername] = useState(signupData?.displayName || '');
  const [email, setEmail] = useState(signupData?.email || '');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompleteSetup = async () => {
    if (!fullName || !phone) {
      setError("Please fill in your full name and phone number.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 2. THE UNIFIED API CALL
      // We send all accumulated data to the backend at once!
      const response = await authService.signup(
        email, 
        signupData.password, 
        username, 
        fullName, 
        phone, 
        signupData.topics 
      );
      
      if (response.success) {
        console.log("Account completely setup! No ghost users.");
        // Success! For now, we will route back to login so you can test logging in.
        // Later, this will route straight to your Home feed.
        navigation.navigate('Login');
      }
    } catch (err) {
      setError(err.message || "Failed to finalize account setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fill your Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} />

            <Text style={styles.label}>Full Name<Text style={styles.asterisk}>*</Text></Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

            <Text style={styles.label}>Phone Number<Text style={styles.asterisk}>*</Text></Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleCompleteSetup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  avatarContainer: { alignItems: 'center', marginVertical: 30 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cameraIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '500' },
  asterisk: { color: '#FF3B30' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20, color: '#000000' },
  errorText: { color: '#FF3B30', marginBottom: 20, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 30 },
  nextButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});