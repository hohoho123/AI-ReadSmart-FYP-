import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

import LoadingScreen from '../screens/authentication/LoadingScreen';
import LoginScreen from '../screens/authentication/LoginScreen';
import SignupScreen from '../screens/authentication/SignupScreen';
import TopicSelectionScreen from '../screens/authentication/TopicSelectionScreen';
import FillProfileScreen from '../screens/authentication/FillProfileScreen';
// 1. Import the new Home Screen
import HomeScreen from '../screens/main/HomeScreen'; 

export default function AuthNavigator() {
  const [currentRoute, setCurrentRoute] = useState('Loading');

  const navigation = {
    navigate: (route, params) => setCurrentRoute({ name: route, params }),
    replace: (route, params) => setCurrentRoute({ name: route, params }),
    goBack: () => setCurrentRoute({ name: 'Login' }) // Simplified for now
  };

  // Handle route state which can now be an object {name, params} or just a string
  const routeName = typeof currentRoute === 'string' ? currentRoute : currentRoute.name;
  const routeParams = typeof currentRoute === 'object' ? currentRoute.params : {};

  let ScreenComponent;
  switch (routeName) {
    case 'Loading':
      ScreenComponent = LoadingScreen;
      break;
    case 'Login':
      ScreenComponent = LoginScreen;
      break;
    case 'Signup':
      ScreenComponent = SignupScreen;
      break;
    case 'TopicSelection':
      ScreenComponent = TopicSelectionScreen;
      break;
    case 'FillProfile':
      ScreenComponent = FillProfileScreen;
      break;
    // 2. Add the case for Home
    case 'Home':
      ScreenComponent = HomeScreen;
      break;
    default:
      ScreenComponent = LoadingScreen;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
       {/* Pass navigation and route parameters to the screen */}
      <ScreenComponent navigation={navigation} route={{ params: routeParams }} />
    </View>
  );
}