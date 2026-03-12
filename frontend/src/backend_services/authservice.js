import api from './api';
import { storage } from '../utils/storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
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
  auth = getAuth(app);
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
  async signup(email, password, displayName, fullName, phone, topics, ttsVoice) {
    // Call our newly updated backend route
    const response = await api.post('/auth/signup', {
      email: email,
      password: password,
      display_name: displayName,
      full_name: fullName,
      phone: phone,
      followed_topics: topics || [],
      tts_voice: ttsVoice || 'voice_a',
    });
    
    // Log them into Firebase on the frontend
    await signInWithEmailAndPassword(auth, email, password);
    await storage.saveUser(response.data.user);
    
    return { success: true, user: response.data.user };
  },

  // Login
  async login(email, password) {
    // 1. Log into Firebase and capture the credential instantly
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Extract the token immediately to prevent race conditions
    const token = await userCredential.user.getIdToken(true);

    // 3. Explicitly pass the token to your backend in the header
    const response = await api.get('/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
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