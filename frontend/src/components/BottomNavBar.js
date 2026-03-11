import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Accepts 'activeTab' to highlight the correct icon and 'navigation' to route between screens.
export default function BottomNavBar({ activeTab, navigation }) {

  const getIconColor = (tabName) => activeTab === tabName ? '#FF3B30' : '#9CA3AF';
  const getTextColor = (tabName) => activeTab === tabName ? '#FF3B30' : '#9CA3AF';

  const goTo = (screen) => {
    if (!navigation) return;
    if (activeTab === screen) return; // already here, do nothing
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('Home')}>
        <Ionicons name="home" size={24} color={getIconColor('Home')} />
        <Text style={[styles.tabText, { color: getTextColor('Home') }]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('Explore')}>
        <Ionicons name={activeTab === 'Explore' ? 'compass' : 'compass-outline'} size={24} color={getIconColor('Explore')} />
        <Text style={[styles.tabText, { color: getTextColor('Explore') }]}>Explore</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('ConversationHistory')}>
        <Ionicons name={activeTab === 'Conversation' ? 'bookmark' : 'bookmark-outline'} size={24} color={getIconColor('Conversation')} />
        <Text style={[styles.tabText, { color: getTextColor('Conversation') }]}>Conversation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => goTo('Profile')}>
        <Ionicons name={activeTab === 'Profile' ? 'person' : 'person-outline'} size={24} color={getIconColor('Profile')} />
        <Text style={[styles.tabText, { color: getTextColor('Profile') }]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

// I am adding a soft top shadow to make the nav bar 'float' above the content
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  }
});