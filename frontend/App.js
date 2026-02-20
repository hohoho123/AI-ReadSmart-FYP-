import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from './src/utils/constants';

export default function App() {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, success, message) => {
    let msg = message;
    if (typeof msg === 'object') {
      try {
        msg = JSON.stringify(msg, null, 2);
      } catch {
        msg = '[object]';
      }
    }
    setResults(prev => [...prev, { test, success, message: msg }]);
  };

  const runTests = async () => {
    setResults([]);
    setTesting(true);

    // Test 1: Backend reachable
    try {
      const res = await fetch(`${API_BASE_URL}/`);
      const data = await res.json();
      addResult('Backend Connection', true, `Connected! Server running`);
    } catch (e) {
      addResult('Backend Connection', false, e.message);
    }

    // Test 2: Health check
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();
      addResult('Health + Database', data.database === 'connected', `DB: ${data.database}`);
    } catch (e) {
      addResult('Health + Database', false, e.message);
    }

    // Test 3: News API
    try {
      const res = await fetch(`${API_BASE_URL}/news/headlines?page=1&page_size=3`);
      const data = await res.json();
      addResult('News API (Headlines)', data.status === 'success', `Got ${data.count} articles`);
    } catch (e) {
      addResult('News API (Headlines)', false, e.message);
    }

    // Test 4: Firebase
    try {
      const res = await fetch(`${API_BASE_URL}/test-firebase`);
      const data = await res.json();
      addResult('Firebase', !data.error, data.status);
    } catch (e) {
      addResult('Firebase', false, e.message);
    }

    // Test 5: AI Summarisation
    try {
      const query =
        'Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.';
      const res = await fetch(`${API_BASE_URL}/test-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      const data = await res.json();
      if (data.status === 'success') {
        addResult(
          'Gemini AI Summarisation',
          true,
          `Summary: ${data.summary}`
        );
      } else {
        addResult('Gemini AI Summarisation', false, data.detail || 'Unknown error');
      }
    } catch (e) {
      addResult('Gemini AI Summarisation', false, e.message);
    }

    // Test 6: Stats
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      const data = await res.json();
      addResult('Database Stats', data.status === 'success', `Users: ${data.total_users}, Conversations: ${data.total_conversations}`);
    } catch (e) {
      addResult('Database Stats', false, e.message);
    }

    setTesting(false);
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />
      
      <Text style={styles.title}>AI-ReadSmart</Text>
      <Text style={styles.subtitle}>Backend Service Test</Text>
      <Text style={styles.url}>API: {API_BASE_URL}</Text>

      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run All Tests</Text>
        )}
      </TouchableOpacity>

      {results.map((r, i) => (
        <View key={i} style={[styles.result, r.success ? styles.pass : styles.fail]}>
          <Text style={styles.resultTitle}>{r.success ? '✅' : '❌'} {r.test}</Text>
          <Text style={styles.resultMsg}>{r.message}</Text>
        </View>
      ))}

      {results.length > 0 && (
        <Text style={styles.summary}>
          {results.filter(r => r.success).length}/{results.length} tests passed
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 4 },
  url: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#99c9ff' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  result: { padding: 14, borderRadius: 10, marginTop: 12 },
  pass: { backgroundColor: '#d4edda' },
  fail: { backgroundColor: '#f8d7da' },
  resultTitle: { fontWeight: 'bold', fontSize: 15 },
  resultMsg: { marginTop: 4, fontSize: 12, color: '#333' },
  summary: { textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600', marginBottom: 40 },
});
