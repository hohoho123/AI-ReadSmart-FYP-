import api from './api';
import { Audio } from 'expo-av';

let soundObject = null;

export const voiceService = {
  // Text to Speech (Phase 14)
  async textToSpeech(text, voiceId = null) {
    const payload = { text };
    if (voiceId) payload.voice_id = voiceId;
    
    const response = await api.post('/voice/tts', payload);
    return { audioBase64: response.data.audio_data, voiceUsed: response.data.voice_name };
  },

  // Play audio
  async playAudio(base64Audio) {
    await this.stopAudio();
    soundObject = new Audio.Sound();
    await soundObject.loadAsync({ uri: `data:audio/mp3;base64,${base64Audio}` });
    await soundObject.playAsync();
    return soundObject;
  },

  async stopAudio() {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  },

  async pauseAudio() {
    if (soundObject) await soundObject.pauseAsync();
  },

  async resumeAudio() {
    if (soundObject) await soundObject.playAsync();
  },

  // Speech to Text
  async speechToText(audioBase64) {
    const response = await api.post('/voice/stt', { audio_data: audioBase64 });
    return { transcript: response.data.transcribed_text, confidence: response.data.confidence };
  },

  async getVoices() {
    const response = await api.get('/voice/voices');
    return response.data.voices;
  },
};