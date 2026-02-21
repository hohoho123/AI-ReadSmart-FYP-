import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { authService } from '../../backend_services';

export default function SignupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!displayName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.signup(email, password, displayName);
      if (response.success) {
        // Route new users to the mandatory profile setup
        navigation.replace('ProfileSetup');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.titleRed}>Hello!</Text>
          <Text style={styles.subtitle}>
            Let get started by signing up now.
          </Text>
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
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
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
  titleRed: { fontSize: 40, fontWeight: 'bold', color: '#FF3B30', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '500' },
  asterisk: { color: '#FF3B30' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20, color: '#000000' },
  signupButton: { backgroundColor: '#FF3B30', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 30, marginTop: 10 },
  signupButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#FF3B30', marginBottom: 10, textAlign: 'center' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#FF3B30', fontSize: 14, fontWeight: 'bold' }
});