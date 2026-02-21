import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!displayName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    
    // We do NOT call authService here.
    // We pass the data to the next screen using navigation parameters.
    navigation.navigate('TopicSelection', { 
      signupData: { email, password, displayName } 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.titleRed}>Hello!</Text>
          <Text style={styles.subtitle}>Let get started by signing up now.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username<Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email Address<Text style={styles.asterisk}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password<Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Next: Choose Topics</Text>
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { marginBottom: 40 },
  titleRed: { fontSize: 40, fontWeight: 'bold', color: '#FF3B30' },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24, marginTop: 10 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '500' },
  asterisk: { color: '#FF3B30' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20, color: '#000000' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, marginBottom: 10 },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#000000' },
  errorText: { color: '#FF3B30', marginBottom: 20, textAlign: 'center' },
  primaryButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  footerContainer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#FF3B30', fontSize: 14, fontWeight: 'bold' }
});