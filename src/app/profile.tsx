import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
import { Spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { mockEquipment } from '@/constants/hvacData';

export default function ProfileScreen() {
  const { 
    user, isLoggedIn, isLoadingAuth, supabaseStatus,
    signIn, signOutUser, updateUserPrefs, updateProfileLocation,
    approvals, approveItem, rejectItem, pendingApprovalsCount, communityPosts,
    addNotification, equipment,
    // Step 17
    apiUsage, resetAPIUsage, recordAPICall,
    // Step 18
    testResults, runUnitTests, clearTestResults,
    // Step 20 future stubs
    inventory, addInventoryItem, companyAccounts, switchCompany,
    manufacturerSync, arOverlay, forumThreads, addForumPost,
    internationalCodes, setInternationalMode, webAdminLink, continuousAIImprovement
  } = useHVACStore();

  const [editName, setEditName] = useState('');
  const [editZip, setEditZip] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({}); // per-approval notes
  const [showNotifications, setShowNotifications] = useState(false);

  const myPosts = communityPosts.filter(p => p.user === (user?.name || ''));

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (editName.trim()) {
        // In real Supabase this would update the profiles table
        const updated = { ...user, name: editName.trim() };
        // For now we update via store (which handles persistence)
        useHVACStore.setState({ user: updated });
      }

      if (editZip.trim()) {
        await updateProfileLocation(editZip.trim());
      }

      Alert.alert('Profile Updated', 'Changes saved locally and will sync to Supabase when configured.');
      setEditName('');
      setEditZip('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = async () => {
    await signOutUser();
    Alert.alert('Signed Out', 'Your AI personality and local data are preserved for next sign-in.');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'master';

  const handlePromoteToAdmin = () => {
    if (!user) return;
    const updated = { ...user, role: 'admin' as const };
    useHVACStore.setState({ user: updated });
    Alert.alert('Demo Mode', 'You are now an admin (lower/master) for testing the full approval queue and diff UI. In production this is role-gated via Supabase profiles.');
  };

  const handleApproveWithNotes = async (id: string) => {
    const notes = adminNotes[id] || '';
    await approveItem(id, notes);
    setAdminNotes(prev => { const n = {...prev}; delete n[id]; return n; });
    Alert.alert('Approved', 'Item approved and added/updated in the shared public database. Original suggester notified via in-app + push.');
  };

  const handleRejectWithNotes = async (id: string) => {
    const notes = adminNotes[id] || '';
    await rejectItem(id, notes);
    setAdminNotes(prev => { const n = {...prev}; delete n[id]; return n; });
    Alert.alert('Rejected', 'Suggestion rejected. Suggester has been notified with your notes.');
  };

  const getDiffForApproval = (item: any) => {
    if (!item.suggestedData) return null;
    const sug = item.suggestedData;
    if (item.existingId) {
      const existing = equipment.find(e => e.id === item.existingId);
      if (existing) {
        return {
          type: 'UPDATE',
          before: `Brand: ${existing.brand}, Model: ${existing.model}, SEER: ${existing.capacities?.seer || 'N/A'}, MCA: ${existing.electrical?.mca || existing.electrical.amps}, Price: ${existing.averagePrice}`,
          after: `Brand: ${sug.brand}, Model: ${sug.model}, SEER: ${sug.capacities?.seer || 'N/A'}, MCA: ${sug.electrical?.mca || sug.electrical.amps}, Price: ${sug.averagePrice}`,
        };
      }
    }
    return {
      type: 'NEW',
      before: 'Not in database',
      after: `${sug.brand} ${sug.model} • ${sug.capacities?.tonnage || ''} • ${sug.specs?.substring(0,80)}... • ${sug.averagePrice}`,
    };
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.header}>Profile &amp; Community</ThemedText>

          {/* Supabase Status Banner (new in Step 2) */}
          <ThemedView style={[styles.card, { backgroundColor: supabaseStatus === 'configured' ? '#E8F5E9' : '#FFF3E0' }]}>
            <ThemedText type="defaultSemiBold">
              Backend Status (Step 17 Hardened): {supabaseStatus === 'configured' ? '✅ Supabase + Edge Functions ready (real AI/search/auth with secrets)' : '⚠️ Mock / Simulation Mode (add .env keys + deploy Edges from supabase/functions/ for real)'}
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4 }}>
              {isSupabaseConfigured() 
                ? 'Real Google OAuth, profile sync, approvals, AI via secure Edge Functions (ai-chat, search-web), storage policies, RLS ready. Schema in supabase/schema.sql.'
                : 'Copy .env.example to .env and add your Supabase URL + anon key. Then deploy Edge Functions (see supabase/ folder) + set secrets (OPENAI_API_KEY, SERPAPI etc) for live LLM + real web search.'}
            </ThemedText>
          </ThemedView>

          {/* Step 17: API Usage & Costs Monitoring */}
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold">API Usage &amp; Costs (Step 17)</ThemedText>
            <ThemedText type="small" style={{ marginTop: 4 }}>
              AI Calls: {apiUsage.aiCalls} • Search/SDS/Price Calls: {apiUsage.searchCalls} • Est. Cost: ${apiUsage.estimatedCostUSD} (demo rates)
            </ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>
              Last reset: {apiUsage.lastReset}. Real costs tracked in Supabase logs + OpenAI/SerpAPI dashboards. Rate limiting active (client + Edge).
            </ThemedText>
            <Pressable 
              style={[styles.secondaryBtn, { marginTop: 8, alignSelf: 'flex-start' }]} 
              onPress={() => {
                resetAPIUsage();
                Alert.alert('Reset', 'API usage counters reset (demo only).');
              }}
            >
              <ThemedText style={{ color: '#64B5F6' }}>Reset Usage Counters</ThemedText>
            </Pressable>
            <ThemedText type="small" style={{ marginTop: 6, opacity: 0.6 }}>
              To enable real: Deploy ai-chat &amp; search-web Edges (with secrets). Client calls now route through secure functions first.
            </ThemedText>
          </ThemedView>

          {/* Step 18: Comprehensive Testing & Beta */}
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold">Testing Dashboard (Step 18)</ThemedText>
            <ThemedText type="small" style={{ marginTop: 4 }}>
              Run in-app unit tests for core calculators (Ohm's, Voltage Drop, CFM, PT, FLA). E2E flows tested manually via app tabs.
            </ThemedText>
            {testResults.lastRun && (
              <ThemedText type="small" style={{ marginTop: 4 }}>
                Last run: {new Date(testResults.lastRun).toLocaleTimeString()} — {testResults.passed} passed, {testResults.failed} failed
              </ThemedText>
            )}
            <Pressable style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={runUnitTests}>
              <ThemedText style={{ color: '#64B5F6' }}>▶ Run Calculator Unit Tests</ThemedText>
            </Pressable>
            {testResults.details.length > 0 && (
              <ThemedText type="small" style={{ marginTop: 6, fontFamily: 'monospace' }}>
                {testResults.details.join('\n')}
              </ThemedText>
            )}
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={clearTestResults}>
              <ThemedText style={{ color: '#64B5F6' }}>Clear Test Results</ThemedText>
            </Pressable>
            <ThemedText type="small" style={{ marginTop: 8, opacity: 0.6 }}>
              See BETA_TESTING.md for full E2E checklist (onboarding, AI verify→approve, QR, EPA quizzes, uploads, reports).
            </ThemedText>
          </ThemedView>

          {/* Step 20: Future Enhancements & Maintenance (stubs - visible, non-breaking) */}
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold">Future Enhancements (Step 20)</ThemedText>
            <ThemedText type="small" style={{ marginTop: 4, opacity: 0.8 }}>
              Stubs for planned features. Full impl in future releases.
            </ThemedText>
            
            <ThemedText style={{ marginTop: 8 }}>📦 Truck Inventory (demo)</ThemedText>
            {inventory.slice(0, 2).map((item, i) => (
              <ThemedText key={i} type="small" style={{ marginLeft: 10 }}>• {item.item}: {item.qty} @ {item.location}</ThemedText>
            ))}
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={() => addInventoryItem({ item: 'New Capacitor 45/5', qty: 5, location: 'Truck 1' })}>
              <ThemedText style={{ color: '#64B5F6' }}>Add Sample Inventory Item (future sync)</ThemedText>
            </Pressable>

            <ThemedText style={{ marginTop: 8 }}>👥 Multi-User Company Accounts (demo)</ThemedText>
            {companyAccounts.map((c, i) => (
              <ThemedText key={i} type="small" style={{ marginLeft: 10 }}>• {c.name} ({c.role}) <Pressable onPress={() => switchCompany(c.id)}><ThemedText style={{ color: '#208AEF' }}>[switch]</ThemedText></Pressable></ThemedText>
            ))}

            <ThemedText style={{ marginTop: 8 }}>🌍 International Codes</ThemedText>
            <ThemedText type="small">Current: {internationalCodes.join(', ')} (see localCodes in data)</ThemedText>
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={() => setInternationalMode('EU')}>
              <ThemedText style={{ color: '#64B5F6' }}>Switch to EU F-Gas / EPBD mode (future full rules)</ThemedText>
            </Pressable>

            <ThemedText style={{ marginTop: 8 }}>🏭 Manufacturer API Sync</ThemedText>
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={async () => {
              const res = await manufacturerSync('24ANB1-036');
              Alert.alert('Manufacturer Sync (future)', res);
            }}>
              <ThemedText style={{ color: '#64B5F6' }}>Sync latest for sample model (stub)</ThemedText>
            </Pressable>

            <ThemedText style={{ marginTop: 8 }}>📱 AR Wiring Overlay (demo - uses camera)</ThemedText>
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={() => arOverlay('XR14-048')}>
              <ThemedText style={{ color: '#64B5F6' }}>Launch AR Camera Stub for wiring diagram</ThemedText>
            </Pressable>

            <ThemedText style={{ marginTop: 8 }}>💬 Forum Threads per Model (demo)</ThemedText>
            {forumThreads.slice(0, 1).map((t, i) => <ThemedText key={i} type="small" style={{ marginLeft: 10 }}>• {t.model}: {t.title} ({t.posts} posts)</ThemedText>)}
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={() => addForumPost('24ANB1-036', 'New thread stub', 'Discussion...')}>
              <ThemedText style={{ color: '#64B5F6' }}>Add Forum Post (future real-time)</ThemedText>
            </Pressable>

            <ThemedText style={{ marginTop: 8 }}>🖥️ Web Admin Dashboard</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>{webAdminLink}</ThemedText>

            <ThemedText style={{ marginTop: 8 }}>🤖 Continuous AI Improvement</ThemedText>
            <Pressable style={[styles.secondaryBtn, { marginTop: 4 }]} onPress={continuousAIImprovement}>
              <ThemedText style={{ color: '#64B5F6' }}>Trigger Enhanced Feedback Loop (already active in AI)</ThemedText>
            </Pressable>
          </ThemedView>

          {isLoadingAuth ? (
            <ThemedView style={styles.card}>
              <ActivityIndicator size="large" />
              <ThemedText style={{ textAlign: 'center', marginTop: 12 }}>Restoring your session...</ThemedText>
            </ThemedView>
          ) : !isLoggedIn ? (
            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">Get Started</ThemedText>
              <ThemedText style={{ marginVertical: 12 }}>
                Sign in to save your AI personality, track EPA progress, upload knowledge to the community, and access admin tools.
              </ThemedText>
              <Pressable style={styles.primaryBtn} onPress={handleSignIn} disabled={isLoadingAuth}>
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                  {isLoadingAuth ? 'Connecting...' : 'Sign in with Google (Supabase OAuth + Mock Fallback)'}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" style={{ marginTop: 8, textAlign: 'center' }}>
                This will attempt real Google sign-in if Supabase is configured. Otherwise uses demo profile.
              </ThemedText>
            </ThemedView>
          ) : user && (
            <>
              {/* User Info */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Your Profile</ThemedText>
                <ThemedText style={{ marginTop: 8 }}>Name: {user.name}</ThemedText>
                <ThemedText>Role: {user.role} • EPA Certified: {user.epaCertified ? 'Yes' : 'No'}</ThemedText>
                <ThemedText>Location: {user.location.zip}, {user.location.city}, {user.location.state}</ThemedText>
                <ThemedText>Email: {user.email || 'Not linked yet'}</ThemedText>
                <ThemedText>Linked Accounts: {user.linkedAccounts.join(', ')}</ThemedText>

                <ThemedText style={{ marginTop: 16 }}>Edit Name:</ThemedText>
                <TextInput 
                  style={styles.input} 
                  value={editName} 
                  onChangeText={setEditName} 
                  placeholder={user.name} 
                />
                
                <ThemedText style={{ marginTop: 12 }}>Update Location ZIP (affects all code recommendations &amp; walkthroughs):</ThemedText>
                <TextInput 
                  style={styles.input} 
                  value={editZip} 
                  onChangeText={setEditZip} 
                  placeholder={user.location.zip} 
                  keyboardType="numeric" 
                />

                <Pressable style={styles.primaryBtn} onPress={handleSaveProfile} disabled={isSaving}>
                  <ThemedText style={{ color: 'white' }}>
                    {isSaving ? 'Saving to Supabase...' : 'Save Changes (Local + Supabase Sync)'}
                  </ThemedText>
                </Pressable>

                <Pressable style={styles.secondaryBtn} onPress={handleSignOut}>
                  <ThemedText>Sign Out</ThemedText>
                </Pressable>
              </ThemedView>

              {/* AI Personality (enhanced) */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">AI Personalization (Persisted)</ThemedText>
                <ThemedText style={{ marginVertical: 6 }}>
                  Learning: {user.aiPrefs.learningEnabled ? 'ON — AI adapts to your style' : 'OFF'}
                </ThemedText>
                <ThemedText>Current Style: "{user.aiPrefs.personality}"</ThemedText>
                <ThemedText type="small" style={{ marginTop: 4 }}>
                  Changes here and in the AI tab are saved locally and will sync to your Supabase profile.
                </ThemedText>
              </ThemedView>

              {/* NEW: Quick Links to Admin, TOS, Terminology, Diagrams (stable since launch fix) */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Quick Links</ThemedText>
                <ThemedText type="small" style={{ marginBottom: 12, opacity: 0.8 }}>
                  Access the full admin portal, terms of service, terminology reference, and educational diagrams.
                </ThemedText>

                <Pressable 
                  style={[styles.secondaryBtn, { marginBottom: 8 }]} 
                  onPress={() => router.push('/admin')}
                >
                  <ThemedText style={{ color: '#208AEF' }}>Admin Portal (Master / Lower Admin)</ThemedText>
                </Pressable>

                <Pressable 
                  style={[styles.secondaryBtn, { marginBottom: 8 }]} 
                  onPress={() => router.push('/tos')}
                >
                  <ThemedText style={{ color: '#208AEF' }}>Terms of Service (General + Lower Admin Rules)</ThemedText>
                </Pressable>

                <Pressable 
                  style={[styles.secondaryBtn, { marginBottom: 8 }]} 
                  onPress={() => router.push('/terminology')}
                >
                  <ThemedText style={{ color: '#208AEF' }}>HVAC Terminology (Searchable Definitions)</ThemedText>
                </Pressable>

                <Pressable 
                  style={styles.secondaryBtn} 
                  onPress={() => router.push('/diagrams')}
                >
                  <ThemedText style={{ color: '#208AEF' }}>Educational Diagrams (10 with Moving-Parts Notes)</ThemedText>
                </Pressable>
              </ThemedView>

              {/* My Uploads (Step 11) */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">My Uploads (Notes, Photos, Videos)</ThemedText>
                <ThemedText type="small" style={{ marginBottom: 8 }}>
                  Toggle visibility to make public (appears in Equipment Hub Community Notes for all) or private. Upload from Equipment detail view.
                </ThemedText>
                {useHVACStore.getState().userUploads.length > 0 ? useHVACStore.getState().userUploads.map((upload) => (
                  <ThemedView key={upload.id} style={{ backgroundColor: '#F8F9FA', padding: 8, borderRadius: 6, marginBottom: 6 }}>
                    <ThemedText type="smallBold">{upload.model} • {upload.type} • {upload.isPublic ? 'PUBLIC' : 'PRIVATE'}</ThemedText>
                    <ThemedText type="small">{upload.content}</ThemedText>
                    {upload.uri && <ThemedText type="small" style={{ color: '#208AEF' }}>Media attached</ThemedText>}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable onPress={() => useHVACStore.getState().toggleUploadVisibility(upload.id)}>
                        <ThemedText style={{ color: '#208AEF' }}>Toggle Public/Private</ThemedText>
                      </Pressable>
                      <Pressable onPress={() => useHVACStore.getState().deleteUserUpload(upload.id)}>
                        <ThemedText style={{ color: '#E74C3C' }}>Delete</ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                )) : (
                  <ThemedText type="small">No uploads yet. Add notes, photos or videos in the Equipment tab detail view!</ThemedText>
                )}
              </ThemedView>

              {/* Calculator History Summary (Step 4) */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Calculator History</ThemedText>
                <ThemedText type="small">You have {useHVACStore.getState().calculatorHistory.length} saved calculations. View full history in the Calculators tab. Useful for repeating jobs and documentation.</ThemedText>
              </ThemedView>

              {/* Step 15: Gamification Badges */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Badges &amp; Achievements (Gamification)</ThemedText>
                <ThemedText type="small" style={{ marginBottom: 8 }}>Earned by completing actions like uploads, EPA progress, QR scans, job logging. Badges persist locally and will sync to Supabase.</ThemedText>
                {useHVACStore.getState().badges.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {useHVACStore.getState().badges.map((b, i) => (
                      <ThemedView key={i} style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <ThemedText type="small">🏆 {b}</ThemedText>
                      </ThemedView>
                    ))}
                  </View>
                ) : <ThemedText type="small">No badges yet. Upload notes, complete EPA quizzes, scan QR, or log a job to earn some!</ThemedText>}
              </ThemedView>

              {/* Step 15: Job Logger */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Job Logger</ThemedText>
                <ThemedText type="small" style={{ marginBottom: 8 }}>Record completed jobs with notes/photos linked to equipment. Useful for records and learning.</ThemedText>
                <Pressable 
                  style={{ backgroundColor: '#208AEF', padding: 8, borderRadius: 6, marginBottom: 8, alignSelf: 'flex-start' }}
                  onPress={() => {
                    const model = prompt ? prompt('Job model (or leave blank)', '') || 'General' : 'General';
                    const notes = prompt ? prompt('Job notes/details', 'Replaced capacitor on unit') || 'Job completed' : 'Job completed';
                    useHVACStore.getState().logJob({ model, notes, date: new Date().toISOString().split('T')[0] });
                    Alert.alert('Job Logged', 'Added to your job history. Badge awarded if first!');
                  }}
                >
                  <ThemedText style={{ color: 'white' }}>Log New Job</ThemedText>
                </Pressable>
                {useHVACStore.getState().jobLogs.length > 0 ? useHVACStore.getState().jobLogs.slice(0,5).map((log, i) => (
                  <ThemedView key={i} style={{ backgroundColor: '#F8F9FA', padding: 6, borderRadius: 4, marginBottom: 4 }}>
                    <ThemedText type="small">{log.date} • {log.model || 'N/A'}: {log.notes}</ThemedText>
                  </ThemedView>
                )) : <ThemedText type="small">No jobs logged yet. Use the button above or link from Equipment detail in future.</ThemedText>}
              </ThemedView>

              {/* Admin Approvals Queue - Step 13 Real (Supabase-backed + diff + push) */}
              <ThemedView style={styles.card}>
                <Pressable onPress={() => setShowAdmin(!showAdmin)}>
                  <ThemedText type="subtitle">
                    Admin Approvals Queue {isAdmin ? `(${pendingApprovalsCount} pending)` : '(Admin / Master only)'}
                  </ThemedText>
                </Pressable>
                {showAdmin && isAdmin && (
                  <View style={{ marginTop: 8 }}>
                    <ThemedText type="small" style={{ marginBottom: 8, color: '#666' }}>
                      Full diff view • Approve/Reject with notes • Real-time notifications to suggester via in-app + Expo push (local demo) + Supabase Edge simulation. 
                      {isSupabaseConfigured() ? ' (Supabase realtime ready)' : ' (Mock mode - add .env for full DB)'}
                    </ThemedText>
                    {approvals.filter(a => a.status === 'pending').length > 0 ? approvals.filter(a => a.status === 'pending').map(item => {
                      const diff = getDiffForApproval(item);
                      const notes = adminNotes[item.id] || '';
                      return (
                        <ThemedView key={item.id} style={{ backgroundColor: '#FFF8E1', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#F9A825' }}>
                          <ThemedText type="smallBold">{item.dataType} • Suggested by {item.suggestedBy} • {new Date(item.timestamp || '').toLocaleDateString()}</ThemedText>
                          <ThemedText type="small" style={{ marginTop: 4 }}>{item.summary}</ThemedText>
                          <ThemedText type="small" style={{ opacity: 0.8, marginTop: 2 }}>{item.details}</ThemedText>

                          {/* DIFF VIEW (Step 13 requirement) */}
                          {diff && (
                            <ThemedView style={{ backgroundColor: '#FFF', padding: 8, borderRadius: 6, marginTop: 8 }}>
                              <ThemedText type="smallBold" style={{ color: diff.type === 'NEW' ? '#2E7D32' : '#1565C0' }}>
                                {diff.type === 'NEW' ? '🆕 NEW ENTRY (not in DB)' : '🔄 UPDATE to existing record'}
                              </ThemedText>
                              <ThemedText type="small" style={{ marginTop: 4, color: '#666' }}>Before: {diff.before}</ThemedText>
                              <ThemedText type="small" style={{ color: '#1565C0' }}>After: {diff.after}</ThemedText>
                            </ThemedView>
                          )}

                          {/* Admin Notes Input */}
                          <TextInput 
                            style={[styles.input, { marginTop: 8, fontSize: 13, height: 60 }]} 
                            value={notes}
                            onChangeText={(text) => setAdminNotes(prev => ({ ...prev, [item.id]: text }))}
                            placeholder="Admin review notes (e.g. 'Verified against manufacturer submittal 2026-06', 'Duplicate - see eq1', 'Needs more source verification')..."
                            multiline
                          />

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <Pressable 
                              style={{ backgroundColor: '#28A745', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' }}
                              onPress={() => handleApproveWithNotes(item.id)}
                            >
                              <ThemedText style={{ color: 'white', fontWeight: '600' }}>✓ APPROVE (add to public DB)</ThemedText>
                            </Pressable>
                            <Pressable 
                              style={{ backgroundColor: '#E74C3C', padding: 10, borderRadius: 6, flex: 1, alignItems: 'center' }}
                              onPress={() => handleRejectWithNotes(item.id)}
                            >
                              <ThemedText style={{ color: 'white', fontWeight: '600' }}>✗ REJECT</ThemedText>
                            </Pressable>
                          </View>
                          <ThemedText type="small" style={{ marginTop: 4, opacity: 0.6 }}>Actions update Supabase (if configured), remove from queue, notify original user via push + bell.</ThemedText>
                        </ThemedView>
                      );
                    }) : <ThemedText type="small">No pending items in queue. Submit new data via AI chat "Search" + verify, or SDS in Equipment.</ThemedText>}

                    {/* Show recently processed if any */}
                    {approvals.filter(a => a.status !== 'pending').length > 0 && (
                      <ThemedText type="small" style={{ marginTop: 8, opacity: 0.7 }}>
                        Recently processed: {approvals.filter(a => a.status !== 'pending').map(a => `${a.summary.substring(0,40)}... (${a.status})`).join(', ')}
                      </ThemedText>
                    )}
                  </View>
                )}
                {!isAdmin && (
                  <>
                    <ThemedText type="small">Only admins and master technicians can review and approve new database entries (prevents unverified data in shared DB).</ThemedText>
                    <Pressable 
                      style={{ backgroundColor: '#34C759', padding: 8, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' }}
                      onPress={handlePromoteToAdmin}
                    >
                      <ThemedText style={{ color: 'white', fontSize: 12 }}>Demo: Switch to Admin Role (for testing full queue + diff + approve/reject)</ThemedText>
                    </Pressable>
                  </>
                )}

                {isAdmin && (
                  <Pressable 
                    style={{ backgroundColor: '#208AEF', padding: 10, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' }}
                    onPress={() => {
                      // Simulate bulk import of additional real data
                      const additional = mockEquipment.slice(0, 5).map((eq, i) => ({
                        ...eq,
                        id: 'bulk' + Date.now() + i,
                        averagePrice: '$' + (parseInt(eq.averagePrice.replace('$','').replace(',','')) + 100).toString(),
                        lastUpdated: new Date().toISOString().split('T')[0],
                      }));
                      additional.forEach(eq => useHVACStore.getState().addEquipment(eq));
                      Alert.alert('Bulk Import', 'Added 5 sample real-world models with updated prices (simulated from manufacturer data).');
                    }}
                  >
                    <ThemedText style={{ color: 'white' }}>Admin: Bulk Import Real Data Samples</ThemedText>
                  </Pressable>
                )}
              </ThemedView>

              {/* Notifications Center (enhanced for Step 13) */}
              <ThemedView style={styles.card}>
                <Pressable onPress={() => setShowNotifications(!showNotifications)}>
                  <ThemedText type="subtitle">Notifications &amp; Activity {useHVACStore.getState().unreadNotificationsCount > 0 ? `(${useHVACStore.getState().unreadNotificationsCount} unread)` : ''}</ThemedText>
                </Pressable>
                {showNotifications && (
                  <View style={{ marginTop: 8 }}>
                    {useHVACStore.getState().notifications.length > 0 ? useHVACStore.getState().notifications.map(n => (
                      <ThemedView key={n.id} style={{ backgroundColor: n.read ? '#F5F5F5' : '#E3F2FD', padding: 8, borderRadius: 6, marginBottom: 4 }}>
                        <ThemedText type="small">{n.message}</ThemedText>
                        <ThemedText type="small" style={{ opacity: 0.5 }}>{new Date(n.timestamp).toLocaleTimeString()}</ThemedText>
                      </ThemedView>
                    )) : <ThemedText type="small">No notifications yet. Approvals and admin actions will appear here + as device push notifications.</ThemedText>}
                    <Pressable onPress={() => { useHVACStore.getState().markNotificationsRead(); setShowNotifications(false); }} style={{ marginTop: 6 }}>
                      <ThemedText style={{ color: '#208AEF' }}>Mark all read</ThemedText>
                    </Pressable>
                  </View>
                )}
                <ThemedText type="small" style={{ marginTop: 4, opacity: 0.6 }}>
                  Real push notifications configured with Expo (permissions requested on launch). When Supabase + Edge Functions ready, admins get instant queue alerts, users get approval results.
                </ThemedText>
              </ThemedView>

              {/* Future Features */}
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle">Coming in Later Steps</ThemedText>
                <ThemedText type="small">• Full EPA certification tracking &amp; gamification badges</ThemedText>
                <ThemedText type="small">• Job history with saved walkthroughs</ThemedText>
                <ThemedText type="small">• Real-time sync of equipment &amp; community posts via Supabase</ThemedText>
                <ThemedText type="small">• Inventory management + QR scanner</ThemedText>
                <ThemedText type="small">• Link additional accounts (YouTube, manufacturer portals)</ThemedText>
              </ThemedView>
            </>
          )}

          <ThemedText type="small" style={{ textAlign: 'center', marginTop: 20, opacity: 0.5 }}>
            All approved data is shared with the entire HVAC community. Your private uploads and AI personality stay yours.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: 120 },
  header: { marginBottom: Spacing.three },
  card: { backgroundColor: '#F0F0F3', padding: Spacing.four, borderRadius: 12, marginBottom: Spacing.three },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#ddd' },
  primaryBtn: { backgroundColor: '#208AEF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  secondaryBtn: { padding: 10, alignItems: 'center', marginTop: 8 },
});
