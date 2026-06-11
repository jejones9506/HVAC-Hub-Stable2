// HVAC Hub - Supabase Client Setup (Step 2 + Step 17 Backend Hardening)
// This prepares for real Supabase integration (PostgreSQL, Auth with Google OAuth, Storage, Realtime, Edge Functions).
// Step 17: AI calls moved to secure Edge Functions (ai-chat, search-web); full schema + RLS in supabase/schema.sql;
// real Google OAuth + storage policies documented; rate limiting + costs monitoring hooks added.
// In production: Create Supabase project, set EXPO_PUBLIC_SUPABASE_* in .env, deploy Edges, set secrets (OPENAI etc in Edge env).
// Client always falls back to simulation if !isSupabaseConfigured() or Edge not deployed / errors.
// All prior simulation paths preserved. Real flows activate with keys + tables created from schema.sql.

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure storage adapter for Supabase session persistence (recommended for mobile)
// Falls back to memory/localStorage on web for static export compatibility
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Placeholder values - REPLACE WITH YOUR SUPABASE PROJECT CREDENTIALS
// Get from: Supabase Dashboard > Project Settings > API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY-HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile / Expo
  },
});

// Helper: Check if real Supabase is configured (not placeholders)
export const isSupabaseConfigured = () => {
  return !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');
};

// Helper to get current session (used in auth flows)
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Google Sign-In via Supabase OAuth (works on web + mobile with proper setup)
// For mobile: Requires additional config in app.json (expo-auth-session) and Supabase redirect URLs.
// In Step 2 we attempt real flow if configured, otherwise fall back gracefully.
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Not configured - using mock sign-in');
    return { user: null, error: 'Supabase not configured yet. Using mock for now.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'hvachub://auth/callback', // Custom scheme from app.json
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    if (error) throw error;
    // Note: For OAuth, the actual user object comes after redirect + getSession.
    // We return the provider info here; real user is handled in the store's init/signIn logic.
    return { user: null, error: null, url: data?.url };
  } catch (error: any) {
    console.error('[Supabase] Google sign-in error:', error);
    return { user: null, error: error.message || 'Sign-in failed' };
  }
};

// Sign out
export const signOut = async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  // Always clear local secure storage too
  await SecureStore.deleteItemAsync('hvac-user');
  return { success: true };
};

// Example: Fetch user profile from Supabase (table: profiles)
// Will be used in future steps for real DB sync
export const fetchUserProfile = async (userId: string) => {
  if (!isSupabaseConfigured()) {
    return null; // Use local mock
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.log('[Supabase] Profile fetch error (expected if table not created):', error.message);
    return null;
  }
  return data;
};

// Example: Upsert profile (for saving user prefs, location, EPA status)
export const upsertUserProfile = async (profile: any) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Mock upsert - data would be saved to Supabase profiles table');
    return profile;
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('[Supabase] Profile upsert error:', error);
    throw error;
  }
  return data;
};

// Step 14: AI chat summaries + feedback can be stored in ai_prefs.chatSummary or separate user_interactions table (JSONB for summaries, ratings).
// On upsert, ai_prefs includes chatSummary for dynamic system prompts in real LLM calls (Edge Function).
// Feedback loop: Store recent feedback in profile or interactions for auto-adaptation.

// Equipment DB sync (Step 3+)
export const fetchEquipment = async () => {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('equipment').select('*').order('brand');
  if (error) {
    console.log('[Supabase] Equipment fetch (table may not exist yet):', error.message);
    return null;
  }
  return data;
};

export const insertEquipment = async (equipment: any) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Would insert new equipment into public equipment table');
    return equipment;
  }
  const { data, error } = await supabase.from('equipment').insert(equipment).select().single();
  if (error) throw error;
  return data;
};

// Step 13: Admin Approvals Queue (real Supabase-backed)
// Table: approvals_queue
// Columns: id (uuid pk), suggested_by (text or user_id), suggested_by_id, data_type, summary, details (text), 
//          suggested_data (jsonb), existing_id (text), status (text: pending/approved/rejected), 
//          admin_notes (text), timestamp (timestamptz), user_id (for RLS)
// RLS policies (create in Supabase SQL editor):
//   - Users can INSERT their own suggestions (auth.uid() = user_id)
//   - Public/approved read for everyone (status = 'approved' or for admins)
//   - Lower/master admins (role check via profiles join or separate) can SELECT/UPDATE all pending
//   - On approve: Edge Function or trigger to INSERT into equipment/sds + notify via realtime/push
// Realtime: subscribe to 'approvals_queue' changes for live admin queue updates.
// Email: Use Supabase Edge Functions + Resend/SendGrid or built-in if configured.
export const fetchApprovals = async () => {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('approvals_queue')
    .select('*')
    .eq('status', 'pending')
    .order('timestamp', { ascending: false });
  if (error) {
    console.log('[Supabase] Approvals fetch (table may not exist yet):', error.message);
    return null;
  }
  return data;
};

