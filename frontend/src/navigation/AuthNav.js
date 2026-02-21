import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// We will build these screens next
import LoadingScreen from '../screens/authentication/LoadingScreen';
import LoginScreen from '../screens/authentication/LoginScreen';
import SignupScreen from '../screens/authentication/SignupScreen';
import TopicSelectionScreen from '../screens/authentication/TopicSelectionScreen';
import VoiceSelectionScreen from '../screens/authentication/VoiceSelectionScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Loading" component={LoadingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="TopicSelection" component={TopicSelectionScreen} />
      <Stack.Screen name="VoiceSelection" component={VoiceSelectionScreen} />
    </Stack.Navigator>
  );
}