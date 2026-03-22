import api from './api';
import { Audio } from 'expo-av';

let soundObject = null;
let currentVolume = 1.0;   // 0.0 – 1.0, persists across TTS calls

export const voiceService = {
  // Convert text to speech audio
  async textToSpeech(text, voiceId = null) {
    const payload = { text };
    if (voiceId) payload.voice_id = voiceId;
    
    const response = await api.post('/voice/tts', payload);
    return { audioBase64: response.data.audio_data, voiceUsed: response.data.voice_name };
  },

  // Play audio — applies current volume automatically
  async playAudio(base64Audio) {
    await this.stopAudio();
    // Switch audio session to speaker/playback mode (undoes recording mode)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    soundObject = new Audio.Sound();
    await soundObject.loadAsync({ uri: `data:audio/mp3;base64,${base64Audio}` });
    await soundObject.setVolumeAsync(currentVolume);
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

  // ── Volume control ────────────────────────────────────────────────────
  // value: 0.0 (mute) → 1.0 (max)
  async setVolume(value) {
    const clamped = Math.max(0.0, Math.min(1.0, value));
    currentVolume = clamped;
    if (soundObject) await soundObject.setVolumeAsync(clamped);
    return clamped;
  },

  async volumeUp(step = 0.1) {
    return this.setVolume(currentVolume + step);
  },

  async volumeDown(step = 0.1) {
    return this.setVolume(currentVolume - step);
  },

  getVolume() {
    return currentVolume;
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