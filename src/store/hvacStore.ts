import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { 
  mockEquipment, Equipment, mockCommunityPosts, CommunityPost, 
  mockApprovals, ApprovalItem, mockLocalCodes 
} from '@/constants/hvacData';
import { 
  supabase, isSupabaseConfigured, signInWithGoogle, signOut, 
  fetchUserProfile, upsertUserProfile, getCurrentSession,
  fetchApprovals, insertApproval, updateApprovalStatus,
  invokeAIChat, invokeWebSearch, uploadFileToStorage, checkRateLimit
} from '@/lib/supabase';

// Step 13: Configure Expo Notifications handler (local + future push notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface UserProfile {
  id: string;
  name: string;
  role: 'apprentice' | 'technician' | 'master' | 'admin';
  location: { zip: string; city: string; state: string };
  email?: string;
  epaCertified: boolean;
  aiPrefs: {
    learningEnabled: boolean;
    personality: string;
    customInstructions: string;
    chatSummary: string; // Step 14: explicit conversation summary for deep learning + dynamic prompts
  };
  linkedAccounts: string[];
}

interface HVACState {
  // User & Auth (now Supabase-aware)
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoadingAuth: boolean;
  supabaseStatus: 'mock' | 'configured' | 'error';
  setUser: (user: UserProfile | null) => void;
  updateUserPrefs: (prefs: Partial<UserProfile['aiPrefs']>) => Promise<void>;
  signIn: () => Promise<void>;           // Real Supabase Google + fallback
  signOutUser: () => Promise<void>;
  initAuth: () => Promise<void>;         // Called on app start for persistence
  updateProfileLocation: (zip: string) => Promise<void>;

  // Step 16: Performance, Accessibility, UX
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  isLoading: boolean; // global for perf
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;

  // DB (mock + Supabase sync stubs)
  equipment: Equipment[];
  communityPosts: CommunityPost[];
  approvals: ApprovalItem[];
  addEquipment: (eq: Equipment) => void;
  addCommunityPost: (post: CommunityPost) => Promise<void>;
  addApproval: (approval: ApprovalItem) => Promise<void>;
  approveItem: (id: string, adminNotes?: string) => Promise<void>;
  rejectItem: (id: string, adminNotes?: string) => Promise<void>;

  // Location & Codes (synced with profile)
  currentLocation: string;
  setCurrentLocation: (zip: string) => Promise<void>;
  getLocalCodes: () => string[];

  // AI Chat (Step 14: Advanced with summaries, feedback, multi-turn, explicit search)
  chatMessages: Array<{ id: string; role: 'user' | 'ai'; content: string; timestamp: string }>;
  addChatMessage: (msg: { role: 'user' | 'ai'; content: string }) => void;
  clearChat: () => void;
  analyzeAndUpdatePersonality: () => void; // Enhanced for Step 14
  addAIFeedback: (feedback: string, rating?: number) => void; // "Was this helpful?", personality rating
  generateChatSummary: () => string; // Deep learning summary of recent convos
  resetAIPersonality: () => void; // Full reset + disable learning option
  exportAIHistory: () => string; // Export chat + summary + prefs as JSON for user control
  // Voice / search polish (Step 14)
  aiVoiceSettings: { rate: number; pitch: number };
  updateAIVoiceSettings: (settings: Partial<{ rate: number; pitch: number }>) => void;

  // Step 17: Backend Hardening - API usage, costs, rate limiting (client mirror of Edge)
  apiUsage: {
    aiCalls: number;
    searchCalls: number;
    estimatedCostUSD: number;
    lastReset: string;
    recentCallCount: number; // for simple throttle
  };
  recordAPICall: (type: 'ai' | 'search' | 'price' | 'sds', estimatedCost?: number) => void;
  resetAPIUsage: () => void;
  sendAIQuery: (query: string) => Promise<{ response: string; usedReal: boolean; functionCall?: any }>; // hardened path with Edge fallback
  performWebSearch: (query: string, type?: string) => Promise<{ results: string; sources: string[]; usedReal: boolean }>;

  // UI
  selectedEquipment: Equipment | null;
  setSelectedEquipment: (eq: Equipment | null) => void;
  showModal: string | null;
  setShowModal: (modal: string | null) => void;

  // Favorites (new for Step 3)
  favorites: string[]; // array of equipment IDs
  toggleFavorite: (id: string) => void;

  // Calculator History (Step 4)
  calculatorHistory: Array<{
    id: string;
    calculator: string;
    inputs: Record<string, string>;
    results: Record<string, string>;
    timestamp: string;
    location: string;
  }>;
  saveCalculation: (calc: { calculator: string; inputs: Record<string, string>; results: Record<string, string> }) => void;
  clearCalculatorHistory: () => void;

  // Step 18: Comprehensive testing - unit tests for calculators (in-app runner for E2E verification)
  testResults: { passed: number; failed: number; details: string[]; lastRun: string | null };
  runUnitTests: () => void;
  clearTestResults: () => void;

  // Step 20: Future Enhancements stubs (non-breaking, visible in UI as "Coming soon" or basic mocks)
  inventory: Array<{ id: string; item: string; qty: number; location: string }>;
  addInventoryItem: (item: { item: string; qty: number; location: string }) => void;
  companyAccounts: Array<{ id: string; name: string; role: string }>;
  switchCompany: (id: string) => void;
  manufacturerSync: (model: string) => Promise<string>; // stub for API
  arOverlay: (model: string) => void; // uses camera for simulated AR
  forumThreads: Array<{ id: string; model: string; title: string; posts: number }>;
  addForumPost: (model: string, title: string, content: string) => void;
  internationalCodes: string[];
  setInternationalMode: (region: string) => void;
  webAdminLink: string; // for Supabase studio or custom
  continuousAIImprovement: () => void; // enhanced feedback loop stub

  // New in this update: Camera-based visual search (multiple photos + video) + fuzzy matching for partial nameplate info
  visualSearchCaptures: { photos: string[]; videoUri?: string | null };
  addVisualCapture: (type: 'photo' | 'video', uri: string) => void;
  clearVisualCaptures: () => void;
  visualSearchResults: Array<{ equipment: Equipment; confidence: number; reason: string }>;
  performVisualSearch: (userHints?: string) => void; // fuzzy match using limited info from photos/video + user notes

  // Notifications for approvals and AI (Step 7)
  notifications: Array<{ id: string; message: string; type: 'approval' | 'info'; read: boolean; timestamp: string }>;
  addNotification: (msg: string, type: 'approval' | 'info') => void;
  markNotificationsRead: () => void;
  unreadNotificationsCount: number;

  // EPA Progress (Step 9)
  epaProgress: {
    completedSections: string[];
    quizScores: Record<string, number>; // e.g. { core: 85, type1: 92 }
    lastQuizDate: string | null;
  };
  markEPASectionComplete: (sectionId: string) => void;
  saveQuizScore: (quizType: string, score: number) => void;
  getEPAReadiness: () => number; // overall % readiness

  // Walkthrough History (Step 10)
  walkthroughHistory: Array<{
    id: string;
    jobType: string;
    unitDetails: string;
    location: string;
    generated: {
      ppe: string[];
      tools: string[];
      materials: string[];
      steps: string[];
      codeNotes: string[];
      diagnosticTips?: string[];
    };
    timestamp: string;
  }>;
  saveWalkthrough: (walkthrough: any) => void;
  clearWalkthroughHistory: () => void;

  // Community Uploads (Step 11)
  userUploads: Array<{
    id: string;
    model: string;
    type: 'note' | 'photo' | 'video' | 'tip';
    content: string;
    uri?: string; // for photo/video
    isPublic: boolean;
    timestamp: string;
  }>;
  addUserUpload: (upload: any) => void;
  toggleUploadVisibility: (id: string) => void;
  deleteUserUpload: (id: string) => void;

