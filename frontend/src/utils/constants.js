// API Base URL - change to your computer's IP
export const API_BASE_URL = 'http://192.168.1.4:8000';

// Topics for profile setup
export const TOPIC_OPTIONS = [
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'health', label: 'Health' },
  { id: 'science', label: 'Science' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
];

// Voice options (matches backend)
export const VOICE_OPTIONS = [
  { id: 'voice_a', name: 'George', description: 'Warm, friendly male voice' },
  { id: 'voice_b', name: 'Sarah', description: 'Soft, natural female voice' },
  { id: 'voice_c', name: 'Daniel', description: 'Clear, authoritative male voice' },
];

export const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  error: '#FF3B30',
  success: '#34C759',
};