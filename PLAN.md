# HVAC Hub App - Comprehensive Development Plan

## Project Overview
HVAC Hub is a cross-platform mobile app (iOS and Android) designed as a central hub for HVAC technicians. It provides:
- Comprehensive equipment and materials database (organized by brand, model, electrical data, capacities, refrigerants, etc.).
- Manuals, submittals, brochures, photos, parts lists, catalogs.
- AI-powered chatbot (text + voice) with internet access for real-time info lookup.
- AI data contribution workflow: Search internet → Verify with user → Notify admins (lower/master) → Approval → Add to shared database.
- All database info public to all users.
- Advanced calculators: Electrical (Ohm's Law, voltage drop, conduit bend/fill, etc.), ductulators, refrigerant PT charts, chemical info.
- Safety Data Sheets (SDS) with AI-assisted population (no duplicates).
- Adaptive AI: Learns user personality/preferences from interactions, saves per-user profiles, matches speaking style, customizable by user (or disable learning).
- EPA 608 Universal Certification study guide: Full content for Core + Type I, II, III; practice tests (multiple choice, scenarios); text-based and audio study guides.
- Interactive walkthroughs/diagnostics: User inputs job type, unit details (model/serial/electrical), precise location → Generates code-compliant (local electrical, NFPA, duct, thermostat, brazing, etc.) step-by-step procedures, tools/materials list, PPE requirements.
- User profiles: Manual input or Google Sign-In; link external accounts (YouTube, etc.).
- Community uploads: Notes, photos, videos, tips (public/private). Public uploads searchable in "Notes/Community" section per equipment model.
- Calculators provide recommendations based on inputs + local codes (user location or zip input).
- Real-time accurate: Average prices, purchase links (via affiliate/search APIs or web links; initially mocked, later live).
- Additional improvements (to be added progressively): QR scanner for models, offline mode, diagnostic flowcharts, job logger, gamification/badges for apprentices, forum per model, inventory tracker, multi-language, accessibility features, AR overlay hints (future), compliance checklists.

**Target Platforms**: iOS, Android (via React Native + Expo for easy builds and web preview). PWA/web version for desktop too.

**Key Principles**:
- User-friendly for apprentices to master techs.
- Accurate, verified data (AI + human admin approval loop).
- Privacy: Uploads public/private; user data controlled.
- Scalable: Start with mocks, seed real data gradually using AI/tools.
- Legal: Use public info, official links, citations; no hosting copyrighted full manuals unless permitted.
- Real-time: Leverage APIs for search, prices (e.g., integrate web search, Google Shopping via API, manufacturer sites).
- AI Capabilities: Powered by LLM (e.g., OpenAI GPT-4o or equivalent). Backend or client function calling for web search (use tools like SerpAPI, or built-in browsing if available). Personality via per-user system prompts + conversation summaries stored in DB. User controls: "Talk like a [style]" or toggle adaptive learning.

**Tech Stack (Chosen for Speed, Scalability, Cross-Platform)**:
- **Frontend/Mobile**: React Native with Expo SDK (~56+). Expo Router for navigation. NativeWind (Tailwind CSS for RN) for styling. Zustand or React Query for state. 
- **Backend/DB/Auth/Storage**: Supabase (PostgreSQL, Row Level Security, Google OAuth, Realtime subscriptions, Storage buckets for uploads/photos/videos, Edge Functions for server-side logic like AI proxy, notifications).
- **AI/Chatbot**: OpenAI API (or Grok/Claude via API) with function calling for search/verification. For voice: expo-speech (TTS), @react-native-voice/voice or expo-speech-recognition (STT). Adaptive via dynamic system prompts based on user profile (style, expertise level, preferred tone).
- **Notifications/Admin Approvals**: Expo Notifications + Supabase (or push via Supabase). Admin dashboard (web or in-app with role checks).
- **Calculators/Tools**: Pure JS/TS functions + React components. For local codes: User inputs zip/city/state → Map to known rules (hardcoded US-centric initially, expand).
- **Data Seeding/Population**: Use app's AI + admin tools + user uploads. For initial data: Hardcode popular items (Carrier, Trane, Lennox, etc.); use tools like web_search/fetch during dev.
- **Other**: 
  - Offline: AsyncStorage + Supabase sync + SQLite (expo-sqlite) for caching.
  - Real-time prices/links: Mock initially; integrate free/paid APIs (e.g., SerpAPI for search, or affiliate links).
  - Voice: Optional, toggleable.
  - Security: Supabase RLS; API keys user-provided or env for dev.
  - Testing: Jest, manual on simulators/devices. Accessibility (VoiceOver/TalkBack).

**Data Model (High-Level, to be refined in Supabase)**:
- Users: id, name, role (apprentice/tech/master/admin), location (zip, city, state for codes), prefs (ai_personality: {style, tone, expertise}, learning_enabled: bool), linked_accounts, certs (e.g., EPA status).
- Equipment: id, brand, model, serial_example, type (furnace, AC, heat pump, etc.), electrical (voltage, amps, etc.), capacities (tonnage, BTU), refrigerants, specs (JSON), manuals (links/Storage URLs), submittals, photos, parts_catalog (array), average_price, buy_links (array of {vendor, url, price}).
- Materials: id, type (wire, pipe, fittings), specs, SDS (links), prices.
- Refrigerants: name, pt_chart (table data), composition, properties, SDS.
- SDS_Chemicals: name, hazards, handling, full_sds_url or text, source.
- CommunityPosts: user_id, equipment_id or model, type (note/photo/video), content, is_public, location, timestamp.
- ApprovalsQueue: id, suggested_data (JSON), source (AI or user), user_id, status (pending/approved/rejected), admin_notes.
- EPAContent: sections (core, type1,...), quizzes (questions/answers), audio_transcripts.
- UserInteractions: For AI learning - summaries of convos, feedback on personality.
- CalculatorsHistory: optional logging.

**AI Workflow Details**:
1. User asks in chat (text/voice).
2. AI checks local DB first (via Supabase query or vector search if implemented).
3. If not found or incomplete: Use web_search / fetch_page (via backend Edge Function or client + proxy to avoid CORS).
4. Present info to user with sources + "Is this correct? Confirm to submit for review".
5. If yes: Create entry in ApprovalsQueue, notify admins (push + in-app or email via Supabase).
6. Admin reviews/approves via special screen (role-gated).
7. On approve: AI or function inserts into main tables (Equipment/Materials/SDS/etc.), notifies user.
8. Dupe check: Fuzzy match on brand/model/chemical name before insert.
9. Personality: After each chat, summarize key traits (e.g., "User prefers concise answers, technical jargon, casual tone"). Store in user profile. Next chat: Inject "You are talking to [User]. Match this style: [summary]. User is [level]."
   - User commands: "Talk more like a friendly mentor", "Disable learning", "Reset personality".
   - Saved automatically per user.

**Local Codes & Recommendations**:
- User profile has default location.
- For walkthrough/calculator: Parse location → Apply rules (e.g., if CA: Title 24; general NEC, ASHRAE, NFPA 90A/B for ducts, EPA 608 for refrigerants, local amendments).
- Data source: Hardcoded rules table + AI lookup for specifics.

**Walkthrough Generation**:
- Input form: Job type (install/repair/diag/replace), Unit type/model/serial/electrical, Location (address/zip or "use profile"), Materials.
- Output: 
  - PPE list (safety glasses, gloves, etc. based on refrigerants/electrical).
  - Tools needed.
  - Step-by-step (numbered, with warnings, code refs).
  - Materials list with prices/links.
  - Code compliance notes.
- Use templates + AI to customize based on inputs + DB lookup for model-specific.

**EPA Study Guide**:
- Structured content (text/markdown) for each section.
- Practice tests: 20-50 questions per type, randomized, scoring, explanations.
- Audio: Use TTS to read sections or pre-recorded (but TTS for start).
- Progress tracking per user.

## Phased Step-by-Step Plan
We will build incrementally, ensuring each step produces a **working, runnable app** (expo start works, basic functionality). After each step:
- Update this PLAN.md (if needed) and PROGRESS.md.
- Package the entire project (excluding node_modules, .git, builds) into a downloadable archive (e.g., hvac-hub-stepN.tar.gz or .zip).
- In response: Provide summary of what was done, current progress vs plan, instructions to "upload" (copy files or use the archive in new workspace), how to run/test.
- Ask user: "Do you want me to proceed to Step N+1?"

**Total Estimated Steps: 15-20** (adjust based on feedback). Focus on MVP first (core DB, AI basic, calculators, EPA basic, walkthroughs), then enhancements, polish, real integrations, data seeding, deployment.

### Phase 1: Foundation (Steps 1-4)
**Step 1: Project Setup, Planning, Core Navigation & Placeholder UI**
- Initialize Expo project (completed).
- Create detailed PLAN.md (this file) and PROGRESS.md.
- Update branding: App name "HVAC Hub", icons/descriptions, colors (professional blues/grays for HVAC/tech feel).
- Implement 6-tab navigation using Expo Router + NativeTabs (or upgrade to custom bottom nav if needed):
  1. Home/Dashboard
  2. Equipment Hub (search + categories)
  3. Calculators & Tools
  4. AI Assistant
  5. EPA Study & Guides
  6. Profile & Community
- Create placeholder screens for each tab with:
  - Basic layouts, themed components.
  - Mock data displays (e.g., 5-10 fake equipment entries, list of calculator types, chat bubbles, EPA sections, profile form).
  - Navigation between sections (buttons, modals for details).
  - Search bars (non-functional yet).
- Add initial constants: brands, equipment types, refrigerant list, calculator definitions, SDS examples, EPA outline.
- Setup basic state (Zustand or Context for user mock, current location).
- Ensure runs on web (primary for dev), iOS/Android sims.
- Add simple "Run Calculators" stubs that compute basic values (e.g., Ohm's Law).
- Document how to continue (this plan).
- **Deliverable**: Working app with navigation and stubs. ZIP archive.

**Step 2: Authentication, User Profiles, Supabase Setup (Mock + Real Prep)**
- Integrate Supabase: Install packages, setup client (use anon key for now; user to provide keys).
- Implement Google Sign-In (expo-auth-session or Supabase OAuth).
- Profile screen: Create/edit profile (name, location/zip for codes, role, EPA cert status, AI prefs toggle).
- Mock "sign in with Google" that populates sample user.
- Basic user context/provider across app.
- Start DB schema: Create tables in Supabase (or local JSON mock + plan for migration).
- Add user-specific data persistence (AsyncStorage fallback).

**Step 3: Equipment Database Structure & Basic Search/Browse**
- Define full TypeScript interfaces for data models.
- Mock in-memory DB or local JSON files with 20+ realistic entries (various brands: Carrier, Trane, Goodman, Lennox; models with full specs: electrical, capacities, refrigerants, prices, buy links (fake Amazon/etc)).
- Implement searchable list in Equipment Hub: Filter by brand, type, model, refrigerant.
- Detail view: Card with all categorized info (tabs or sections for electrical, capacities, manuals (links), photos (placeholders), parts).
- Add "Add to favorites" or notes.
- Basic upload stub for community notes on equipment.

**Step 4: Core Calculators Implementation**
- Implement 5+ calculators as interactive screens/modals:
  - Ohm's Law (V=IR, power).
  - Voltage Drop (for wire size/length).
  - Conduit Bend (offsets, kicks; with diagrams if possible).
  - Conduit Fill (NEC tables).
  - Ductulator basics (CFM, velocity, friction rate → duct size).
  - Refrigerant PT lookup (table + calculator for superheat/subcool).
- Each: Inputs, calculate button, results + "recommended actions" based on mock rules + user location.
- Add more: Wire size selector, pipe sizing.
- Store history in user profile (mock).

### Phase 2: AI Chatbot Core (Steps 5-7)
**Step 5: Basic AI Chat Interface & Text Chatbot**
- Build full chat UI: Messages list (user/AI bubbles), input, send, clear, history.
- Integrate simple LLM: For now, use mock responses or fetch to a free API; plan for OpenAI (user enters API key in settings or env).
- Basic system prompt for HVAC expert.
- Mock "internet search": Button or auto that "searches" and returns sample data.
- User verification flow: After AI response with new info, show "Verify & Submit for Approval?" → On confirm, add to mock ApprovalsQueue, "notify admins" (console log + toast + admin screen badge).
- Admin mock: In profile or new tab (if role=admin), view queue, approve (moves to main DB).

**Step 6: Voice Communication + Basic Personality Adaptation**
- Add expo-speech for TTS (read AI responses aloud, toggle).
- Add speech-to-text (install voice lib; web fallback to browser SpeechRecognition).
- Voice mode toggle in chat (mic button, speak, transcribe, send).
- User profile prefs: Initial personality settings (e.g., sliders for formality, detail level; or presets: "Mentor", "Concise Tech", "Apprentice Friendly").
- Basic learning: After chat, simple analysis (hardcoded or prompt LLM to summarize "user likes X"), save to profile, inject in next system prompt.
- User commands in chat: e.g., type "/style casual mentor" or settings page to customize/disable.

**Step 7: Advanced AI Features - Internet Access, Approval Flow, Learning Polish**
- Full integration: Use web_search-like (implement via Edge Function or client fetch to public search API; or OpenAI with tools if possible).
- Real dupe check, structured data extraction from AI responses.
- Notifications simulation (in-app bell icon for approvals).
- Per-user saved personalities applied automatically.
- AI can suggest walkthroughs or pull from DB.
- Test with real queries (e.g., "info on Carrier 24ANB1 model").

### Phase 3: Specialized Features (Steps 8-11)
**Step 8: Refrigerants, PT Charts, SDS Section**
- Refrigerant database: 10+ common (R-410A, R-22, R-32, R-454B, etc.) with full PT tables (pressure/temp), composition, GWP/ODP, properties.
- Interactive PT chart (table + graph if possible with reanimated or chart lib).
- SDS Hub: Search chemicals/products. AI-assisted: If not in DB, "search web for SDS" → Present → User confirm → Submit for admin approval → Add structured (hazards, first aid, PPE, etc.).
- No dupes logic.
- Links to official SDS PDFs (OSHA, manufacturer).

**Step 9: EPA 608 Study Guide Full Implementation**
- Content: Detailed text for Core (safety, regs), Type I (small appliances), Type II (high pressure), Type III (low pressure).
- Practice Tests: Multiple quizzes (20+ questions each), randomized, immediate feedback, explanations, score tracking, retake.
- Study Modes: Text sections (expandable), Audio mode (TTS read-aloud with controls, or sections).
- Progress: Per-section completion, overall readiness score.
- Certification prep tips, links to official EPA.

**Step 10: Interactive Walkthroughs & Job Assistant**
- Dedicated "Job Assistant" or integrated in AI/Home: Multi-step form (wizard):
  1. Job type (Install new / Repair / Diagnostic / Replace / Maintenance).
  2. Unit details (type, brand/model/serial if known, electrical data, refrigerant, capacity).
  3. Location (zip code or select state/city; auto from profile).
  4. Materials being used / symptoms.
  5. Additional notes.
- Generate (using templates + AI or rule-based + LLM):
  - Required PPE (specific to job/refrigerant/electrical).
  - Tools list (with why).
  - Materials/parts list + estimated prices + buy links.
  - Step-by-step procedure (detailed, numbered, with warnings, code citations e.g. "Per NEC 440...", "Follow manufacturer submittal for this model").
  - Local code notes (e.g., "In California, ensure Title 24 compliance for efficiency").
  - Diagnostic tips if repair.
- Save generated walkthroughs to user history or community (optional public).
- Model-specific: If model in DB, pull exact test procedures.

**Step 11: Community Uploads & Notes Section**
- Upload flow: In Equipment detail or dedicated "Share Knowledge" – photo/video (using expo-image-picker, expo-av), note text, tag to model/brand/job type.
- Visibility toggle: Public / Private (only me).
- Storage in Supabase.
- Browse: In Equipment Hub or separate "Community Notes" tab/section – filterable by model, searchable. Public posts shown with user attribution (anonymous option?).
- Like/comment stubs (future real-time).
- My Uploads in Profile.

### Phase 4: Integrations, Polish, Advanced & Deployment (Steps 12-18+)
**Step 12: Real Data Population, Prices & Links**
- Seed DB with real-ish data for top 20-30 models (use knowledge + tools like web_search during dev to fetch accurate specs/prices from public sites like manufacturer PDFs summaries).
- Implement price fetching: Mock API or integrate simple search; display "Avg. $X (as of today)" + "Buy on [Amazon/Home Depot]" links (deep links or web).
- Update all lists dynamically where possible.
- Admin tools for bulk import.

**Step 13: Admin Approval System & Notifications (Real)**
- Role-based UI (if admin, show "Approvals" tab or section).
- Full queue: List pending suggestions with diff view (old vs new data).
- Approve/Reject with notes → Update DB, notify original user.
- Push notifications setup (Expo + Supabase or OneSignal free tier).
- Email notifications via Supabase if configured.

**Step 14: Advanced AI & Personalization Polish**
- Deep learning: Store chat summaries, user feedback ("Was this helpful? Rate personality").
- Auto-adapt: Update prompt dynamically.
- Full user control panel for AI: Edit personality description, turn off, reset, export history.
- Better search integration: AI can call "search web for [query]" function explicitly.
- Voice improvements, multi-turn context.

**Step 15: Offline Support, QR Scanner, Extras**
- Offline caching for DB content, calculators (always work).
- QR code scanner (expo-camera or barcodescanner) to lookup model/serial from labels.
- Additional calculators: More electrical (transformer sizing, motor FLA), airflow, etc.
- Diagnostic wizards (interactive decision trees).
- Gamification: Badges (e.g., "EPA Certified", "First Upload", streak for daily use).
- Job logger: Record completed jobs with photos/notes linked to equipment.

**Step 16: Performance, Accessibility, UX Polish**
- Loading states, error handling, empty states.
- Accessibility: Labels, contrast, screen reader.
- Onboarding tutorial for new users/apprentices.
- Dark mode refinement, custom HVAC-themed icons (use expo-symbols or custom).
- Responsive for tablets/web.
- Search with filters, advanced (vector? later).

**Step 17: Backend Hardening & Real Integrations**
- Move AI calls to Supabase Edge Functions (secure keys).
- Full Supabase schema + RLS policies (users own data, public read for approved DB).
- Real Google OAuth, storage policies.
- API rate limiting, costs monitoring.
- Integrate real search: e.g., add SerpAPI key or use DuckDuckGo scrape (careful) or Brave Search API.
- For SDS/prices: Scrape public or use official APIs where available.

**Step 18: Testing, Seeding, Beta**
- Comprehensive testing: Unit for calculators, E2E flows.
- Seed more data: Use AI to generate realistic entries from known public info.
- Beta testing instructions.
- Add "Report inaccuracy" for community moderation.

**Step 19: App Store Deployment Prep**
- Build standalone apps (eas with Expo).
- App icons, splash, store listings (screenshots from web runs).
- Privacy policy, terms (data use, AI).
- Analytics (optional).
- Update docs.

**Step 20: Future Enhancements & Maintenance**
- Manufacturer API integrations (if any public).
- AR for overlaying wiring diagrams on phone camera.
- Forum/discussion threads per model.
- Inventory management for tech trucks.
- Multi-user company accounts.
- International codes (EU, etc.).
- Continuous AI improvement via feedback loop.
- Web admin dashboard (separate or Supabase studio extended).

## Additional Improvements (Incorporated or Planned)
- **Newcomer Friendly**: Onboarding wizard, glossary, "Explain like I'm 5" mode in AI, video embeds (YouTube links auto from model searches), simplified views.
- **Diagnosis Help**: Symptom → Possible causes flowchart (interactive UI).
- **Design Assist**: For new installs, input load calc basics → recommend equipment size.
- **Safety First**: Always highlight PPE, lockout/tagout in every walkthrough.
- **Community Driven**: Leaderboards for contributors (public posts count), verified tech badges.
- **Integration**: Link YouTube channel in profile; embed relevant videos in equipment pages (search YouTube API mock).
- **Smart Defaults**: AI pre-fills forms from previous jobs or profile.
- **Export/Print**: Generate PDF of walkthroughs or study notes (react-native-pdf or web).
- **Location Intelligence**: Auto-suggest local suppliers or code variances.
- **Sustainability**: Info on low-GWP refrigerants, efficiency ratings.
- **Voice-First Option**: Full hands-free mode for techs on job (important!).
- Any others from user feedback.

## Risks & Mitigations
- **Scope Creep**: Strict step adherence; MVP in first 8-10 steps.
- **Data Accuracy/Legal**: Verification loop mandatory; always link sources, use summaries.
- **AI Costs/Hallucinations**: User-provided keys or budgeted backend; always cite, require verification for DB adds.
- **Platform Specifics**: Test on both iOS/Android early; use Expo for 90% shared.
- **Supabase Limits**: Start free tier; monitor.
- **Real-time Prices**: Volatile; show "estimated as of [date]", refresh button.
- **Voice STT Accuracy**: Fallback to text; good mics assumed for techs.

## How to Use This Plan
- Follow steps sequentially.
- After each, test the app (`npm start` or expo start, use web or device).
- Update PROGRESS.md with status.
- When ready for next, confirm.
- For data population: I (as AI assistant) can use my tools (web_search, fetch_page) during steps to gather accurate real-world info (e.g., real PT charts, model specs) and hardcode or script inserts.
- At end: Full working app ready for Expo build to .apk/.ipa or stores.

This plan is ambitious but achievable in phases. Feedback welcome at any point to adjust priorities (e.g., prioritize AI or calculators).

## Progress Tracking
See PROGRESS.md for current status, completed steps, and notes on deviations.
