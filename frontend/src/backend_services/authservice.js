import api from './api';
import { storage } from '../utils/storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import from .env file
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

// ===========================================
// FIREBASE INITIALIZATION
// ===========================================
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Export for api.js to use
export function getFirebaseAuth() {
  return auth;
}

// ===========================================
// AUTH SERVICE
// ===========================================
export const authService = {
  // Signup
  async signup(email, password, displayName) {
    const response = await api.post('/auth/signup', {
      email,
      password,
      display_name: displayName,
    });
    
    await signInWithEmailAndPassword(auth, email, password);
    await storage.saveUser(response.data.user);
    
    return { success: true, user: response.data.user };
  },

  // Login
  async login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
    const response = await api.get('/auth/verify');
    await storage.saveUser(response.data.user);
    
    return { 
      success: true, 
      user: response.data.user,
      profileCompleted: response.data.user.profile_completed 
    };
  },

  // Logout
  async logout() {
    await signOut(auth);
    await storage.clearAll();
    return { success: true };
  },

  // Get current user from backend
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  // Check if logged in
  isLoggedIn() {
    return auth.currentUser !== null;
  },

  // Auth state listener (for App.js)
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  },
};