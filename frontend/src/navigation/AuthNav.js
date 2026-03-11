import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

import LoadingScreen from '../screens/authentication/LoadingScreen';
import LoginScreen from '../screens/authentication/LoginScreen';
import SignupScreen from '../screens/authentication/SignupScreen';
import TopicSelectionScreen from '../screens/authentication/TopicSelectionScreen';
import FillProfileScreen from '../screens/authentication/FillProfileScreen';
import HomeScreen from '../screens/main/HomeScreen';
import ExploreScreen from '../screens/main/ExploreScreen';
import ArticleDetailScreen from '../screens/main/ArticleDetailScreen'; 
import ConversationHistoryScreen from '../screens/main/ConversationHistoryScreen';
import ConversationDetailScreen from '../screens/main/ConversationDetailScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import AccountDetailsScreen from '../screens/settings/AccountDetailsScreen';
import AudioControlScreen from '../screens/settings/AudioControlScreen';
import NotificationScreen from '../screens/settings/NotificationScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';

export default function AuthNavigator() {
  const [currentRoute, setCurrentRoute] = useState('Loading');
  const [routeHistory, setRouteHistory] = useState([]);
  const listenersRef = React.useRef({});

  const emit = (event) => {
    (listenersRef.current[event] || []).forEach(cb => cb());
  };

  const navigation = {
    navigate: (route, params) => {
      setRouteHistory(prev => [...prev, currentRoute]);
      setCurrentRoute({ name: route, params });
    },
    replace: (route, params) => setCurrentRoute({ name: route, params }),
    goBack: () => {
      setRouteHistory(prev => {
        const stack = [...prev];
        const previous = stack.pop();
        if (previous) {
          setCurrentRoute(previous);
        }
        return stack;
      });
    },
    addListener: (event, callback) => {
      listenersRef.current[event] = [...(listenersRef.current[event] || []), callback];
      return () => {
        listenersRef.current[event] = (listenersRef.current[event] || []).filter(cb => cb !== callback);
      };
    },
  };

  // Handle route state which can now be an object {name, params} or just a string
  const routeName = typeof currentRoute === 'string' ? currentRoute : currentRoute.name;
  const routeParams = typeof currentRoute === 'object' ? currentRoute.params : {};

  // Emit focus event whenever the active screen changes
  React.useEffect(() => {
    emit('focus');
  }, [routeName]);

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
    case 'Home':
      ScreenComponent = HomeScreen;
      break;
    case 'Explore':
      ScreenComponent = ExploreScreen;
      break;
    case 'ArticleDetail':
      ScreenComponent = ArticleDetailScreen;
      break;
    case 'ConversationHistory':
      ScreenComponent = ConversationHistoryScreen;
      break;
    case 'ConversationDetail':
      ScreenComponent = ConversationDetailScreen;
      break;
    case 'Profile':
      ScreenComponent = ProfileScreen;
      break;
    case 'AccountDetails':
      ScreenComponent = AccountDetailsScreen;
      break;
    case 'AudioControl':
      ScreenComponent = AudioControlScreen;
      break;
    case 'Notification':
      ScreenComponent = NotificationScreen;
      break;
    case 'Security':
      ScreenComponent = SecurityScreen;
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