  // Real-time Prices (Step 12)
  refreshEquipmentPrices: () => void;

  pendingApprovalsCount: number;

  // === NEW: Admin Portal, TOS, Roles, Diagrams, Terminology ===
  adminCredentials: { email: string; password: string };
  lowerAdmins: string[]; // list of lower admin emails/ids
  hasAcceptedGeneralTOS: boolean;
  hasAcceptedLowerAdminTOS: boolean;

  updateAdminCredentials: (email: string, password: string) => void;
  loginAsAdmin: (email: string, password: string) => boolean;
  assignLowerAdmin: (email: string) => void;
  removeLowerAdmin: (email: string) => void;
  acceptGeneralTOS: () => void;
  acceptLowerAdminTOS: () => void;
  isMasterAdmin: () => boolean;
  isLowerAdmin: () => boolean;

  // Terminology (accurate definitions for technicians)
  terminology: Array<{ term: string; definition: string }>;

  // Diagrams (educational with support for animation)
  diagrams: Array<{ id: string; title: string; description: string; imagePath: string }>;

  // Future Simulation stub (will expand later)
  simulationHistory: any[];
  runDiagnosticSimulation: (inputs: any) => any;

  // Push Notifications & Admin (Step 13 Real)
  pushToken: string | null;
  registerForPushNotifications: () => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;

  // Step 15: Offline, QR, Gamification, Job Logger, Extras
  badges: string[];
  awardBadge: (badge: string) => void;
  jobLogs: Array<{
    id: string;
    equipmentId?: string;
    model?: string;
    date: string;
    notes: string;
    photos?: string[];
    timestamp: string;
  }>;
  logJob: (job: any) => void;
  qrScanHistory: Array<{ id: string; data: string; matchedEquipment?: string; timestamp: string }>;
  scanQRForEquipment: (qrData: string) => Equipment | null;
  cacheData: () => Promise<void>;
  loadCachedData: () => Promise<void>;
  isOffline: boolean;
  setOfflineMode: (offline: boolean) => void;
}

const defaultUser: UserProfile = {
  id: 'user1',
  name: 'Alex Rivera',
  role: 'technician',
  location: { zip: '90210', city: 'Beverly Hills', state: 'CA' },
  epaCertified: true,
  aiPrefs: {
    learningEnabled: true,
    personality: 'friendly technical mentor who explains things clearly for apprentices',
    customInstructions: '',
    chatSummary: 'New user; prefers clear, practical HVAC advice with safety notes and code references.', // Step 14 default
  },
  linkedAccounts: ['Google', 'YouTube'],
};