export const insertApproval = async (approval: any) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Would insert into approvals_queue (with RLS for user ownership)');
    return approval;
  }
  const { data, error } = await supabase.from('approvals_queue').insert({
    ...approval,
    user_id: approval.suggestedById || 'anonymous', // link to auth.users
    timestamp: approval.timestamp || new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
};

export const updateApprovalStatus = async (id: string, status: 'approved' | 'rejected', adminNotes?: string) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Would UPDATE approvals_queue status + admin_notes, then notify suggester');
    return { id, status, adminNotes };
  }
  const { data, error } = await supabase
    .from('approvals_queue')
    .update({ 
      status, 
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================
// Step 17: Backend Hardening - Edge Function Invokers (secure AI + Search)
// ============================================
// These call Supabase Edge Functions (deploy from supabase/functions/)
// Keys (OpenAI, SerpAPI etc) live ONLY in Edge secrets (Deno.env) - never in client.
// Always fallback to client mocks if !configured, Edge fails, or not deployed.
// Rate limiting: Can be enforced in Edge (per user via auth.uid()).
// Costs: Edge returns usage; client also tracks approx for UI.

export const invokeAIChat = async (query: string, userPrefs?: any, context?: any, history?: any[]) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase Edge] Not configured - falling back to client simulation for AI chat');
    return null;
  }
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { query, userPrefs, context, history: history || [] },
    });
    if (error) throw error;
    console.log('[Supabase Edge] ai-chat invoked successfully (real LLM path if secrets set)');
    return data;
  } catch (error: any) {
    console.log('[Supabase Edge] ai-chat invoke failed (Edge not deployed or runtime error):', error.message || error);
    return null; // graceful fallback
  }
};

export const invokeWebSearch = async (query: string, type: string = 'general', location?: string) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase Edge] Not configured - falling back to client simulation for web/SDS/price search');
    return null;
  }
  try {
    const { data, error } = await supabase.functions.invoke('search-web', {
      body: { query, type, location },
    });
    if (error) throw error;
    console.log('[Supabase Edge] search-web invoked (real search if SERP/BRAVE secret set)');
    return data;
  } catch (error: any) {
    console.log('[Supabase Edge] search-web invoke failed:', error.message || error);
    return null;
  }
};

// Optional: Invoke notify (for future remote push after approve)
export const invokeNotifyApproval = async (payload: any) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('notify-approval', { body: payload });
    if (error) throw error;
    return data;
  } catch (e) {
    console.log('[Supabase Edge] notify-approval would be called here for real remote pushes');
    return null;
  }
};

// ============================================
// Step 17: Storage helpers (public/private uploads, community media)
// RLS policies documented in supabase/schema.sql and Supabase Dashboard > Storage
export const uploadFileToStorage = async (bucket: string, path: string, file: Blob | File | any, isPublic: boolean = false) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Mock storage upload (would go to bucket ' + bucket + ' at ' + path + ', isPublic=' + isPublic + ')');
    return { path, fullUrl: 'mock://storage/' + path, publicUrl: isPublic ? 'https://mock-cdn/' + path : null };
  }
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) {
    console.error('[Supabase Storage] Upload error:', error);
    throw error;
  }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path: data?.path, fullUrl: urlData?.publicUrl, publicUrl: isPublic ? urlData?.publicUrl : null };
};

export const deleteFileFromStorage = async (bucket: string, path: string) => {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Would delete storage file:', path);
    return { success: true };
  }
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return { success: true };
};

// ============================================
// Step 17: Rate limiting + costs monitoring helpers (client-side throttle + usage)
// Real enforcement + billing in Edge + Supabase/LLM dashboards. Client shows for UX.
export const checkRateLimit = (recentCalls: number, limit = 10, windowMin = 1) => {
  // Simple client throttle example (Edge will have stronger per-auth)
  if (recentCalls > limit) {
    return { allowed: false, wait: windowMin * 60, message: `Rate limit: too many calls (${recentCalls}). Wait ${windowMin} min or use cached.` };
  }
  return { allowed: true };
};

// Note: Full schema + RLS now in supabase/schema.sql (profiles, equipment, approvals_queue, community_posts, sds_chemicals, history tables, storage policies).
// Google OAuth: Already wired; configure provider + redirects in Supabase Auth dashboard + app.json scheme.
// Realtime: Subscribe in client for approvals/equipment updates when configured.
// API rate limiting: Edge + this client helper.
// Costs monitoring: See store apiUsage + Profile UI; real in Supabase Usage + provider dashboards (OpenAI etc).
// For SDS/prices: Use invokeWebSearch + public scrapes/official APIs in Edge.

console.log('[Supabase] Client initialized (Step 17 hardened). Configured:', isSupabaseConfigured() ? 'YES (real backend + Edges ready)' : 'NO (mock mode - add keys to .env + deploy Edges from supabase/functions/)');
