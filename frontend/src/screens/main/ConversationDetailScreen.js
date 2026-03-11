import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { conversationService, newsService, voiceService } from '../../backend_services';
import { InteractionManager } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_PEEK   = 65;
const DRAWER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45);
const DRAG_RANGE    = DRAWER_HEIGHT - DRAWER_PEEK;

// Strip markdown for TTS
const stripMarkdownForTTS = (text) =>
  text.replace(/^[*\-#]+\s*/gm, '').replace(/[*_`#]/g, '').trim();

// Render bullet-point-aware content
const renderBubbleContent = (content, textStyle) => {
  const lines = content.split('\n').filter(l => l.trim() !== '');
  return lines.map((line, i) => {
    const isBullet = /^[*\-]\s+/.test(line.trim());
    const text = line.replace(/^[*\-]\s+/, '').trim();
    // Detect "Latest Article: <url>" — render label + tappable link
    const latestMatch = text.match(/^(Latest Article:\s*)(.+)$/);
    if (latestMatch) {
      return (
        <Text key={i} style={[textStyle, { marginTop: 10 }]}>
          <Text style={{ fontWeight: '700' }}>{latestMatch[1]}</Text>
          <Text
            style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(latestMatch[2].trim())}
          >
            {latestMatch[2].trim()}
          </Text>
        </Text>
      );
    }
    return (
      <Text key={i} style={[textStyle, isBullet ? { marginTop: i === 0 ? 0 : 10 } : { marginBottom: 2 }]}>
        {isBullet ? `\u2022  ${text}` : text}
      </Text>
    );
  });
};

export default function ConversationDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { conversationId, articleTitle } = route.params || {};

  // ── Conversation state ─────────────────────────────────────────────
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // ── Drawer / input state ───────────────────────────────────────────
  const [isExpanded, setIsExpanded]         = useState(false);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [inputText, setInputText]           = useState('');
  const [chatMode, setChatMode]             = useState('idle'); // idle | recording | thinking | speaking | chat
  const [recapTapped, setRecapTapped]       = useState(false);
  const [originalScrapedText, setOriginalScrapedText] = useState('');
  const [showUrlInput, setShowUrlInput]     = useState(false);
  const [customUrl, setCustomUrl]           = useState('');

  const recordingRef  = useRef(null);
  const chatScrollRef = useRef(null);
  const inputRef      = useRef(null);
  const waveAnims     = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;

  // ── Keyboard height ────────────────────────────────────────────────
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 400);
    }
  }, [messages.length]);

  // Auto-expand drawer when keyboard opens
  useEffect(() => {
    if (kbHeight > 0 && !isExpandedRef.current) expandDrawer();
  }, [kbHeight]);

  // Stop audio on unmount
  useEffect(() => { return () => { voiceService.stopAudio(); }; }, []);

  // ── Load conversation ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const conv = await conversationService.getById(conversationId);
        setConversation(conv);
        setMessages(
          (conv.messages || []).map((m, i) => ({
            id: String(i),
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        );
        if (conv.messages && conv.messages.length > 0) setChatMode('chat');
      } catch (e) {
        console.error('Load conversation failed:', e);
        setError('Could not load this conversation.');
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId]);

  // ── Waveform animation ─────────────────────────────────────────────
  useEffect(() => {
    if (chatMode === 'recording') {
      const anims = waveAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 90),
            Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          ])
        )
      );
      anims.forEach(a => a.start());
      return () => anims.forEach(a => a.stop());
    } else {
      waveAnims.forEach(a => a.setValue(0.3));
    }
  }, [chatMode]);

  // ── Drawer animation ───────────────────────────────────────────────
  const drawerTranslateY = useRef(new Animated.Value(DRAG_RANGE)).current;
  const isExpandedRef    = useRef(false);

  const expandDrawer = () => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(drawerTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };
  const collapseDrawer = () => {
    isExpandedRef.current = false;
    setIsExpanded(false);
    voiceService.stopAudio();
    Animated.spring(drawerTranslateY, { toValue: DRAG_RANGE, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        const base    = isExpandedRef.current ? 0 : DRAG_RANGE;
        const clamped = Math.max(0, Math.min(DRAG_RANGE, base + g.dy));
        drawerTranslateY.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        if (!isExpandedRef.current && g.dy < -40)       expandDrawer();
        else if (isExpandedRef.current && g.dy > 40)    collapseDrawer();
        else Animated.spring(drawerTranslateY, { toValue: isExpandedRef.current ? 0 : DRAG_RANGE, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  ).current;

  // ── Mic / STT ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        android: { extension: '.wav', outputFormat: Audio.AndroidOutputFormat.DEFAULT, audioEncoder: Audio.AndroidAudioEncoder.DEFAULT, sampleRate: 16000, numberOfChannels: 1, bitRate: 256000 },
        ios: { extension: '.wav', outputFormat: Audio.IOSOutputFormat.LINEARPCM, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 16000, numberOfChannels: 1, bitRate: 256000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
        web: { mimeType: 'audio/wav', bitsPerSecond: 256000 },
      });
      recordingRef.current = recording;
      setChatMode('recording');
    } catch (e) { console.error('Recording start failed:', e); }
  };

  const confirmRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setChatMode('thinking');
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { transcript } = await voiceService.speechToText(base64Audio);
      if (transcript && transcript.trim()) await sendMessage(transcript.trim());
      else setChatMode(messages.length > 0 ? 'chat' : 'idle');
    } catch (e) {
      console.error('STT failed:', e);
      setChatMode(messages.length > 0 ? 'chat' : 'idle');
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) { await recordingRef.current.stopAndUnloadAsync(); recordingRef.current = null; }
    setChatMode(messages.length > 0 ? 'chat' : 'idle');
  };

  // ── Send message → AI chat (always uses original article context) ──
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setChatMode('thinking');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 400);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 800);

    try {
      const { response } = await conversationService.smartRecap(
        conversationId,
        text.trim(),
        null,                          // no new article — this is a regular follow-up
        originalScrapedText || null    // pass original article so Gemini has context
      );
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.content, timestamp: response.timestamp };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 500);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 1000);
      setChatMode('speaking');
      try {
        const { audioBase64 } = await voiceService.textToSpeech(stripMarkdownForTTS(response.content));
        await voiceService.playAudio(audioBase64);
      } catch (ttsErr) { console.warn('TTS skipped:', ttsErr); }
      setChatMode('chat');
    } catch (e) {
      console.error('Followup failed:', e);
      setChatMode('chat');
    }
  }, [conversationId, originalScrapedText, isKeyboardMode]);

  // ── Fetch original article + latest article for Smart Recap ─────────
  const fetchArticleTexts = async () => {
    let originalText = '';
    let latestText = null;
    let latestUrl = null;

    // 1. Re-scrape the saved original article URL
    const originalUrl = conversation?.article_url || '';
    if (originalUrl) {
      try {
        const { fullText } = await newsService.scrapeArticle(originalUrl);
        if (fullText && fullText.length > 100) originalText = fullText;
      } catch (e) { console.warn('Could not re-scrape original article:', e); }
    }

    // 2. Search for the latest article on the same topic
    const title = conversation?.article_title || articleTitle || '';
    const stopWords = new Set(['the','a','an','is','are','was','were','in','on','at','to','for','of','by','and','or','as','it','that','this','with','from','has','have','had','be','been','will','would','could','should','may','might','can','do','did','does','not','but','so','if','no','all','about','up','out','its','how','what','when','where','who','which','why']);
    const keywords = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
      .slice(0, 6)
      .join(' ');

    if (keywords) {
      try {
        const { articles } = await newsService.searchNews(keywords);
        // Exclude the original URL so we don't compare the article with itself
        const candidates = (articles || []).filter(a => a.url && a.url !== originalUrl);
        if (candidates.length > 0) {
          const topArticle = candidates[0];
          const { fullText } = await newsService.scrapeArticle(topArticle.url);
          if (fullText && fullText.length > 100) {
            latestText = fullText;
            latestUrl = topArticle.url;
          }
        }
      } catch (e) { console.warn('Could not fetch latest article:', e); }
    }

    return { originalText, latestText, latestUrl };
  };

  // ── Handle recap button tap ────────────────────────────────────────
  const handleRecapTap = async () => {
    if (recapTapped) return;
    setRecapTapped(true);

    const recapMsg = 'What are the latest updates on this article?';
    const userMsg = { id: Date.now().toString(), role: 'user', content: recapMsg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setChatMode('thinking');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);

    const { originalText, latestText, latestUrl } = await fetchArticleTexts();
    // Store original text so all follow-up chats have article context
    setOriginalScrapedText(originalText);

    if (!latestText) {
      // No latest article found — reply directly without a backend call
      const noNewsMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "There doesn't seem to be any newer articles on this topic right now. But I still have the original article loaded, so feel free to ask me anything about it — I'm happy to help!",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, noNewsMsg]);
      setChatMode('speaking');
      try {
        const { audioBase64 } = await voiceService.textToSpeech(stripMarkdownForTTS(noNewsMsg.content));
        await voiceService.playAudio(audioBase64);
      } catch (ttsErr) { console.warn('TTS skipped:', ttsErr); }
      setChatMode('chat');
      return;
    }

    // Latest article found — compare original vs latest via Gemini
    try {
      const { response } = await conversationService.smartRecap(conversationId, recapMsg, latestText, originalText, latestUrl);
      // response.content already includes "Latest Article: <url>" since backend appended + saved it
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.content, timestamp: response.timestamp };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 500);
      setChatMode('speaking');
      try {
        const { audioBase64 } = await voiceService.textToSpeech(stripMarkdownForTTS(response.content));
        await voiceService.playAudio(audioBase64);
      } catch (ttsErr) { console.warn('TTS skipped:', ttsErr); }
      setChatMode('chat');
    } catch (e) {
      console.error('Smart Recap failed:', e);
      setChatMode('chat');
    }
  };

  // ── Handle user-pasted URL for Smart Recap ─────────────────────────
  const handleCustomUrlRecap = async (url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setRecapTapped(true);
    setShowUrlInput(false);
    setCustomUrl('');

    const recapMsg = 'What are the latest updates on this article?';
    const userMsg = { id: Date.now().toString(), role: 'user', content: recapMsg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setChatMode('thinking');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);

    // Scrape original article
    let originalText = '';
    const originalUrl = conversation?.article_url || '';
    if (originalUrl) {
      try {
        const { fullText } = await newsService.scrapeArticle(originalUrl);
        if (fullText && fullText.length > 100) originalText = fullText;
      } catch (e) { console.warn('Could not re-scrape original:', e); }
    }
    setOriginalScrapedText(originalText);

    // Scrape user-provided URL
    let latestText = null;
    try {
      const { fullText } = await newsService.scrapeArticle(trimmedUrl);
      if (fullText && fullText.length > 100) latestText = fullText;
    } catch (e) { console.warn('Could not scrape custom URL:', e); }

    if (!latestText) {
      const failMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I wasn't able to read that article — the publisher may be blocking external access. Try a different URL.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, failMsg]);
      setChatMode('chat');
      return;
    }

    try {
      const { response } = await conversationService.smartRecap(conversationId, recapMsg, latestText, originalText, trimmedUrl);
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.content, timestamp: response.timestamp };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 500);
      setChatMode('speaking');
      try {
        const { audioBase64 } = await voiceService.textToSpeech(stripMarkdownForTTS(response.content));
        await voiceService.playAudio(audioBase64);
      } catch (ttsErr) { console.warn('TTS skipped:', ttsErr); }
      setChatMode('chat');
    } catch (e) {
      console.error('Custom URL Recap failed:', e);
      setChatMode('chat');
    }
  };

  const showRecapCard = !recapTapped && chatMode !== 'recording' && kbHeight === 0 && !showUrlInput;
  const drawerH = kbHeight > 0 ? Math.max(120, DRAWER_HEIGHT - kbHeight) : DRAWER_HEIGHT;

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top || 44 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}><ActivityIndicator size="large" color="#FF3B30" /></View>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.root, { paddingTop: insets.top || 44 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('ConversationHistory')}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top || (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24) }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── TOP BAR: back + bookmark ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('ConversationHistory')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Ionicons name="bookmark" size={22} color="#FF3B30" />
      </View>

      {/* ── ARTICLE CARD (pinned) ── */}
      <View style={styles.articleCard}>
        <View style={styles.articleCardInner}>
          <Text style={styles.articleCardTitle} numberOfLines={2}>
            {conversation?.article_title || articleTitle || 'Untitled Article'}
          </Text>
          {conversation?.article_url ? (
            <TouchableOpacity
              style={styles.articleCardUrlRow}
              onPress={() => Linking.openURL(conversation.article_url)}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={12} color="#3B82F6" />
              <Text style={styles.articleCardUrl} numberOfLines={1}>
                {(() => { try { return new URL(conversation.article_url).hostname.replace(/^www\./, ''); } catch { return conversation.article_url; } })()}
              </Text>
              <Ionicons name="open-outline" size={12} color="#3B82F6" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── CHAT MESSAGES (on screen, like phone GPT) ── */}
      <FlatList
        ref={chatScrollRef}
        data={messages}
        keyExtractor={m => m.id}
        style={styles.chatList}
        contentContainerStyle={[styles.chatListContent, { paddingBottom: kbHeight > 0 ? kbHeight + 100 : isExpanded ? DRAWER_HEIGHT + 30 : DRAWER_PEEK + 20 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
              {isUser ? (
                <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
              ) : (
                renderBubbleContent(item.content, [styles.bubbleText, styles.bubbleTextAI])
              )}
            </View>
          );
        }}
        ListFooterComponent={
          (chatMode === 'thinking' || chatMode === 'speaking') ? (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color="#FF3B30" />
              <Text style={styles.thinkingText}>{chatMode === 'speaking' ? 'Speaking\u2026' : 'Thinking\u2026'}</Text>
            </View>
          ) : null
        }
      />

      {/* ── DRAWER ── */}
      <Animated.View pointerEvents="box-none" style={{ position: 'absolute', bottom: kbHeight, left: 0, right: 0, height: Math.max(DRAWER_PEEK, drawerH) }}>
        <Animated.View style={[styles.drawer, { position: 'relative', height: Math.max(DRAWER_PEEK, drawerH), paddingBottom: kbHeight > 0 ? 0 : insets.bottom, transform: [{ translateY: drawerTranslateY }] }]}>

          {/* Handle */}
          <TouchableOpacity activeOpacity={1} onPress={() => (isExpandedRef.current ? collapseDrawer() : expandDrawer())} style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </TouchableOpacity>

          {(isExpanded || kbHeight > 0) && (
            <View style={styles.drawerBody}>

              {/* ── Recap card — centered, hidden once user interacts ── */}
              {showRecapCard ? (
                <View style={styles.recapCardWrapper}>
                  <TouchableOpacity
                    style={styles.recapCard}
                    activeOpacity={0.8}
                    onPress={handleRecapTap}
                  >
                    <Text style={styles.recapText}>Would you like to have{'\n'}a update on this article ?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pasteUrlToggle} onPress={() => setShowUrlInput(true)}>
                    <Text style={styles.pasteUrlToggleText}>Or paste your own article URL</Text>
                  </TouchableOpacity>
                </View>
              ) : kbHeight === 0 ? (
                <View style={{ flex: 1 }} />
              ) : null}

              {/* ── FOOTER: changes by mode ── */}
              {chatMode === 'recording' ? (
                <View style={styles.recordingWrapper}>
                  <View style={styles.recordingCenter}>
                    <View style={styles.waveformRow}>
                      {waveAnims.map((anim, i) => (
                        <Animated.View key={i} style={[styles.waveBar, { transform: [{ scaleY: anim }] }]} />
                      ))}
                    </View>
                    <Text style={styles.transcribingText}>Transcribing…</Text>
                  </View>
                  <View style={styles.recordingBottom}>
                    <View style={styles.recordingControls}>
                    <TouchableOpacity style={styles.confirmBtn} onPress={confirmRecording} activeOpacity={0.8}>
                      <Ionicons name="checkmark" size={26} color="#22C55E" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording} activeOpacity={0.8}>
                      <Ionicons name="close" size={26} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.keyboardToggle} onPress={() => { cancelRecording(); setIsKeyboardMode(true); }}>
                    <Text style={styles.keyboardToggleText}>Switch to Keyboard</Text>
                  </TouchableOpacity>
                  </View>
                </View>
              ) : showUrlInput ? (
                <View style={styles.drawerFooter}>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Paste article URL here..."
                      placeholderTextColor="#9CA3AF"
                      value={customUrl}
                      onChangeText={setCustomUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="go"
                      onSubmitEditing={() => handleCustomUrlRecap(customUrl)}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.sendBtn}
                      onPress={() => handleCustomUrlRecap(customUrl)}
                      disabled={!customUrl.trim()}
                    >
                      <Ionicons name="arrow-forward" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.keyboardToggle} onPress={() => { setShowUrlInput(false); setCustomUrl(''); }}>
                    <Text style={styles.keyboardToggleText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : isKeyboardMode ? (
                <View style={styles.drawerFooter}>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.textInput}
                      placeholder="Send a message."
                      placeholderTextColor="#9CA3AF"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => sendMessage(inputText)}
                      returnKeyType="send"
                      multiline={false}
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || chatMode === 'thinking' || chatMode === 'speaking'}>
                      <Ionicons name="arrow-forward" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.keyboardToggle} onPress={() => setIsKeyboardMode(false)}>
                    <Text style={styles.keyboardToggleText}>Switch to Voice</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.drawerFooter}>
                  <TouchableOpacity style={styles.micBtn} activeOpacity={0.8} onPress={startRecording} disabled={chatMode === 'thinking' || chatMode === 'speaking'}>
                    <Ionicons name="mic" size={30} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.keyboardToggle} onPress={() => { setIsKeyboardMode(true); }}>
                    <Text style={styles.keyboardToggleText}>Switch to Keyboard</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FF3B30', borderRadius: 20 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ── Top bar ────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  // ── Article card ───────────────────────────────────────────────────
  articleCard: {
    marginHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  articleCardInner: { gap: 4 },
  articleCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', lineHeight: 22 },
  articleCardUrlRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  articleCardUrl: { fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline', flex: 1 },

  // ── Chat messages (on screen) ──────────────────────────────────────
  chatList: { flex: 1 },
  chatListContent: { paddingHorizontal: 16, paddingTop: 8 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 4 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#FF3B30', borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF', fontWeight: '400' },
  bubbleTextAI: { color: '#111827', fontWeight: '400' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 8 },
  thinkingText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },

  // ── Drawer ─────────────────────────────────────────────────────────
  drawer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#dfe1e4',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 20,
  },
  handleArea: { alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#000000' },
  drawerBody: { flex: 1, paddingHorizontal: 24, paddingBottom: 0 },
  recapCardWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recordingWrapper: { flex: 1, justifyContent: 'space-between' },
  recordingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recordingBottom: { alignItems: 'center', paddingBottom: 8 },
  transcribingText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginBottom: 6, fontWeight: '500' },
  drawerFooter: { alignItems: 'center', paddingBottom: 8 },

  // ── Recap card ─────────────────────────────────────────────────────
  recapCard: {
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  recapCardTapped: { backgroundColor: '#FF3B30' },
  recapText: { fontSize: 16, fontWeight: '500', color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  pasteUrlToggle: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 8 },
  pasteUrlToggleText: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'underline', textAlign: 'center', fontWeight: '500' },

  // ── Voice / Input ──────────────────────────────────────────────────
  micBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 4,
    marginBottom: 14,
  },
  keyboardToggle: { paddingVertical: 8 },
  keyboardToggleText: { fontSize: 14, color: '#6B7280', fontWeight: '600', textDecorationLine: 'underline' },
  waveformRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 8, gap: 7 },
  waveBar: { width: 6, height: 40, borderRadius: 3, backgroundColor: '#374151' },
  recordingControls: { flexDirection: 'row', gap: 24, justifyContent: 'center', marginBottom: 8 },
  confirmBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  cancelBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  textInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
  sendBtn: { marginLeft: 8, padding: 4 },
  urlBubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%', backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  urlBubbleText: { flex: 1, fontSize: 12, color: '#3B82F6', textDecorationLine: 'underline' },
});
