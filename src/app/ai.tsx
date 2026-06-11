import React, { useState } from 'react';
import { 
  View, TextInput, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, 
  Platform, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Speech from 'expo-speech';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
// getMockAIResponse kept for reference/fallback only (Step 17 uses store.sendAIQuery which tries Edge first)
import { Spacing } from '@/constants/theme';

export default function AIAssistant() {
  const { 
    chatMessages, addChatMessage, clearChat, user, isLoggedIn, 
    updateUserPrefs, addApproval, approvals, pendingApprovalsCount,
    selectedEquipment, notifications, addNotification, markNotificationsRead, unreadNotificationsCount,
    equipment,
    // Step 14 advanced AI
    addAIFeedback, generateChatSummary, resetAIPersonality, exportAIHistory,
    aiVoiceSettings, updateAIVoiceSettings, analyzeAndUpdatePersonality,
    // Step 17 Backend Hardening
    supabaseStatus, apiUsage, sendAIQuery, performWebSearch, recordAPICall
  } = useHVACStore();
  
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastAISuggestion, setLastAISuggestion] = useState<string | null>(null);

  const sendMessage = async (customQuery?: string) => {
    const query = customQuery || input.trim();
    if (!query) return;

    addChatMessage({ role: 'user', content: query });
    if (!customQuery) setInput('');

    // Trigger personality analysis after user input (Step 14 learning preserved)
    useHVACStore.getState().analyzeAndUpdatePersonality();

    // Step 17: Hardened AI path - try Supabase Edge (real LLM if secrets+deployed) with fallback to prior mock + personality
    // All previous features (prefix, summary, equipment context, walkthrough suggest, function call note) preserved inside sendAIQuery or post-process
    setTimeout(async () => {
      const { response: baseResponse, usedReal, functionCall } = await sendAIQuery(query);

      // Step 14: Inject current personality + explicit chat summary for deep adaptation (client-side still, Edge also does in real)
      const personality = user?.aiPrefs.personality || 'helpful HVAC expert';
      const summary = user?.aiPrefs.chatSummary || generateChatSummary() || '';
      const stylePrefix = `[Adapting to your style: ${personality}. Recent context summary: ${summary.substring(0, 150)}] `;
      let aiResponse = stylePrefix + baseResponse;

      // Enhance with selected equipment context if available (preserved)
      if (selectedEquipment && query.toLowerCase().includes('this unit')) {
        aiResponse = `${aiResponse}\n\nBased on the selected ${selectedEquipment.brand} ${selectedEquipment.model}: Electrical ${selectedEquipment.electrical.voltage} ${selectedEquipment.electrical.amps}A. Recommend checking submittal for exact specs.`;
      }

      // Suggest walkthrough if relevant (preserved)
      if (query.toLowerCase().includes('install') || query.toLowerCase().includes('repair') || query.toLowerCase().includes('diagnose')) {
        aiResponse += `\n\nWould you like me to generate a step-by-step walkthrough for this job based on the details? (Provide location and unit info for code-compliant steps, tools, PPE, etc.)`;
      }

      // Step 14/17: Explicit function call note (enhanced with real vs sim)
      if (functionCall || query.toLowerCase().includes('search') || query.toLowerCase().includes('web')) {
        const fnNote = usedReal ? '[Function call: search_web via Supabase Edge (real)]' : `[Explicit function call simulated: search_web("${query}")]`;
        aiResponse += `\n\n${fnNote}`;
      }

      // Step 17 indicator
      if (usedReal) {
        aiResponse += `\n\n[✅ Real backend via Supabase Edge Function]`;
      } else {
        aiResponse += `\n\n[⚠️ Simulation mode - add Supabase keys + deploy ai-chat Edge for real LLM]`;
      }

      addChatMessage({ role: 'ai', content: aiResponse });
      setLastAISuggestion(aiResponse);
      // Auto analyze after response (Step 14)
      useHVACStore.getState().analyzeAndUpdatePersonality();
    }, 800);  // slightly longer for potential network
  };

  const simulateInternetSearch = async () => {
    if (!input.trim()) {
      Alert.alert('Search', 'Type a query first (e.g. "latest specs for Trane XR14-048")');
      return;
    }

    setIsSearching(true);
    const searchQuery = input.trim();
    addChatMessage({ role: 'user', content: `🔍 Search internet: ${searchQuery}` });

    // Step 17: Use hardened performWebSearch (tries Supabase Edge search-web for real results via Serp/Brave/DDG, fallback to prior sim)
    try {
      const { results, sources, usedReal } = await performWebSearch(searchQuery, 'general');
      let foundInfo = results;
      if (sources && sources.length > 0 && usedReal) {
        foundInfo += `\n\nSources: ${sources.join(', ')}`;
      }
      foundInfo += `\n\nIs this information correct and useful? Would you like to submit it for admin approval to add to the shared database?`;

      if (usedReal) {
        foundInfo += `\n\n[✅ Real web search via Supabase Edge Function]`;
      } else {
        foundInfo += `\n\n[⚠️ Simulation - configure/deploy search-web Edge + search API key for live results]`;
      }

      addChatMessage({ role: 'ai', content: foundInfo });
      setLastAISuggestion(foundInfo);
    } catch (e) {
      // extreme fallback
      addChatMessage({ role: 'ai', content: `Search error, using simulation: ${searchQuery} - general HVAC best practices apply. Verify with manufacturer docs.` });
    } finally {
      setIsSearching(false);
      setInput('');
    }
  };

  const handleVerifyAndSubmit = (aiContent: string) => {
    if (!isLoggedIn) {
      Alert.alert('Sign in required', 'Please sign in via Profile to contribute data to the shared database.');
      return;
    }

    // Basic dupe check simulation (Step 7)
    const isDuplicate = equipment.some(eq => 
      aiContent.toLowerCase().includes(eq.model.toLowerCase()) || 
      aiContent.toLowerCase().includes(eq.brand.toLowerCase())
    );

    if (isDuplicate) {
      Alert.alert('Possible Duplicate', 'This info seems similar to existing database entries. Submitting anyway for admin review?');
    }

    // Create structured approval (Step 13: now includes timestamp + suggestedData stub for rich diff/insert)
    const newApproval = {
      id: 'ap' + Date.now(),
      suggestedBy: user?.name || 'User',
      dataType: 'Equipment' as const,
      summary: 'AI + Internet search suggestion: ' + aiContent.substring(0, 100) + '...',
      details: aiContent,
      suggestedData: null, // populated in real flows; AI responses can be parsed later
      status: 'pending' as const,
      timestamp: new Date().toISOString(),
    };

    addApproval(newApproval);
    addNotification('New AI suggestion submitted for approval', 'approval');
    
    Alert.alert(
      'Submitted for Approval', 
      'Thank you! This information has been sent to lower and master admins for review.\n\nOnce approved, it will be added to the shared public database for all HVAC technicians. You will receive a notification.',
      [{ text: 'OK' }]
    );

    addChatMessage({ 
      role: 'ai', 
      content: '✅ Thanks! I have submitted this for admin approval. It will become available to the entire community once approved. You can check status in your Profile under Admin Approvals.' 
    });
    setLastAISuggestion(null);
  };

  const speakResponse = (content: string) => {
    const settings = useHVACStore.getState().aiVoiceSettings || { rate: 0.9, pitch: 1.0 };
    if (Platform.OS === 'web') {
      // Web fallback using browser TTS (Step 14: respects voice settings)
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = settings.rate || 0.9;
      utterance.pitch = settings.pitch || 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      Speech.speak(content, {
        rate: settings.rate || 0.9,
        pitch: settings.pitch || 1.0,
        onDone: () => console.log('TTS finished'),
      });
    }
  };

  // Basic STT using Web Speech API (web) or mock (native)
  const startVoiceInput = () => {
    if (Platform.OS === 'web' && 'SpeechRecognition' in window) {
      const recognition = new (window as any).SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // Auto-send after transcription
        setTimeout(() => sendMessage(transcript), 300);
      };

      recognition.onerror = (event: any) => {
        Alert.alert('Voice Error', 'Speech recognition failed. Try typing instead.');
      };

      recognition.start();
      Alert.alert('Listening...', 'Speak now. Transcription will auto-send.');
    } else {
      // Native or unsupported: demo mode
      Alert.alert(
        'Voice Input (Step 6 Demo)',
        'On native devices, this would use @react-native-voice/voice or expo-speech-recognition for real STT.\n\nFor now, a sample query has been entered.',
        [{ text: 'OK', onPress: () => {
          setInput('Tell me about voltage drop for a 4 ton unit');
          sendMessage('Tell me about voltage drop for a 4 ton unit');
        }}]
      );
    }
  };

  const sendPersonalityCommand = (command: string) => {
    if (!isLoggedIn) {
      Alert.alert('Sign in', 'Sign in to customize AI personality.');
      return;
    }
    addChatMessage({ role: 'user', content: command });
    // Simulate AI acknowledging and updating
    setTimeout(() => {
      addChatMessage({ role: 'ai', content: `Understood. I'll adjust my responses going forward. (Personality updated in your profile.)` });
      // Simple update based on command
      if (command.toLowerCase().includes('casual') || command.toLowerCase().includes('friendly')) {
        updateUserPrefs({ personality: 'casual, friendly mentor who uses everyday language' });
      } else if (command.toLowerCase().includes('concise') || command.toLowerCase().includes('technical')) {
        updateUserPrefs({ personality: 'concise technical expert who gets straight to specs and diagnostics' });
      }
    }, 500);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <ThemedText type="title">AI Assistant</ThemedText>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 9, color: supabaseStatus === 'configured' ? '#34C759' : '#FF9500', marginRight: 4 }}>
              {supabaseStatus === 'configured' ? '🟢 Real Edge' : '🟡 Sim'}
            </ThemedText>
            <Pressable onPress={() => {
              markNotificationsRead();
              Alert.alert('Notifications', notifications.length > 0 
                ? notifications.map(n => n.message).join('\n') 
                : 'No new notifications. Approvals will appear here.');
            }}>
              <View style={{ position: 'relative' }}>
                <SymbolView name="bell" size={22} />
                {unreadNotificationsCount > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#E74C3C', borderRadius: 8, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ color: 'white', fontSize: 10 }}>{unreadNotificationsCount}</ThemedText>
                  </View>
                )}
              </View>
            </Pressable>
            <Pressable onPress={() => setShowPrefs(!showPrefs)}>
              <SymbolView name="gearshape" size={22} />
            </Pressable>
            <Pressable onPress={clearChat}>
              <ThemedText style={{ color: '#208AEF' }}>Clear</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Personality / Prefs Panel (enhanced) */}
        {showPrefs && (
          <ThemedView style={styles.prefsPanel}>
            <ThemedText type="defaultSemiBold">AI Personality &amp; Learning (Step 14: Deep Polish - Summaries, Feedback, Control Panel, Explicit Search, Voice, Multi-turn)</ThemedText>
            <ThemedText type="small" style={{ marginVertical: 4 }}>
              Explicit chat summaries stored for dynamic prompts. Feedback ("helpful?") auto-adapts. Full reset/export. Voice controls. Better "search web" function call simulation. Multi-turn context in responses.
            </ThemedText>
            {user && (
              <>
                <ThemedText>Current Style: "{user.aiPrefs.personality}"</ThemedText>
                <ThemedText type="small" style={{ marginTop: 2, opacity: 0.7 }}>Chat Summary (Step 14 deep learning): {user.aiPrefs.chatSummary?.substring(0, 90) || 'Building from your interactions...'}...</ThemedText>
                <TextInput 
                  style={styles.prefInput}
                  value={user.aiPrefs.personality}
                  onChangeText={(text) => updateUserPrefs({ personality: text })}
                  placeholder="E.g. concise technical mentor, friendly apprentice guide..."
                />
                <Pressable 
                  style={styles.toggleBtn}
                  onPress={() => updateUserPrefs({ learningEnabled: !user.aiPrefs.learningEnabled })}
                >
                  <ThemedText>Learning: {user.aiPrefs.learningEnabled ? 'ON (adapts to you)' : 'OFF (static)'}</ThemedText>
                </Pressable>
                <ThemedText type="small" style={{ marginTop: 4 }}>
                  Quick commands: 
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <Pressable style={styles.cmdBtn} onPress={() => sendPersonalityCommand('Talk more casually and friendly')}><ThemedText style={{ fontSize: 12 }}>Casual mentor</ThemedText></Pressable>
                  <Pressable style={styles.cmdBtn} onPress={() => sendPersonalityCommand('Be more concise and technical')}><ThemedText style={{ fontSize: 12 }}>Concise tech</ThemedText></Pressable>
                  <Pressable style={styles.cmdBtn} onPress={() => sendPersonalityCommand('Explain like I\'m an apprentice')}><ThemedText style={{ fontSize: 12 }}>Apprentice friendly</ThemedText></Pressable>
                </View>
              </>
            )}
            {!isLoggedIn && <ThemedText type="small">Sign in to save and customize your AI personality permanently.</ThemedText>}
            
            {/* Step 17: Backend + Costs indicator inside prefs */}
            <ThemedText type="small" style={{ marginTop: 8, opacity: 0.8 }}>
              Backend: {supabaseStatus === 'configured' ? 'Supabase + Edge Functions (real AI/search when secrets deployed)' : 'Simulation (add .env keys + deploy supabase/functions/ for real)'}
            </ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>
              API Usage (Step 17): {apiUsage.aiCalls} AI calls, {apiUsage.searchCalls} searches • Est. cost ${apiUsage.estimatedCostUSD} (demo; real in provider dashboards)
            </ThemedText>
          </ThemedView>
        )}

        {/* Chat Messages */}
        <FlatList
          data={chatMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          renderItem={({ item }) => (
            <View style={[styles.message, item.role === 'user' ? styles.userMsg : styles.aiMsg]}>
              <ThemedText style={item.role === 'user' ? styles.userText : styles.aiText}>
                {item.content}
              </ThemedText>
              {item.role === 'ai' && item.content.toLowerCase().includes('correct') && (
                <Pressable 
                  style={styles.verifyBtn}
                  onPress={() => handleVerifyAndSubmit(item.content)}
                >
                  <ThemedText style={{ color: 'white', fontSize: 12 }}>✓ Verify &amp; Submit to Shared DB (Admin Approval)</ThemedText>
                </Pressable>
              )}
              {item.role === 'ai' && lastAISuggestion === item.content && (
                <Pressable 
                  style={[styles.verifyBtn, { backgroundColor: '#34C759' }]}
                  onPress={() => handleVerifyAndSubmit(item.content)}
                >
                  <ThemedText style={{ color: 'white', fontSize: 12 }}>Submit this search result for approval</ThemedText>
                </Pressable>
              )}
              {item.role === 'ai' && (
                <Pressable style={{ marginTop: 4 }} onPress={() => speakResponse(item.content)}>
                  <ThemedText style={{ color: '#208AEF', fontSize: 12 }}>🔊 Read Aloud (voice demo - Step 6, rate/pitch in prefs)</ThemedText>
                </Pressable>
              )}
              {/* Step 14: User feedback for deep learning + auto-adapt */}
              {item.role === 'ai' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <Pressable onPress={() => { addAIFeedback('Helpful - good response', 5); analyzeAndUpdatePersonality(); }} style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <ThemedText style={{ fontSize: 11, color: '#2E7D32' }}>👍 Helpful</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => { addAIFeedback('Not helpful - too vague or long', 2); analyzeAndUpdatePersonality(); }} style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <ThemedText style={{ fontSize: 11, color: '#C62828' }}>👎 Not helpful</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => { addAIFeedback('Good personality/style match', 4); analyzeAndUpdatePersonality(); }} style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <ThemedText style={{ fontSize: 11, color: '#1565C0' }}>Style OK</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => { addAIFeedback('Adjust: more detail please', 3); analyzeAndUpdatePersonality(); }} style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <ThemedText style={{ fontSize: 11, color: '#E65100' }}>More detail?</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            isSearching ? (
              <View style={{ alignItems: 'center', padding: 10 }}>
                <ActivityIndicator />
                <ThemedText type="small">Searching internet for latest info...</ThemedText>
              </View>
            ) : (
              <ThemedText type="small" style={{ textAlign: 'center', opacity: 0.5, marginVertical: 10 }}>
                {isVoiceMode ? 'Voice mode active (mic for STT, speaker for TTS)' : 'Type your HVAC question or tap mic for voice. Use 🔍 for internet search.'}
              </ThemedText>
            )
          }
        />

        {/* Input Bar with Search */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inputBar}>
            <Pressable 
              style={styles.micBtn} 
              onPress={() => {
                setIsVoiceMode(!isVoiceMode);
                if (!isVoiceMode) {
                  startVoiceInput();
                }
              }}
            >
              <SymbolView name={isVoiceMode ? "mic.fill" : "mic"} size={22} tintColor={isVoiceMode ? "#34C759" : "#666"} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about equipment, codes, diagnostics... or 'search internet for...'"
              placeholderTextColor="#888"
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
            />
            <Pressable style={styles.searchBtn} onPress={simulateInternetSearch} disabled={isSearching}>
              <ThemedText style={{ color: 'white', fontSize: 12 }}>🔍 Search</ThemedText>
            </Pressable>
            <Pressable style={styles.sendBtn} onPress={() => sendMessage()}>
              <ThemedText style={{ color: 'white' }}>Send</ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" style={{ textAlign: 'center', paddingBottom: 8, opacity: 0.6 }}>
            AI checks DB first. Use 🔍 Search for internet info not in the app. Verify new data before admin review.
          </ThemedText>
        </KeyboardAvoidingView>

        {/* Pending Approvals Teaser */}
        {pendingApprovalsCount > 0 && (
          <ThemedView style={styles.approvalBanner}>
            <ThemedText type="small">📋 {pendingApprovalsCount} item(s) pending admin approval (view in Profile)</ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four, paddingBottom: Spacing.two },
  prefsPanel: { backgroundColor: '#F0F8FF', margin: Spacing.four, padding: Spacing.three, borderRadius: 10 },
  prefInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 6 },
  toggleBtn: { backgroundColor: '#E6F4FE', padding: 8, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  cmdBtn: { backgroundColor: '#E8E8EC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  chatList: { padding: Spacing.four, paddingBottom: 20 },
  message: { marginBottom: Spacing.three, maxWidth: '85%', padding: Spacing.three, borderRadius: 16 },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#208AEF' },
  aiMsg: { alignSelf: 'flex-start', backgroundColor: '#F0F0F3' },
  userText: { color: 'white' },
  aiText: { color: '#000' },
  verifyBtn: { backgroundColor: '#34C759', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' },
  inputBar: { flexDirection: 'row', padding: Spacing.three, backgroundColor: '#F8F9FA', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  micBtn: { padding: 8, marginRight: 4 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  searchBtn: { backgroundColor: '#34C759', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, marginLeft: 4 },
  sendBtn: { backgroundColor: '#208AEF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginLeft: 4 },
  approvalBanner: { backgroundColor: '#FFF3CD', padding: 8, margin: Spacing.two, borderRadius: 6 },
});
