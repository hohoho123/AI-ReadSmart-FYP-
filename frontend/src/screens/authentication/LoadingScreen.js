import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoadingScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000); 

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="newspaper-outline" size={80} color="#FF3B30" style={styles.icon} />
        <Text style={styles.title}>AI-ReadSmart</Text>
        <Text style={styles.subtitle}>A New Way of Reading Articles & News</Text>
      </View>
      
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', marginBottom: 60 },
  icon: { marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF3B30', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#FF3B30', fontWeight: '500' },
  loaderContainer: { position: 'absolute', bottom: 100 }
});