import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getFirebaseAuth } from './authservice';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-refresh token before each request
api.interceptors.request.use(
  async (config) => {
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      
      if (user) {
        // getIdToken(true) auto-refreshes if expired
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Token error:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message;
    console.log(`API Error [${status}]: ${message}`);
    return Promise.reject(error);
  }
);

export default api;