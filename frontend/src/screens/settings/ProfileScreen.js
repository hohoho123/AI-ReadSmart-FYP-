import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../backend_services';
import BottomNavBar from '../../components/BottomNavBar';

const MENU_ITEMS = [
  { key: 'AccountDetails', icon: 'person-outline',        label: 'Account Details' },
  { key: 'Notification',   icon: 'notifications-outline', label: 'Notification' },
  { key: 'Security',       icon: 'lock-closed-outline',   label: 'Security' },
  { key: 'AudioControl',   icon: 'volume-medium-outline', label: 'Audio Control' },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              navigation.navigate('Login');
            } catch (e) {
              console.error('Logout error:', e);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top || 44 }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <Text style={styles.headerTitle}>Profile</Text>
      <View style={styles.divider} />

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={48} color="#9CA3AF" />
        </View>
        <Text style={styles.settingsLabel}>Settings</Text>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuRow}
            onPress={() => navigation.navigate(item.key)}
          >
            <Ionicons name={item.icon} size={22} color="#1F2937" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#1F2937" style={styles.menuIcon} />
          <Text style={styles.menuLabel}>Logout</Text>
        </TouchableOpacity>
      </View>

      <BottomNavBar activeTab="Profile" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: '#FF3B30',
    textAlign: 'center', paddingVertical: 12,
  },
  divider: { height: 2, backgroundColor: '#FF3B30', marginHorizontal: 20, borderRadius: 2,marginBottom: 16, },
  avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  settingsLabel: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  menu: { marginTop: 16, paddingHorizontal: 20 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  menuIcon: { marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, color: '#1F2937' },
});
