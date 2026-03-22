import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, TextInput, TouchableOpacity, Animated, PanResponder, Dimensions, Linking, StatusBar, Platform, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { storage } from '../../utils/storage';
import { newsService, conversationService, voiceService } from '../../backend_services';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Drawer peek height
const DRAWER_PEEK   = 65;
const DRAWER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.65);
// Distance the drawer travels between collapsed ↔ expanded
const DRAG_RANGE    = DRAWER_HEIGHT - DRAWER_PEEK;

// =========================================================
// HELPERS
// =========================================================
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Strip the "[+XXXX chars]" NewsAPI truncation marker
const cleanContent = (raw) =>
  raw ? raw.replace(/\s*\[\+\d+ chars\]$/, '').trim() : '';

// Remove markdown symbols for TTS
const stripMarkdownForTTS = (text) =>
  text
    .replace(/^[*\-#]+\s*/gm, '')   // remove leading * - # from lines
    .replace(/[*_`#]/g, '')           // remove inline markdown symbols
    .trim();

// Render AI bubble content with bullet formatting
const renderBubbleContent = (content, textStyle) => {
  const lines = content.split('\n').filter(l => l.trim() !== '');
  return lines.map((line, i) => {
    const isBullet = /^[*\-]\s+/.test(line.trim());
    const text = line.replace(/^[*\-]\s+/, '').trim();
    return (
      <Text
        key={i}
        style={[textStyle, isBullet ? { marginTop: i === 0 ? 0 : 10 } : { marginBottom: 2 }]}
      >
        {isBullet ? `\u2022  ${text}` : text}
      </Text>
    );
  });
};

// =========================================================
// ARTICLE DETAIL SCREEN
// =========================================================
export default function ArticleDetailScreen({ navigation, route }) {
  const article  = route.params?.article || {};
  const insets   = useSafeAreaInsets();

  const [userName, setUserName]       = useState('');
  const [isExpanded, setIsExpanded]    = useState(false);
  const [scrapedText, setScrapedText]  = useState(null);
  const [scrapeLoading, setScrapeLoading] = useState(true);
  const [scrapeError, setScrapeError]  = useState('');

// =========================================================
// Chat drawer state
// =========================================================
// chatMode: 'idle' | 'recording' | 'thinking' | 'speaking' | 'chat'
  const [chatMode, setChatMode]        = useState('idle');
  const [messages, setMessages]        = useState([]);  // { id, role, content, timestamp }
  const [inputText, setInputText]      = useState('');
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [isSaved, setIsSaved]          = useState(false);
  const [saveToast, setSaveToast]      = useState(false);
  const recordingRef  = useRef(null);
  const chatScrollRef = useRef(null);
  // Animated bars for waveform
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;
  // Keyboard height — used to push the footer up above the keyboard
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  useEffect(() => {
    storage.getUser().then((u) => {
      if (u?.display_name) setUserName(u.display_name);
    });
  }, []);

  // Stop audio on unmount
  useEffect(() => {
    return () => { voiceService.stopAudio(); };
  }, []);

  // Fetch full article text from backend scraper
  useEffect(() => {
    if (!article.url) {
      setScrapeLoading(false);
      return;
    }
    setScrapeLoading(true);
    setScrapeError('');
    newsService.scrapeArticle(article.url)
      .then((result) => {
        if (result.fullText) {
          setScrapedText(result.fullText);
        } else {
          setScrapeError(result.message || 'Publisher blocked the request.');
        }
      })
      .catch(() => {
        setScrapeError('Could not load full article. The publisher may block external requests.');
      })
      .finally(() => setScrapeLoading(false));
  }, [article.url]);

  // ── Waveform animation (runs during recording) ───────────────────────
  useEffect(() => {
    if (chatMode === 'recording') {
      const anims = waveAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 90),
            Animated.timing(anim, { toValue: 1,   duration: 280, useNativeDriver: true }),
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

  // ── Mic / STT ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: 'audio/wav', bitsPerSecond: 256000 },
      });
      recordingRef.current = recording;
      setChatMode('recording');
    } catch (e) {
      console.error('Recording start failed:', e);
    }
  };

  const confirmRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setChatMode('thinking');
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const { transcript } = await voiceService.speechToText(base64Audio);
      if (transcript && transcript.trim()) {
        await sendMessage(transcript.trim());
      } else {
        setChatMode(messages.length > 0 ? 'chat' : 'idle');
      }
    } catch (e) {
      console.error('STT failed:', e);
      setChatMode(messages.length > 0 ? 'chat' : 'idle');
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setChatMode(messages.length > 0 ? 'chat' : 'idle');
  };

  // ── Send message → AI → TTS ──────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      if (chatScrollRef.current) chatScrollRef.current.scrollToEnd({ animated: true });
      return updated;
    });
    setInputText('');
    setChatMode('thinking');

    const articleContext = scrapedText || body1 || body2 || '';
    const historySnapshot = [...messages, userMsg].slice(0, -1).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { response } = await conversationService.chat(
        text.trim(),
        article.url   || '',
        article.title || '',
        articleContext,
        historySnapshot
      );
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
      };
      setMessages(prev => {
        const updated = [...prev, aiMsg];
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        return updated;
      });
      setChatMode('speaking');
      try {
        const { audioBase64 } = await voiceService.textToSpeech(stripMarkdownForTTS(response.content));
        await voiceService.playAudio(audioBase64);
      } catch (ttsErr) {
        console.warn('TTS skipped:', ttsErr);
      }
      setChatMode('chat');
    } catch (e) {
      console.error('Chat failed:', e);
      setChatMode('chat');
    }
  }, [messages, scrapedText, article]);

  // ── Save conversation ────────────────────────────────────────────────
  const saveConversation = async () => {
    if (messages.length === 0) {
      Alert.alert('No Conversation', 'Have a conversation first before saving.');
      return;
    }
    if (isSaved) {
      Alert.alert('Already Saved', 'This conversation has already been bookmarked.');
      return;
    }
    try {
      await conversationService.save(
        article.url   || '',
        article.title || '',
        article.url   || '',
        messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
      );
      setIsSaved(true);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Save Failed', 'Could not save the conversation. Please try again.');
    }
  };

  // ── Derived article content ──────────────────────────────────────────
  const heroImage  = article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop';
  const body1      = article.description || '';
  const body2      = cleanContent(article.content);
  const hasContent = Boolean(body1 || body2);

  // ── Drawer animation ─────────────────────────────────────────────────
  // drawerTranslateY: 0 = fully expanded, DRAG_RANGE = fully collapsed
  const drawerTranslateY = useRef(new Animated.Value(DRAG_RANGE)).current;
  const isExpandedRef    = useRef(false);

  const expandDrawer = () => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(drawerTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const collapseDrawer = () => {
    isExpandedRef.current = false;
    setIsExpanded(false);
    voiceService.stopAudio();
    Animated.spring(drawerTranslateY, {
      toValue: DRAG_RANGE,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
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
        const expanding  = !isExpandedRef.current && g.dy < -40;
        const collapsing =  isExpandedRef.current && g.dy >  40;
        if (expanding)  expandDrawer();
        else if (collapsing) collapseDrawer();
        else {
          // Snap back to wherever it was before the gesture
          Animated.spring(drawerTranslateY, {
            toValue: isExpandedRef.current ? 0 : DRAG_RANGE,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── SCROLLABLE ARTICLE BODY ─────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: DRAWER_PEEK + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── HERO IMAGE ──────────────────────────────────────────── */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />

          {/* Back button — floating over the hero */}
          <TouchableOpacity
            style={[styles.backBtn, { top: (insets.top || 44) + 8 }]}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── ARTICLE CONTENT ─────────────────────────────────────── */}
        <View style={styles.contentPad}>

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            {article.time || article.publishedAt || ''}
          </Text>

          {/* Title */}
          <Text style={styles.title}>{article.title || 'Untitled'}</Text>

          {/* Source · Category */}
          {(article.source || article.category) ? (
            <Text style={styles.sourceLine}>
              {[article.source, article.category].filter(Boolean).join('  ·  ')}
            </Text>
          ) : null}

          <View style={styles.divider} />

          {/* ── FULL ARTICLE BODY (scraped) ──────────────────────── */}
          {scrapeLoading ? (
            <View style={styles.scrapeLoadingBox}>
              <ActivityIndicator size="small" color="#FF3B30" />
              <Text style={styles.scrapeLoadingText}>Loading full article…</Text>
            </View>
          ) : scrapedText ? (
            /* Render each scraped paragraph with a blank-line spacer between them.
               Format: <Text> … <Text>{'\n'}</Text> … <Text> */
            scrapedText
              .split(/\n{1,2}/)
              .map(p => p.trim())
              .filter(p => p.length > 0)
              .flatMap((para, i, arr) => {
                const isHeading = para.startsWith('## ');
                const el = (
                  <Text
                    key={`p-${i}`}
                    style={isHeading ? styles.bodyHeading : styles.bodyText}
                  >
                    {isHeading ? para.slice(3) : para}
                  </Text>
                );
                // Insert a blank-line spacer after every paragraph except the last
                if (i < arr.length - 1) {
                  return [el, <Text key={`s-${i}`}>{'\n'}</Text>];
                }
                return [el];
              })
          ) : (
            /* Scrape failed — fall back to NewsAPI snippet */
            <>
              {body1 ? <Text style={styles.bodyText}>{body1}</Text> : null}
              {body2 && body2 !== body1 ? <Text style={styles.bodyText}>{body2}</Text> : null}
              {!hasContent && (
                <Text style={styles.placeholderText}>No preview text available.</Text>
              )}
              {scrapeError ? (
                <View style={styles.limitationBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#6B7280" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.limitationText}>{scrapeError}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* Read full article link */}
          {article.url ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(article.url)}
              activeOpacity={0.7}
              style={styles.readMoreBtn}
            >
              <Text style={styles.readMoreText}>Read full article →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* ── AI CHAT DRAWER ──────────────────────────────────────────────────
          height = DRAWER_HEIGHT, sits at bottom=0.
          In collapsed state translateY = DRAG_RANGE, so only
          DRAWER_PEEK pixels are visible above the bottom edge.           ── */}
      {/* Outer wrapper — shifts up by kbHeight so drawer bottom sits above keyboard */}
      <Animated.View pointerEvents="box-none" style={{ position: 'absolute', bottom: kbHeight, left: 0, right: 0, height: Math.max(DRAWER_PEEK, DRAWER_HEIGHT - kbHeight) }}>
      <Animated.View
        style={[
          styles.drawer,
          {
            position: 'relative',
            height: Math.max(DRAWER_PEEK, DRAWER_HEIGHT - kbHeight),
            paddingBottom: kbHeight > 0 ? 0 : insets.bottom,
            transform: [{ translateY: drawerTranslateY }],
          },
        ]}
      >
        {/* ── DRAG HANDLE AREA (always tappable to toggle) ─────────── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => (isExpandedRef.current ? collapseDrawer() : expandDrawer())}
          style={styles.handleArea}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        {/* ── DRAWER CONTENT — hidden until user opens the drawer ────── */}
        {isExpanded && (
          <View style={styles.drawerBody}>
            {/* ── TOP BAR: bookmark icon + optional "Conversation Saved!" toast ── */}
            <View style={styles.drawerTopBar}>
              <View style={{ flex: 1 }} />
              {saveToast && (
                <View style={styles.saveToast}>
                  <Ionicons name="bookmark" size={14} color="#FF3B30" />
                  <Text style={styles.saveToastText}>Conversation Saved !</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.drawerBookmark}
                activeOpacity={0.7}
                onPress={saveConversation}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? '#FF3B30' : '#374151'}
                />
              </TouchableOpacity>
            </View>

            {/* ── MIDDLE: greeting card (idle/recording) OR chat history ── */}
            <View style={styles.drawerMiddle}>
              {chatMode === 'idle' && messages.length === 0 ? (
              <View style={styles.greetingCard}>
                <Text style={styles.greeting}>
                  {getGreeting()}{userName ? ` "${userName}"` : ''}
                </Text>
                {kbHeight === 0 && (
                  <Text style={styles.question}>
                    {'What would you like to know\nabout this article.'}
                  </Text>
                )}
              </View>
            ) : chatMode === 'recording' ? (
              <View style={styles.greetingCard}>
                <Text style={styles.greeting}>
                  {getGreeting()}{userName ? ` "${userName}"` : ''}
                </Text>
                {kbHeight === 0 && (
                  <Text style={styles.question}>
                    {'What would you like to know\nabout this article.'}
                  </Text>
                )}
                <View style={styles.waveformRow}>
                  {waveAnims.map((anim, i) => (
                    <Animated.View
                      key={i}
                      style={[styles.waveBar, { transform: [{ scaleY: anim }] }]}
                    />
                  ))}
                </View>
                <Text style={styles.transcribingLabel}>Transcribing....</Text>
              </View>
            ) : (
              /* chat / thinking / speaking */
              <FlatList
                ref={chatScrollRef}
                data={messages}
                keyExtractor={m => m.id}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                  <View style={[
                    styles.bubble,
                    item.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                  ]}>
                    {item.role === 'user' ? (
                      <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
                    ) : (
                      renderBubbleContent(item.content, [styles.bubbleText, styles.bubbleTextAI])
                    )}
                  </View>
                )}
                ListFooterComponent={
                  (chatMode === 'thinking' || chatMode === 'speaking') ? (
                    <View style={styles.thinkingRow}>
                      <ActivityIndicator size="small" color="#FF3B30" />
                      <Text style={styles.thinkingText}>
                        {chatMode === 'speaking' ? 'Speaking…' : 'Thinking…'}
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}

            </View>

            {/* ── FOOTER: changes by mode ── */}
            {chatMode === 'recording' ? (
              <View style={styles.drawerFooter}>
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
            ) : isKeyboardMode ? (
              <View style={styles.drawerFooter}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Send a message."
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => sendMessage(inputText)}
                    returnKeyType="send"
                    multiline={false}
                    editable={chatMode !== 'thinking' && chatMode !== 'speaking'}
                  />
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={() => sendMessage(inputText)}
                    disabled={!inputText.trim() || chatMode === 'thinking' || chatMode === 'speaking'}
                  >
                    <Ionicons name="arrow-forward" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.keyboardToggle} onPress={() => setIsKeyboardMode(false)}>
                  <Text style={styles.keyboardToggleText}>Switch to Voice</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  style={styles.micBtn}
                  activeOpacity={0.8}
                  onPress={startRecording}
                  disabled={chatMode === 'thinking' || chatMode === 'speaking'}
                >
                  <Ionicons name="mic" size={30} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.keyboardToggle} onPress={() => setIsKeyboardMode(true)}>
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

// ─────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Scroll ─────────────────────────────────────────────────────────
  scroll: { flex: 1 },

  // ── Hero ───────────────────────────────────────────────────────────
  heroWrapper: {
    width: '100%',
    height: 280,
    backgroundColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },

  // ── Article body ───────────────────────────────────────────────────
  contentPad: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 33,
    marginBottom: 10,
  },
  sourceLine: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 18,
  },
  bodyText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  bodyHeading: {
    fontSize: 18,
    color: '#111827',
    lineHeight: 26,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 18,
  },
  limitationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  limitationText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '400',
  },
  limitationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  limitationText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '400',
  },
  scrapeLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    justifyContent: 'center',
  },
  scrapeLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  readMoreBtn: {
    marginTop: 4,
    marginBottom: 8,
  },
  readMoreText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '700',
  },

  // ── AI Drawer ──────────────────────────────────────────────────────
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#dfe1e4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 20,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },

  // ── Drawer content ─────────────────────────────────────────────────
  drawerBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  drawerMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerHeader: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  drawerBookmark: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 12,
  },
  greetingCard: {
    width: '100%',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 20,
  },
  drawerFooter: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  keyboardToggle: {
    paddingVertical: 8,
  },
  keyboardToggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Top bar (bookmark + save toast) ────────────────────────────────
  drawerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    width: '100%',
  },
  saveToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  saveToastText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 4,
  },

  // ── Waveform (recording state) ──────────────────────────────────────
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 12,
    gap: 6,
  },
  waveBar: {
    width: 5,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#374151',
  },
  transcribingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // ── Recording confirm/cancel buttons ───────────────────────────────
  recordingControls: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  cancelBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Chat messages ───────────────────────────────────────────────────
  chatList: {
    flex: 1,
    width: '100%',
  },
  chatListContent: {
    paddingVertical: 8,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#111827',
    fontWeight: '400',
  },
  bubbleTextAI: {
    color: '#111827',
    fontWeight: '400',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  thinkingText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // ── Keyboard input row ──────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