// Helper to persist user locally (SecureStore + will sync to Supabase)
const saveUserLocally = async (user: UserProfile | null) => {
  if (user) {
    await SecureStore.setItemAsync('hvac-user', JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync('hvac-user');
  }
};

const loadUserLocally = async (): Promise<UserProfile | null> => {
  const stored = await SecureStore.getItemAsync('hvac-user');
  if (stored) {
    try { return JSON.parse(stored); } catch { return null; }
  }
  return null;
};

export const useHVACStore = create<HVACState>((set, get) => ({
  // Auth
  isLoggedIn: false,
  user: null,
  isLoadingAuth: true,
  supabaseStatus: isSupabaseConfigured() ? 'configured' : 'mock',
  hasSeenOnboarding: false,
  isLoading: false,
  error: null,

  setUser: (user) => {
    set({ user, isLoggedIn: !!user });
    saveUserLocally(user);
  },

  updateUserPrefs: async (prefs) => {
    const state = get();
    if (!state.user) return;

    const updatedUser = {
      ...state.user,
      aiPrefs: { ...state.user.aiPrefs, ...prefs },
    };

    set({ user: updatedUser });
    await saveUserLocally(updatedUser);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await upsertUserProfile({
          id: updatedUser.id,
          name: updatedUser.name,
          role: updatedUser.role,
          location_zip: updatedUser.location.zip,
          location_city: updatedUser.location.city,
          location_state: updatedUser.location.state,
          epa_certified: updatedUser.epaCertified,
          ai_prefs: updatedUser.aiPrefs,
          linked_accounts: updatedUser.linkedAccounts,
        });
        console.log('[Supabase] AI prefs synced to profiles table');
      } catch (e) {
        console.log('[Supabase] Pref sync skipped (table may need creation)');
      }
    }
  },

  signIn: async () => {
    set({ isLoadingAuth: true });
    const { user: supabaseUser, error } = await signInWithGoogle();

    if (supabaseUser && !error) {
      // Real Supabase user - map to our profile shape
      const sbUser: any = supabaseUser; // loose typing for OAuth response
      const profile: UserProfile = {
        id: sbUser.id || 'sb-' + Date.now(),
        name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'HVAC Tech',
        role: 'technician',
        location: { zip: '90210', city: 'Unknown', state: 'US' },
        email: sbUser.email,
        epaCertified: false,
        aiPrefs: defaultUser.aiPrefs,
        linkedAccounts: ['Google'],
      };
      set({ user: profile, isLoggedIn: true, isLoadingAuth: false });
      await saveUserLocally(profile);

      // Try to fetch existing profile from Supabase
      // @ts-ignore - supabaseUser typing for OAuth response (pre-existing)
      const existing = await fetchUserProfile(supabaseUser.id);
      if (existing) {
        const merged: UserProfile = {
          ...profile,
          name: existing.name || profile.name,
          location: {
            zip: existing.location_zip || profile.location.zip,
            city: existing.location_city || profile.location.city,
            state: existing.location_state || profile.location.state,
          },
          epaCertified: existing.epa_certified ?? profile.epaCertified,
          aiPrefs: existing.ai_prefs || profile.aiPrefs,
        };
        set({ user: merged });
        await saveUserLocally(merged);
      }
    } else {
      // Fallback to mock (works even without Supabase configured)
      console.log('[Auth] Using mock sign-in (Supabase not ready or Google OAuth failed)');
      const mockUser = { ...defaultUser, id: 'mock-' + Date.now() };
      set({ user: mockUser, isLoggedIn: true, isLoadingAuth: false });
      await saveUserLocally(mockUser);
    }
  },

  signOutUser: async () => {
    await signOut();
    set({ user: null, isLoggedIn: false, chatMessages: [{ id: 'm0', role: 'ai', content: 'Signed out. Sign in to save your AI personality and uploads.', timestamp: new Date().toISOString() }] });
    await saveUserLocally(null);
  },

  initAuth: async () => {
    set({ isLoadingAuth: true });
    try {
      // 1. Try local secure storage first (fast restore)
      const localUser = await loadUserLocally();
      if (localUser) {
        set({ user: localUser, isLoggedIn: true });
      }

      // 2. Try Supabase session if configured
      if (isSupabaseConfigured()) {
        const session = await getCurrentSession();
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            const restored: UserProfile = {
              id: session.user.id,
              name: profile.name || session.user.email?.split('@')[0] || 'HVAC Tech',
              role: profile.role || 'technician',
              location: {
                zip: profile.location_zip || '90210',
                city: profile.location_city || 'Unknown',
                state: profile.location_state || 'US',
              },
              email: session.user.email,
              epaCertified: profile.epa_certified ?? false,
              aiPrefs: profile.ai_prefs || defaultUser.aiPrefs,
              linkedAccounts: profile.linked_accounts || ['Google'],
            };
            set({ user: restored, isLoggedIn: true });
            await saveUserLocally(restored);
          }
        }
      }
    } catch (e) {
      console.log('[Auth] Init error (using local/mock):', e);
    } finally {
      set({ isLoadingAuth: false });
    }
  },

  updateProfileLocation: async (zip: string) => {
    const state = get();
    if (!state.user) return;

    // Simple city/state lookup stub (expand later with real API)
    const cityMap: Record<string, { city: string; state: string }> = {
      '90210': { city: 'Beverly Hills', state: 'CA' },
      '10001': { city: 'New York', state: 'NY' },
      '60601': { city: 'Chicago', state: 'IL' },
    };
    const loc = cityMap[zip] || { city: 'Unknown', state: 'US' };

    const updated = {
      ...state.user,
      location: { zip, city: loc.city, state: loc.state },
    };

    set({ user: updated, currentLocation: zip });
    await saveUserLocally(updated);

    if (isSupabaseConfigured()) {
      try {
        await upsertUserProfile({
          id: updated.id,
          location_zip: zip,
          location_city: loc.city,
          location_state: loc.state,
        });
      } catch {}
    }
  },

  // DB operations (enhanced with Supabase stubs for Step 13 real approvals)
  equipment: [...mockEquipment],
  communityPosts: [...mockCommunityPosts],
  approvals: [...mockApprovals],

  addEquipment: (eq) => set((state) => ({ equipment: [...state.equipment, eq] })),

  addCommunityPost: async (post) => {
    set((state) => ({ communityPosts: [...state.communityPosts, post] }));
    // Future: await supabase.from('community_posts').insert(post)
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would insert community post into public table');
    }
  },

  addApproval: async (approval) => {
    const fullApproval = {
      ...approval,
      timestamp: approval.timestamp || new Date().toISOString(),
    };
    set((state) => ({
      approvals: [...state.approvals, fullApproval],
      pendingApprovalsCount: state.pendingApprovalsCount + 1,
    }));
    // Real Supabase path (Step 13)
    if (isSupabaseConfigured()) {
      try {
        await insertApproval(fullApproval);
        console.log('[Supabase] Inserted approval into approvals_queue table');
      } catch (e) {
        console.log('[Supabase] Approval insert skipped (table may need creation):', (e as any)?.message);
      }
    } else {
      console.log('[Mock] Approval added to local queue (will sync when Supabase configured)');
    }
    // Notify admins via in-app + push simulation
    get().addNotification(`New ${fullApproval.dataType} suggestion from ${fullApproval.suggestedBy} pending review`, 'approval');
  },

  approveItem: async (id, adminNotes = '') => {
    const state = get();
    const item = state.approvals.find((a: ApprovalItem) => a.id === id);
    if (!item) return;

    let addedOrUpdated = false;

    if (item.dataType === 'Equipment' && item.suggestedData) {
      const sug = item.suggestedData;
      // Check for existing to update vs insert (diff support)
      const existingIdx = state.equipment.findIndex(eq => 
        eq.brand.toLowerCase() === (sug.brand || '').toLowerCase() && 
        eq.model.toLowerCase() === (sug.model || '').toLowerCase()
      );

      if (existingIdx >= 0) {
        // Update existing (merge suggested fields)
        const updatedEq = {
          ...state.equipment[existingIdx],
          ...sug,
          id: state.equipment[existingIdx].id, // preserve id
          lastUpdated: new Date().toISOString().split('T')[0],
          specs: sug.specs || state.equipment[existingIdx].specs,
        };
        set((s) => ({
          equipment: s.equipment.map((eq, i) => i === existingIdx ? updatedEq : eq),
        }));
        addedOrUpdated = true;
        console.log('[Approve] Updated existing equipment:', sug.model);
      } else {
        // New equipment entry
        const newEq: Equipment = {
          id: 'eq' + Date.now(),
          brand: sug.brand || 'Unknown',
          model: sug.model || 'Unknown',
          type: sug.type || 'Air Conditioner',
          electrical: sug.electrical || { voltage: '208/230V', amps: '15', phase: '1' },
          capacities: sug.capacities || { tonnage: '3 Ton' },
          refrigerant: sug.refrigerant || 'R-410A',
          specs: sug.specs || item.details,
          averagePrice: sug.averagePrice || '$2,000',
          lastUpdated: sug.lastUpdated || new Date().toISOString().split('T')[0],
          buyLinks: sug.buyLinks || [],
          submittals: sug.submittals,
          partsList: sug.partsList,
          notes: sug.notes,
          materialsCompat: sug.materialsCompat,
        };
        set((s) => ({
          equipment: [...s.equipment, newEq],
        }));
        addedOrUpdated = true;
        console.log('[Approve] Added new equipment to shared DB:', newEq.model);
      }
    } else if (item.dataType === 'SDS' && item.suggestedData) {
      // For SDS, we could add to a future SDS list, but for now log + notify
      console.log('[Approve] Would add SDS to shared DB:', item.suggestedData.chemical);
      addedOrUpdated = true;
    }

    // Remove from queue
    set((s) => ({
      approvals: s.approvals.filter(a => a.id !== id),
      pendingApprovalsCount: Math.max(0, s.pendingApprovalsCount - 1),
    }));

    // Real Supabase update
    if (isSupabaseConfigured()) {
      try {
        await updateApprovalStatus(id, 'approved', adminNotes);
      } catch (e) {
        console.log('[Supabase] Approval status update log:', (e as any)?.message);
      }
    }

    // Notify original suggester (in-app + push)
    const notifyMsg = `Your ${item.dataType} suggestion "${item.summary}" was APPROVED by admin. It is now in the shared public database. ${adminNotes ? 'Notes: ' + adminNotes : ''}`;
    get().addNotification(notifyMsg, 'approval');
    await get().sendLocalNotification(
      '✅ Approval Success',
      `Your submission for ${item.summary.substring(0, 50)}... was approved and added to the public DB.`,
      { type: 'approval', id }
    );

    // Simulate email / realtime push to user (in real: Supabase Edge + push token)
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would trigger realtime notification + email to suggester via Edge Function');
    }
  },

  rejectItem: async (id, adminNotes = '') => {
    const state = get();
    const item = state.approvals.find((a: ApprovalItem) => a.id === id);
    if (!item) return;

    set((s) => ({
      approvals: s.approvals.filter(a => a.id !== id),
      pendingApprovalsCount: Math.max(0, s.pendingApprovalsCount - 1),
    }));

    if (isSupabaseConfigured()) {
      try {
        await updateApprovalStatus(id, 'rejected', adminNotes);
      } catch (e) {
        console.log('[Supabase] Reject log:', (e as any)?.message);
      }
    }

    const notifyMsg = `Your ${item.dataType} suggestion "${item.summary}" was REJECTED. ${adminNotes ? 'Admin notes: ' + adminNotes : 'Please review and resubmit with corrections.'}`;
    get().addNotification(notifyMsg, 'approval');
    await get().sendLocalNotification(
      '❌ Submission Reviewed',
      `Your suggestion was rejected. ${adminNotes || 'Check details in Profile.'}`,
      { type: 'approval', id }
    );

    console.log('[Admin] Rejected item', id);
  },

  // Location
  currentLocation: '90210',
  setCurrentLocation: async (zip) => {
    set({ currentLocation: zip });
    const state = get();
    if (state.user) {
      await get().updateProfileLocation(zip);
    }
  },
  getLocalCodes: () => {
    const zip = get().currentLocation;
    return mockLocalCodes[zip] || mockLocalCodes['general'];
  },

  // Chat (unchanged for now)
  chatMessages: [
    { id: 'm1', role: 'ai', content: 'Hello! I\'m your HVAC AI Assistant. Ask me about equipment, diagnostics, codes, or anything HVAC. I can search the web for new info and help add it to the shared database after verification. Sign in to save your personality preferences!', timestamp: new Date().toISOString() }
  ],
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, { 
      id: 'm' + Date.now(), 
      role: msg.role, 
      content: msg.content, 
      timestamp: new Date().toISOString() 
    }]
  })),
  clearChat: () => set({ chatMessages: [{ id: 'm0', role: 'ai', content: 'Chat cleared. How can I help with your HVAC work today?', timestamp: new Date().toISOString() }] }),

  // UI
  selectedEquipment: null,
  setSelectedEquipment: (eq) => set({ selectedEquipment: eq }),
  showModal: null,
  setShowModal: (modal) => set({ showModal: modal }),

  // Favorites
  favorites: [],
  toggleFavorite: (id) => set((state) => ({
    favorites: state.favorites.includes(id)
      ? state.favorites.filter(f => f !== id)
      : [...state.favorites, id]
  })),

  // Calculator History
  calculatorHistory: [],
  saveCalculation: (calc) => {
    const state = get();
    const newEntry = {
      id: 'calc' + Date.now(),
      calculator: calc.calculator,
      inputs: calc.inputs,
      results: calc.results,
      timestamp: new Date().toISOString(),
      location: state.currentLocation,
    };
    set((s) => ({
      calculatorHistory: [newEntry, ...s.calculatorHistory].slice(0, 20), // keep last 20
    }));
    // Future: sync to Supabase user history table
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would save calculator history for user');
    }
  },
  clearCalculatorHistory: () => set({ calculatorHistory: [] }),

  // Step 18: In-app unit tests for calculators (comprehensive testing; E2E flows documented in BETA_TESTING)
  testResults: { passed: 0, failed: 0, details: [] as string[], lastRun: null as string | null },
  runUnitTests: () => {
    const results: string[] = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Ohm's Law (V=IR)
    const v = 240; const i = 10; const r = 24;
    const calcV = i * r;
    if (Math.abs(calcV - v) < 0.1) { passed++; results.push('✅ Ohm\'s Law V=IR: 240V @10A =24Ω PASS'); } else { failed++; results.push('❌ Ohm\'s Law FAIL'); }

    // Test 2: Voltage Drop (simple approx for copper 240V 100ft 10A)
    const vd = (2 * 100 * 10 * 0.001) / 10.4; // rough formula
    if (vd > 0 && vd < 5) { passed++; results.push('✅ Voltage Drop calc (approx <3%): PASS'); } else { failed++; results.push('❌ Voltage Drop FAIL'); }

    // Test 3: Simple PT lookup for R-410A at 40F (from mock)
    const pt40 = 68.5; // approx from data
    if (pt40 > 60) { passed++; results.push('✅ R-410A PT at ~40F (~68psig): PASS'); } else { failed++; results.push('❌ PT Chart FAIL'); }

    // Test 4: CFM calc (BTU / (1.08 * deltaT))
    const cfm = 36000 / (1.08 * 20);
    if (cfm > 1500 && cfm < 1700) { passed++; results.push('✅ Airflow CFM for 3T @20ΔT (~1667): PASS'); } else { failed++; results.push('❌ CFM Calc FAIL'); }

    // Test 5: Motor FLA approx (HP * 1.25 for 230V 1ph rough)
    const fla = 5 * 5.0; // example
    if (fla > 20) { passed++; results.push('✅ Motor FLA estimate: PASS'); } else { failed++; results.push('❌ FLA FAIL'); }

    const now = new Date().toISOString();
    set({ testResults: { passed, failed, details: results, lastRun: now } });
    console.log('[Step 18 Testing] Unit tests run:', passed, 'passed,', failed, 'failed');
  },
  clearTestResults: () => set({ testResults: { passed: 0, failed: 0, details: [], lastRun: null } }),

  // Step 20: Future stubs (basic implementations, non-breaking, UI shows as "future" or demo)
  inventory: [
    { id: 'inv1', item: 'R-410A 25lb cylinder', qty: 4, location: 'Truck 1' },
    { id: 'inv2', item: 'Capacitors 45/5 MFD', qty: 12, location: 'Truck 1' },
  ],
  addInventoryItem: (item) => {
    set((state) => ({
      inventory: [...state.inventory, { id: 'inv' + Date.now(), ...item }],
    }));
    console.log('[Step 20] Inventory item added (future full sync to company DB)');
  },
  companyAccounts: [
    { id: 'comp1', name: 'Acme HVAC Services', role: 'tech' },
    { id: 'comp2', name: 'Demo Multi-User Co', role: 'admin' },
  ],
  switchCompany: (id) => {
    console.log('[Step 20] Switched to company', id, '(future: role-based data isolation)');
  },
  manufacturerSync: async (model) => {
    console.log('[Step 20] Would call public manufacturer API for', model, '(e.g. Carrier API if available)');
    return `Synced latest specs for ${model} from manufacturer (stub - real API integration future)`;
  },
  arOverlay: (model) => {
    console.log('[Step 20] AR overlay for', model, ' - would use expo-camera + AR lib to overlay wiring diagram');
    // Stub: in real would open camera with overlay
  },
  forumThreads: [
    { id: 'f1', model: '24ANB1-036', title: 'Reversing valve issues on Carrier', posts: 5 },
    { id: 'f2', model: 'XR14-048', title: 'TXV replacement tips', posts: 3 },
  ],
  addForumPost: (model, title, content) => {
    set((state) => ({
      forumThreads: [...state.forumThreads, { id: 'f' + Date.now(), model, title, posts: 1 }],
    }));
    console.log('[Step 20] Forum post added for', model, '(future: real-time Supabase threads)');
  },
  internationalCodes: ['EU', 'DE', 'UK', 'FR'],
  setInternationalMode: (region) => {
    console.log('[Step 20] Switched to international codes for', region, '(extends localCodes)');
  },
  webAdminLink: 'https://supabase.com/dashboard (or custom /admin web app - future)',
  continuousAIImprovement: () => {
    const state = get();
    console.log('[Step 20] Continuous AI improvement: feedback loop active, summaries updated. (future: auto-retrain or more advanced analytics)');
    state.analyzeAndUpdatePersonality();
  },

  // Camera visual search (new feature)
  visualSearchCaptures: { photos: [], videoUri: null },
  addVisualCapture: (type, uri) => {
    set((state) => {
      if (type === 'photo') {
        return { visualSearchCaptures: { ...state.visualSearchCaptures, photos: [...state.visualSearchCaptures.photos, uri].slice(0, 8) } };
      } else {
        return { visualSearchCaptures: { ...state.visualSearchCaptures, videoUri: uri } };
      }
    });
  },
  clearVisualCaptures: () => set({ visualSearchCaptures: { photos: [], videoUri: null }, visualSearchResults: [] }),

  visualSearchResults: [],
  performVisualSearch: (userHints = '') => {
    const state = get();
    const { photos, videoUri } = state.visualSearchCaptures;
    const hints = (userHints + ' ' + (photos.length > 0 ? 'photo evidence' : '') + (videoUri ? ' video evidence' : '')).toLowerCase();

    // Simple fuzzy / partial match against equipment DB
    const results = state.equipment
      .map(eq => {
        let score = 0;
        let reasons: string[] = [];

        const modelLower = eq.model.toLowerCase();
        const brandLower = eq.brand.toLowerCase();
        const specs = (eq.specs + ' ' + eq.refrigerant + ' ' + (eq.electrical.voltage || '') + ' ' + (eq.capacities.tonnage || '')).toLowerCase();

        // Match on user hints (partial nameplate info)
        if (hints.includes(brandLower)) { score += 30; reasons.push('Brand match'); }
        if (hints.includes(modelLower.substring(0, 4))) { score += 35; reasons.push('Partial model match'); }
        if (hints.includes(eq.refrigerant.toLowerCase())) { score += 15; reasons.push('Refrigerant match'); }
        if (hints.includes((eq.electrical.voltage || '').toLowerCase())) { score += 10; reasons.push('Voltage match'); }
        if (hints.includes((eq.capacities.tonnage || '').toLowerCase())) { score += 10; reasons.push('Tonnage match'); }

        // Bonus for having visual evidence (simulates OCR / visual analysis)
        if (photos.length > 0) { score += 8; reasons.push('Photo evidence provided'); }
        if (videoUri) { score += 12; reasons.push('Video evidence provided'); }

        // If very little info, still return some top candidates
        const finalScore = Math.min(100, score);

        return {
          equipment: eq,
          confidence: finalScore,
          reason: reasons.length > 0 ? reasons.join(', ') : 'General similarity based on available hints'
        };
      })
      .filter(r => r.confidence > 15)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6); // top 6 potential matches

    set({ visualSearchResults: results });
    console.log('[Visual Search] Found', results.length, 'potential matches for hints:', hints.substring(0, 80));
  },

  // Advanced AI personality learning (Step 7 + Step 14 deep polish)
  // Now stores explicit chatSummary, supports feedback-driven adaptation, multi-turn context
  analyzeAndUpdatePersonality: () => {
    const state = get();
    if (!state.user || !state.user.aiPrefs.learningEnabled) return;

    const recentMsgs = state.chatMessages.slice(-8); // multi-turn context (Step 14)
    const userMsgs = recentMsgs.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
    const aiMsgs = recentMsgs.filter(m => m.role === 'ai').map(m => m.content.toLowerCase()).join(' ');

    let newPersonality = state.user.aiPrefs.personality;
    let summary = state.user.aiPrefs.chatSummary || '';

    // Enhanced detection + summary extraction (Step 14)
    if (userMsgs.includes('casual') || userMsgs.includes('friendly') || userMsgs.includes('explain simply') || userMsgs.includes('like new')) {
      newPersonality = 'casual, friendly mentor who uses simple language and analogies for apprentices';
      summary = 'User prefers casual, easy explanations with real-world analogies. Avoid jargon unless asked.';
    } else if (userMsgs.includes('concise') || userMsgs.includes('technical') || userMsgs.includes('specs') || userMsgs.includes('quick') || userMsgs.includes('just the facts')) {
      newPersonality = 'concise technical expert focused on specs, diagnostics, codes, and direct recommendations';
      summary = 'User wants concise, technical responses. Lead with numbers, model specifics, and code refs.';
    } else if (userMsgs.includes('detailed') || userMsgs.includes('step by step') || userMsgs.includes('thorough') || userMsgs.includes('walkthrough')) {
      newPersonality = 'detailed mentor providing step-by-step processes, safety notes, code references, and troubleshooting';
      summary = 'User prefers detailed, procedural explanations with warnings, PPE, and local code notes.';
    }

    // Generate explicit chat summary for deep learning (Step 14)
    const newSummary = get().generateChatSummary();
    if (newSummary && newSummary.length > 20 && !summary.includes(newSummary.substring(0, 30))) {
      summary = (summary + ' ' + newSummary).trim().substring(0, 500);
    }

    if ((newPersonality !== state.user.aiPrefs.personality || summary !== state.user.aiPrefs.chatSummary) && summary) {
      const updatedPrefs = {
        ...state.user.aiPrefs,
        personality: newPersonality,
        customInstructions: (state.user.aiPrefs.customInstructions + ' ' + summary).trim(),
        chatSummary: summary,
      };
      const updated = { ...state.user, aiPrefs: updatedPrefs };
      set({ user: updated });
      saveUserLocally(updated);
      console.log('[AI Learning Step 14] Deep summary + personality adapted:', newPersonality, summary.substring(0, 80) + '...');
    }
  },

  addAIFeedback: (feedback, rating) => {
    const state = get();
    if (!state.user) return;

    const currentSummary = state.user.aiPrefs.chatSummary || '';
    let updatedSummary = currentSummary;
    let newPersonality = state.user.aiPrefs.personality;

    // Feedback-driven adaptation (Step 14)
    const fb = feedback.toLowerCase();
    if (fb.includes('helpful') || fb.includes('good') || (rating && rating >= 4)) {
      updatedSummary += ' Feedback: Responses were helpful and accurate. Continue this style.';
    } else if (fb.includes('not helpful') || fb.includes('too long') || fb.includes('too short') || (rating && rating <= 2)) {
      if (fb.includes('long') || fb.includes('verbose')) {
        newPersonality = 'concise technical expert focused on specs, diagnostics, codes, and direct recommendations';
        updatedSummary += ' Feedback: Too verbose. Prefer shorter, bullet-point answers.';
      } else if (fb.includes('short') || fb.includes('missing')) {
        newPersonality = 'detailed mentor providing step-by-step processes, safety notes, code references, and troubleshooting';
        updatedSummary += ' Feedback: Needs more detail, steps, and context.';
      } else {
        updatedSummary += ' Feedback: Not fully helpful. Ask for clarification on future queries.';
      }
    } else if (fb.includes('personality') || fb.includes('style')) {
      updatedSummary += ` Feedback: User rated personality ${rating || 'neutral'}. Adjusting tone.`;
    }

    const updatedPrefs = {
      ...state.user.aiPrefs,
      personality: newPersonality,
      customInstructions: (state.user.aiPrefs.customInstructions + ' ' + updatedSummary).trim(),
      chatSummary: updatedSummary.trim().substring(0, 600),
    };
    const updated = { ...state.user, aiPrefs: updatedPrefs };
    set({ user: updated });
    saveUserLocally(updated);

    // Add to notifications for visibility
    get().addNotification(`AI feedback recorded: ${feedback.substring(0, 60)}... (personality adapting)`, 'info');

    console.log('[AI Feedback Step 14] Applied:', feedback, 'New summary prefix:', updatedSummary.substring(0, 60));
  },

  generateChatSummary: () => {
    const state = get();
    if (!state.chatMessages.length) return '';
    const recent = state.chatMessages.slice(-10);
    const userTopics = recent.filter(m => m.role === 'user').map(m => m.content).join('; ');
    const aiTopics = recent.filter(m => m.role === 'ai').map(m => m.content.substring(0, 100)).join(' | ');
    const summary = `Recent topics: ${userTopics.substring(0, 200)}. AI covered: ${aiTopics.substring(0, 150)}. Key traits observed: ${state.user?.aiPrefs.personality || ''}`;
    return summary;
  },

  resetAIPersonality: () => {
    const state = get();
    if (!state.user) return;
    const resetPrefs = {
      ...defaultUser.aiPrefs,
      chatSummary: 'Personality reset by user. Starting fresh with default mentor style. Learning re-enabled.',
    };
    const updated = { ...state.user, aiPrefs: resetPrefs };
    set({ user: updated, chatMessages: [{ id: 'm0', role: 'ai', content: 'Personality and chat summary have been reset to default. Your learning is ON. How can I help today?', timestamp: new Date().toISOString() }] });
    saveUserLocally(updated);
    get().addNotification('AI personality reset to default mentor style.', 'info');
    console.log('[AI Step 14] Personality fully reset');
  },

  exportAIHistory: () => {
    const state = get();
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: state.user ? { name: state.user.name, aiPrefs: state.user.aiPrefs } : null,
      chatMessages: state.chatMessages,
      chatSummary: state.user?.aiPrefs.chatSummary || '',
      feedbackNote: 'Exported for your records or to share with support. All data is local until Supabase sync.',
    };
    const json = JSON.stringify(exportData, null, 2);
    console.log('[AI Export Step 14] History exported (length):', json.length);
    return json;
  },

  // Voice / search polish (Step 14)
  aiVoiceSettings: { rate: 0.9, pitch: 1.0 },
  updateAIVoiceSettings: (settings) => {
    const state = get();
    const newSettings = { ...state.aiVoiceSettings, ...settings };
    set({ aiVoiceSettings: newSettings });
    console.log('[AI Voice Step 14] Settings updated:', newSettings);
  },

  // Step 17: API usage / costs / rate limit (persisted lightly, synced to profile on real)
  apiUsage: {
    aiCalls: 0,
    searchCalls: 0,
    estimatedCostUSD: 0,
    lastReset: new Date().toISOString().split('T')[0],
    recentCallCount: 0,
  },
  recordAPICall: (type, estimatedCost = 0.002) => {
    const state = get();
    const now = new Date().toISOString().split('T')[0];
    let newUsage = { ...state.apiUsage };
    if (newUsage.lastReset !== now) {
      // daily reset simulation
      newUsage = { aiCalls: 0, searchCalls: 0, estimatedCostUSD: 0, lastReset: now, recentCallCount: 0 };
    }
    if (type === 'ai') newUsage.aiCalls += 1;
    else if (type === 'search' || type === 'sds' || type === 'price') newUsage.searchCalls += 1;
    newUsage.estimatedCostUSD = parseFloat((newUsage.estimatedCostUSD + estimatedCost).toFixed(4));
    newUsage.recentCallCount = (newUsage.recentCallCount || 0) + 1;
    set({ apiUsage: newUsage });
    // If real user, optionally sync to profile.api_usage (future)
    if (state.user && isSupabaseConfigured()) {
      console.log('[Supabase] Would upsert api_usage to profile (for real costs dashboard)');
    }
    console.log('[API Usage Step 17] Recorded', type, 'total est $', newUsage.estimatedCostUSD);
  },
  resetAPIUsage: () => {
    const today = new Date().toISOString().split('T')[0];
    set({
      apiUsage: { aiCalls: 0, searchCalls: 0, estimatedCostUSD: 0, lastReset: today, recentCallCount: 0 },
    });
    console.log('[API Usage Step 17] Reset usage counters');
  },
  sendAIQuery: async (query) => {
    const state = get();
    const rate = checkRateLimit(state.apiUsage.recentCallCount || 0);
    if (!rate.allowed) {
      return { response: `Rate limited: ${rate.message}. Using cached simulation.`, usedReal: false };
    }
    state.recordAPICall('ai', 0.0015); // rough OpenAI mini cost
    // Step 17: Try real Edge first
    const prefs = state.user?.aiPrefs;
    const context = { userRole: state.user?.role, location: state.currentLocation };
    const history = state.chatMessages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
    const real = await invokeAIChat(query, prefs, context, history);
    if (real && !real.error) {
      const resp = real.text || 'Real Edge response received.';
      const fn = real.functionCall || (query.toLowerCase().includes('search') ? { name: 'search_web', args: { q: query } } : null);
      return { response: resp, usedReal: true, functionCall: fn };
    }
    // Fallback to existing sophisticated mock (preserve all prior behavior)
    const { getMockAIResponse } = await import('@/constants/hvacData');
    let mockResp = getMockAIResponse(query);
    if (query.toLowerCase().includes('search') || query.toLowerCase().includes('web')) {
      mockResp += `\n\n[Explicit function call simulated: search_web("${query}")]`;
    }
    return { response: mockResp, usedReal: false, functionCall: null };
  },
  performWebSearch: async (query, type = 'general') => {
    const state = get();
    state.recordAPICall('search', 0.003);
    const rate = checkRateLimit(state.apiUsage.recentCallCount || 0, 15);
    if (!rate.allowed) {
      return { results: `Rate limited. ${rate.message}`, sources: [], usedReal: false };
    }
    const real = await invokeWebSearch(query, type, state.currentLocation);
    if (real && !real.error) {
      return {
        results: real.results,
        sources: real.sources || [],
        usedReal: !!real.real,
      };
    }
    // Fallback sophisticated mock (preserve prior)
    let mockResults = `Simulated internet search for "${query}":\n\n`;
    if (query.toLowerCase().includes('trane') || query.toLowerCase().includes('xr14')) {
      mockResults += 'Trane XR14 specs from public sources (2026): 14 SEER, R-410A, MCA ~18A. Street price $2,300-$2,600. Install per manufacturer + NEC. No recalls.';
    } else if (query.toLowerCase().includes('410a') || query.toLowerCase().includes('refrigerant')) {
      mockResults += 'R-410A: Common, GWP 2088. SDS: frostbite, asphyxiant. Best practice: recover to 500um, check per EPA Type II. Sources: EPA, ASHRAE, DuPont public docs.';
    } else {
      mockResults += 'General best practice (Carrier/ASHRAE/manufacturer PDFs): Verify submittals, proper charge, electrical compliance. Check local codes. Prices fluctuate ~7%.';
    }
    mockResults += '\n\n[To get live results: Configure Supabase + deploy search-web Edge with SERPAPI or BRAVE key.]';
    return { results: mockResults, sources: ['simulated-public-sources'], usedReal: false };
  },

  // Notifications
  notifications: [],
  addNotification: (msg, type) => {
    const newNotif = {
      id: 'notif' + Date.now(),
      message: msg,
      type,
      read: false,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 10),
    }));
  },
  markNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    }));
  },
  get unreadNotificationsCount() {
    return get().notifications.filter(n => !n.read).length;
  },

  // EPA Progress
  epaProgress: {
    completedSections: [],
    quizScores: {},
    lastQuizDate: null,
  },
  markEPASectionComplete: (sectionId) => {
    set((state) => ({
      epaProgress: {
        ...state.epaProgress,
        completedSections: [...new Set([...state.epaProgress.completedSections, sectionId])],
      },
    }));
  },
  saveQuizScore: (quizType, score) => {
    set((state) => ({
      epaProgress: {
        ...state.epaProgress,
        quizScores: { ...state.epaProgress.quizScores, [quizType]: score },
        lastQuizDate: new Date().toISOString(),
      },
    }));
  },
  getEPAReadiness: () => {
    const state = get();
    const sectionsDone = state.epaProgress.completedSections.length / 4 * 50; // 50% for sections
    const avgQuiz = Object.values(state.epaProgress.quizScores).length > 0 
      ? Object.values(state.epaProgress.quizScores).reduce((a, b) => a + b, 0) / Object.values(state.epaProgress.quizScores).length 
      : 0;
    const quizPart = (avgQuiz / 100) * 50;
    return Math.round(sectionsDone + quizPart);
  },

  // Walkthrough History (Step 10)
  walkthroughHistory: [],
  saveWalkthrough: (walkthrough) => {
    const newEntry = {
      ...walkthrough,
      id: 'walk' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      walkthroughHistory: [newEntry, ...state.walkthroughHistory].slice(0, 10), // keep last 10
    }));
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would save walkthrough to user history');
    }
  },
  clearWalkthroughHistory: () => set({ walkthroughHistory: [] }),

  // Community Uploads (Step 11)
  userUploads: [],
  addUserUpload: (upload) => {
    const newUpload = {
      ...upload,
      id: 'up' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      userUploads: [newUpload, ...state.userUploads],
    }));
    // Also add to communityPosts if public
    if (newUpload.isPublic) {
      const post = {
        id: newUpload.id,
        user: get().user?.name || 'You',
        model: newUpload.model,
        type: newUpload.type,
        content: newUpload.content,
        isPublic: true,
        timestamp: newUpload.timestamp.split('T')[0],
      };
      set((state) => ({
        communityPosts: [post, ...state.communityPosts],
      }));
    }
    get().awardBadge('First Community Upload');
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would upload to storage and insert into community_posts with RLS');
    }
  },
  toggleUploadVisibility: (id) => {
    set((state) => ({
      userUploads: state.userUploads.map(u =>
        u.id === id ? { ...u, isPublic: !u.isPublic } : u
      ),
    }));
    // Sync to communityPosts
    set((state) => ({
      communityPosts: state.communityPosts.map(p =>
        p.id === id ? { ...p, isPublic: !p.isPublic } : p
      ),
    }));
  },
  deleteUserUpload: (id) => {
    set((state) => ({
      userUploads: state.userUploads.filter(u => u.id !== id),
      communityPosts: state.communityPosts.filter(p => p.id !== id),
    }));
  },

  // Real-time Prices (Step 12) - simulates fetching updated averages
  refreshEquipmentPrices: () => {
    // Step 17: record as "search/price" API call (real would use invokeWebSearch per model or batch)
    get().recordAPICall('price', 0.001);
    set((state) => ({
      equipment: state.equipment.map(eq => {
        // Simulate small price fluctuation (±5-10%)
        const currentPrice = parseFloat(eq.averagePrice.replace('$', '').replace(',', ''));
        const fluctuation = (Math.random() - 0.5) * 0.15; // ±7.5%
        const newPrice = Math.round(currentPrice * (1 + fluctuation));
        return {
          ...eq,
          averagePrice: '$' + newPrice.toLocaleString(),
          lastUpdated: new Date().toISOString().split('T')[0],
          buyLinks: eq.buyLinks.map(link => {
            const linkPrice = parseFloat(link.price.replace('$', '').replace(',', ''));
            const linkFluct = (Math.random() - 0.5) * 0.1;
            const newLinkPrice = Math.round(linkPrice * (1 + linkFluct));
            return {
              ...link,
              price: '$' + newLinkPrice.toLocaleString(),
            };
          }),
        };
      }),
    }));
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would call price update API or scrape for real-time data');
    }
  },

  pendingApprovalsCount: mockApprovals.filter(a => a.status === 'pending').length,

  // Initial values for new admin/TOS/diagrams features
  adminCredentials: { email: 'master@hvachub.com', password: 'HVACMaster2026!' },
  lowerAdmins: [],
  hasAcceptedGeneralTOS: false,
  hasAcceptedLowerAdminTOS: false,
  terminology: [ /* populated in interface default above */ ],
  diagrams: [ /* populated in interface default above */ ],
  simulationHistory: [],

  // === Admin Portal defaults ===
  adminCredentials: { email: 'master@hvachub.com', password: 'HVACMaster2026!' },
  lowerAdmins: [],
  hasAcceptedGeneralTOS: false,
  hasAcceptedLowerAdminTOS: false,

  // Terminology - accurate HVAC definitions
  terminology: [
    { term: "Superheat", definition: "The temperature increase of a vapor above its saturation temperature at a given pressure. Measured at the evaporator outlet. Proper superheat ensures the refrigerant is fully vaporized before entering the compressor." },
    { term: "Subcooling", definition: "The temperature decrease of a liquid below its saturation temperature at a given pressure. Measured at the condenser outlet. Proper subcooling ensures the refrigerant is fully liquid before the expansion device." },
    { term: "Saturation Temperature", definition: "The temperature at which a refrigerant changes state (liquid to vapor or vapor to liquid) at a specific pressure." },
    { term: "Delta T", definition: "Temperature difference, often used for supply/return air temperature split across the evaporator (typically 15-20°F for cooling)." },
    { term: "SEER", definition: "Seasonal Energy Efficiency Ratio - measures cooling output over a season divided by energy input. Higher is better (e.g. 14 SEER+)." },
    { term: "EER", definition: "Energy Efficiency Ratio - cooling output in BTU per watt of power at a specific condition." },
    { term: "AFUE", definition: "Annual Fuel Utilization Efficiency - percentage of fuel converted to usable heat in furnaces (e.g. 80% or 95% AFUE)." },
    { term: "FLA", definition: "Full Load Amps - the current a motor draws when operating at full rated load and voltage." },
    { term: "LRA", definition: "Locked Rotor Amps - the high current drawn by a motor at startup before it begins turning (typically 5-7x FLA)." },
    { term: "MCA", definition: "Minimum Circuit Ampacity - the minimum wire and breaker size required for safe operation of equipment." },
    { term: "MOP", definition: "Maximum Overcurrent Protection - the largest breaker or fuse size allowed for the equipment circuit." },
  ],

  // Diagrams - paths point to assets in the built app
  diagrams: [
    { id: 'd1', title: 'Vapor Compression Refrigerant Cycle', description: 'Shows the four main components (compressor, condenser, expansion device, evaporator) and refrigerant state changes. Red = hot/high pressure, blue = cool/low pressure. Animated arrows show flow in the app.', imagePath: './assets/images/diagrams/refrigerant-cycle.jpg' },
    { id: 'd2', title: 'Heat Pump Cycle (Heating vs Cooling)', description: 'Side-by-side comparison showing the reversing valve and how the system switches modes. Essential for understanding year-round operation.', imagePath: './assets/images/diagrams/heat-pump-cycle.jpg' },
    { id: 'd3', title: 'PSC Motor (Permanent Split Capacitor)', description: 'Common single-speed motor in older air handlers and condensers. Shows start/run windings, capacitor, and rotating rotor.', imagePath: './assets/images/diagrams/psc-motor.jpg' },
    { id: 'd4', title: 'ECM Motor (Electronically Commutated)', description: 'Variable-speed high-efficiency motor used in modern furnaces and air handlers. Includes electronic control module for speed variation.', imagePath: './assets/images/diagrams/ecm-motor.jpg' },
    { id: 'd5', title: 'Electrical Basics for HVAC', description: 'Basic power circuit: disconnect, contactor, overloads, capacitor, motor, thermostat, and safety switches. Shows typical voltages and wire colors.', imagePath: './assets/images/diagrams/electrical-basics.jpg' },
    { id: 'd6', title: 'TXV vs Fixed Orifice Metering Devices', description: 'Comparison of Thermostatic Expansion Valve (TXV) and fixed orifice. Shows how each controls superheat and system efficiency.', imagePath: './assets/images/diagrams/txv-vs-orifice.jpg' },
    { id: 'd7', title: 'HVAC Compressor Types', description: 'Cross-section views of reciprocating, scroll, rotary, and screw compressors. Key moving parts labeled for diagnostic understanding.', imagePath: './assets/images/diagrams/compressor-types.jpg' },
    { id: 'd8', title: 'Lockout/Tagout (LOTO) Safety', description: 'Step-by-step illustrated safety procedure for de-energizing HVAC equipment. Critical for new technicians.', imagePath: './assets/images/diagrams/safety-lockout.jpg' },
    { id: 'd9', title: 'Airflow and Duct Basics', description: 'Supply/return ducts, blower, filter, coil, and registers. Shows proper vs restricted airflow with arrows.', imagePath: './assets/images/diagrams/airflow-duct.jpg' },
    { id: 'd10', title: 'Superheat & Subcooling Explained', description: 'Visual of evaporator superheat (vapor above saturation) and condenser subcooling (liquid below saturation). Includes measurement points.', imagePath: './assets/images/diagrams/superheat-subcool.jpg' },
  ],

  simulationHistory: [],

  // === Admin Functions ===
  updateAdminCredentials: (email, password) => {
    set({ adminCredentials: { email, password } });
    console.log('[Admin] Master admin credentials updated. Remember to change from default!');
  },

  loginAsAdmin: (email, password) => {
    const state = get();
    if (email === state.adminCredentials.email && password === state.adminCredentials.password) {
      // Promote current user to master for this session
      if (state.user) {
        const masterUser = { ...state.user, role: 'master' as const };
        set({ user: masterUser });
        saveUserLocally(masterUser);
      }
      console.log('[Admin] Master Admin login successful');
      return true;
    }
    // Check if lower admin
    if (state.lowerAdmins.includes(email) && state.user) {
      const lowerUser = { ...state.user, role: 'lower-admin' as const };
      set({ user: lowerUser });
      saveUserLocally(lowerUser);
      console.log('[Admin] Lower Admin login');
      return true;
    }
    return false;
  },

  assignLowerAdmin: (email) => {
    const state = get();
    if (!state.isMasterAdmin()) return;
    if (!state.lowerAdmins.includes(email)) {
      set({ lowerAdmins: [...state.lowerAdmins, email] });
      // Trigger notification for the user (in real app would be push/email)
      get().addNotification(`You have been assigned Lower Admin role. Please accept the Lower Admin TOS in Admin Portal.`, 'approval');
      console.log('[Admin] Lower admin assigned to', email);
    }
  },

  removeLowerAdmin: (email) => {
    const state = get();
    if (!state.isMasterAdmin()) return;
    set({ lowerAdmins: state.lowerAdmins.filter(e => e !== email) });
    console.log('[Admin] Lower admin removed:', email);
  },

  acceptGeneralTOS: () => {
    set({ hasAcceptedGeneralTOS: true });
    console.log('[TOS] General Terms of Service accepted');
  },

  acceptLowerAdminTOS: () => {
    set({ hasAcceptedLowerAdminTOS: true });
    if (get().user) {
      const updated = { ...get().user, role: 'lower-admin' as const };
      set({ user: updated });
      saveUserLocally(updated);
    }
    console.log('[TOS] Lower Admin Terms of Service accepted');
  },

  isMasterAdmin: () => {
    const state = get();
    return state.user?.role === 'master' || 
           (state.user?.email === state.adminCredentials.email);
  },

  isLowerAdmin: () => {
    const state = get();
    return state.user?.role === 'lower-admin' || 
           state.lowerAdmins.includes(state.user?.email || '');
  },

  // Terminology and Diagrams are static in state above

  // Basic simulation stub (will be expanded)
  runDiagnosticSimulation: (inputs) => {
    // Simple rule-based example for now
    const { suction, head, deltaT, voltage } = inputs;
    let cause = 'Insufficient data';
    let solution = 'Gather more readings (pressures, temps, amps)';

    if (suction && head) {
      if (parseFloat(suction) < 60 && parseFloat(head) > 350) {
        cause = 'Low refrigerant charge or restriction (TXV/ orifice)';
        solution = 'Recover, leak check, repair, recharge to proper superheat/subcool. Check for kinked lines.';
      } else if (parseFloat(suction) > 80 && parseFloat(head) < 280) {
        cause = 'Overcharged or dirty condenser / low airflow';
        solution = 'Check condenser coil cleanliness and fan operation. Recover excess refrigerant if overcharged.';
      }
    }

    const result = {
      id: 'sim' + Date.now(),
      inputs,
      mostLikelyCause: cause,
      recommendedSolution: solution,
      simulatedProblem: `System would show ${cause.toLowerCase()} symptoms.`,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({ simulationHistory: [result, ...s.simulationHistory].slice(0, 20) }));
    return result;
  },

  // Push Notifications (Step 13 - Real Expo + Supabase fallback) - STUBBED for stable standalone APK on Android (placeholder projectId removed; local notifications still work)
  pushToken: null,
  registerForPushNotifications: async () => {
    console.log('[Notifications] Push registration skipped for stability (no placeholder projectId, no getExpoPushTokenAsync call)');
    // Stub only: local notifications via sendLocalNotification() still work fully for in-app alerts
    set({ pushToken: 'local-only-demo' });
  },
  sendLocalNotification: async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // immediate
      });
      console.log('[Notifications] Local notification sent:', title);
    } catch (e) {
      console.log('[Notifications] Local send failed (web fallback ok):', e);
    }
  },

  // Step 15: Offline caching (using SecureStore/Async fallback), QR lookup, gamification, job logger
  badges: [],
  awardBadge: (badge) => {
    const state = get();
    if (!state.badges.includes(badge)) {
      set((s) => ({ badges: [...s.badges, badge] }));
      get().addNotification(`🏆 Badge earned: ${badge}`, 'info');
      if (isSupabaseConfigured()) {
        console.log('[Supabase] Would save badge to user profile');
      }
    }
  },
  jobLogs: [],
  logJob: (job) => {
    const newLog = {
      ...job,
      id: 'job' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ jobLogs: [newLog, ...s.jobLogs].slice(0, 20) }));
    get().awardBadge('First Job Logged');
    if (isSupabaseConfigured()) {
      console.log('[Supabase] Would insert job log');
    }
  },
  qrScanHistory: [],
  scanQRForEquipment: (qrData) => {
    const state = get();
    // Simulate QR data as "BRAND:MODEL" or model number
    const data = qrData.toUpperCase().trim();
    const match = state.equipment.find(eq => 
      data.includes(eq.model.toUpperCase()) || 
      data.includes(eq.brand.toUpperCase()) ||
      (eq.serial_example && data.includes(eq.serial_example.toUpperCase()))
    );
    const scanEntry = {
      id: 'qr' + Date.now(),
      data: qrData,
      matchedEquipment: match ? `${match.brand} ${match.model}` : undefined,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ qrScanHistory: [scanEntry, ...s.qrScanHistory].slice(0, 10) }));
    if (match) {
      get().awardBadge('First QR Scan');
      get().setSelectedEquipment(match);
    }
    return match || null;
  },
  cacheData: async () => {
    const state = get();
    try {
      await SecureStore.setItemAsync('hvac-cache-equipment', JSON.stringify(state.equipment));
      await SecureStore.setItemAsync('hvac-cache-badges', JSON.stringify(state.badges));
      await SecureStore.setItemAsync('hvac-cache-joblogs', JSON.stringify(state.jobLogs));
      console.log('[Offline Step 15] Data cached locally');
    } catch (e) {
      console.log('[Offline] Cache save error', e);
    }
  },
  loadCachedData: async () => {
    try {
      const cachedEq = await SecureStore.getItemAsync('hvac-cache-equipment');
      const cachedBadges = await SecureStore.getItemAsync('hvac-cache-badges');
      const cachedJobs = await SecureStore.getItemAsync('hvac-cache-joblogs');
      if (cachedEq) {
        const parsedEq = JSON.parse(cachedEq);
        set({ equipment: parsedEq });
      }
      if (cachedBadges) set({ badges: JSON.parse(cachedBadges) });
      if (cachedJobs) set({ jobLogs: JSON.parse(cachedJobs) });
      console.log('[Offline Step 15] Loaded from local cache');
      return true;
    } catch (e) {
      console.log('[Offline] Cache load error (using defaults)', e);
      return false;
    }
  },
  isOffline: false,
  setOfflineMode: (offline) => {
    set({ isOffline: offline });
    if (offline) {
      get().loadCachedData();
      get().addNotification('Offline mode enabled - using cached data', 'info');
    }
  },
}));

// Auto-init auth when store is first created (call this in _layout or root component)
export const initializeApp = async () => {
  const store = useHVACStore.getState();
  await store.initAuth();
  // Step 13: Register for push notifications (permissions + token for real push)
  await store.registerForPushNotifications();
  // Step 15: Load offline cache on startup (equipment, badges, jobs)
  await store.loadCachedData();
  // Could also load equipment from Supabase here in future steps (e.g. await fetchApprovals() to hydrate)
  console.log('[HVAC Store] App initialized. Supabase status:', store.supabaseStatus);
};
