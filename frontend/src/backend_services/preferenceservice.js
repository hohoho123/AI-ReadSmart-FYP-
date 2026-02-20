import api from './api';
import { storage } from '../utils/storage';

export const preferencesService = {
  // Profile setup (Phase 4)
  async setupProfile(followedTopics, ttsVoice, playbackSpeed = "1.0x") {
    const response = await api.post('/preferences/setup', {
      followed_topics: followedTopics,
      tts_voice: ttsVoice,
      playback_speed: String(playbackSpeed),
    });
    await storage.savePreferences(response.data.preferences);
    return { success: true, preferences: response.data.preferences };
  },

  // Get preferences
  async getPreferences() {
    const response = await api.get('/preferences/');
    if (response.data.preferences) {
      await storage.savePreferences(response.data.preferences);
    }
    return response.data.preferences;
  },

  // Update preferences
  async updatePreferences(updates) {
    const payload = {};
    if (updates.followedTopics) payload.followed_topics = updates.followedTopics;
    if (updates.ttsVoice) payload.tts_voice = updates.ttsVoice;
    if (updates.playbackSpeed) payload.playback_speed = updates.playbackSpeed;
    if (updates.ttsEnabled !== undefined) payload.tts_enabled = updates.ttsEnabled;
    if (updates.sttEnabled !== undefined) payload.stt_enabled = updates.sttEnabled;

    const response = await api.put('/preferences/update', payload);
    await storage.savePreferences(response.data.preferences);
    return { success: true, preferences: response.data.preferences };
  },

  async addTopic(topic) {
    const response = await api.post(`/preferences/follow-topic?topic=${topic}`);
    return { success: true, topics: response.data.followed_topics };
  },

  async removeTopic(topic) {
    const response = await api.post(`/preferences/unfollow-topic?topic=${topic}`);
    return { success: true, topics: response.data.followed_topics };
  },
};