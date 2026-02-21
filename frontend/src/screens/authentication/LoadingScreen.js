import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    // Navigates to Login after the timeout. 
    // Currently set to 30000ms (30 seconds) per your instructions.
    // Recommend changing to 3000ms for production.
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 30000); 

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Placeholder for your actual logo image */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoIcon}>📰</Text> 
        </View>
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoPlaceholder: {
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E53935', 
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E53935',
    fontWeight: '500',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 100,
  }
});