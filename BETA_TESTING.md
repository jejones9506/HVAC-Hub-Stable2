# HVAC Hub Beta Testing Instructions (Step 18)

## Overview
Thank you for beta testing! The app is feature-complete per the 20-step PLAN.md but needs real-world validation before App Store / Google Play.

**Current Version**: Step 18 - Testing, Seeding, Beta (expanded data to ~28 equipment models, in-app calculator unit tests, "Report Inaccuracy" moderation, seeded realistic specs from 2025-2026 public sources).

## How to Run Beta
1. `cd hvac-hub && npm start` (or `npx expo start`)
2. Use **web** (press `w`) for fastest iteration, or Expo Go on physical iOS/Android device.
3. Sign in (Profile tab) with the Google mock or real Supabase if configured.
4. **Important**: Test on both light/dark mode, web + mobile, different screen sizes.

## Key E2E Flows to Test (Comprehensive)
- **Onboarding**: First launch (clear SecureStore or new device) → modal tour of all 6 tabs. Dismiss and verify `hasSeenOnboarding` persists.
- **Equipment Hub**:
  - Search/filters/favorites (heart icons).
  - Rich tabbed modals: Electrical, Capacities, Parts, Community Notes, SDS (tap chemical for AI search).
  - QR Scanner (camera modal): Scan a fake QR or type model like "24ANB1-036". Verify lookup + history in Profile.
  - **NEW Step 18**: Tap any equipment detail → scroll to bottom → "Report Inaccuracy" button. Submit a report. Verify it appears in Profile > Admin Approvals queue (switch role to Admin if needed).
  - Price refresh button (loading state).
- **Calculators (11+ tools)**:
  - Use each (Ohm's, Voltage Drop, Conduit, Ductulator, PT Chart, Transformer Sizing, Motor FLA, Airflow/CFM, etc.).
  - Prefill from selected equipment (in Equipment tab first).
  - Save to history, view in Profile.
  - **NEW Step 18**: In Profile > Testing Dashboard, tap "Run Calculator Unit Tests". Verify 5+ tests pass (Ohm's, Voltage Drop, CFM, PT, FLA). Check details.
- **AI Assistant**:
  - Chat with personality adaptation (use commands like "Talk more casually").
  - Feedback buttons (👍/👎) → auto-updates summary.
  - 🔍 Internet Search button (now tries real Edge if configured, else sim).
  - Verify & Submit to Shared DB → creates approval.
  - Voice (TTS, mic STT on web).
  - Bell notifications.
  - **Report flow integration**: AI suggestions can lead to reports.
- **EPA Study**:
  - Read sections + TTS.
  - Take all 4 quizzes (Core, Type I/II/III). Score and track progress %.
  - Verify readiness card.
- **Walkthroughs**:
  - 5-step wizard: Job type, unit details, location (uses profile ZIP for codes).
  - Generate → PPE, Tools, Steps, Materials (prices/links), Code Notes.
  - Save to history (Profile).
- **Community & Uploads**:
  - In Equipment: Add note/photo/video (public/private toggle). Verify syncs to Equipment Notes + My Uploads in Profile.
  - Toggle/delete your uploads.
- **Admin / Approvals (Profile)**:
  - Switch to Admin role (demo button).
  - View pending queue (including NEW "Report" type from inaccuracy button).
  - Diff view for updates.
  - Approve/Reject with notes → triggers equipment update + push notification + suggester alert.
  - Bulk import button.
- **Profile Extras**:
  - Job logger (log a job, see list).
  - Badges (earned via actions like first upload/QR/diagnostic/EPA).
  - AI control panel (reset/export/voice sliders).
  - API Usage (Step 17) + new Testing Dashboard (Step 18).
  - Location edit → affects calculators/codes.
- **Offline**: Toggle offline mode (in store or simulate by disconnect). Verify cache load for equipment/badges/jobs.
- **Dark Mode / Accessibility / Responsive**: Toggle system dark, use screen reader (VoiceOver/TalkBack), test on tablet/web.

## Report Bugs / Feedback
- Use the **in-app "Report Inaccuracy"** (now everywhere for moderation).
- Or email / GitHub issue with:
  - Device/OS/Expo Go version
  - Steps to reproduce
  - Screenshot or console log (`expo start` logs)
  - Expected vs actual

## Seeded Data Notes (Step 18)
- Expanded from 17 to 28+ realistic models using public 2025/2026 data (Goodman R-32 value leaders, Carrier/Trane/Lennox high-SEER2, R-454B transition notes, prices ~2026 street).
- Includes low-GWP notes, commercial RTU/Chiller, mini-splits.
- Prices fluctuate on refresh (±7.5%).
- SDS and community posts also expanded.

## Known Limitations (for Beta)
- Real Supabase/Edge/OpenAI/SerpAPI require your keys + deployed functions (see .env.example + supabase/schema.sql + functions/).
- All "real" paths gracefully fallback to simulation.
- Voice STT best on web; native is demo.
- No App Store builds yet (see Step 19).
- No AR, full offline SQLite, multi-language, etc. (future).

## Next After Beta
Feedback will inform Step 19 (App Store prep: EAS builds, screenshots, privacy policy, icons).

See PLAN.md for full vision. Thanks for helping make this the go-to app for HVAC techs (apprentices to masters)!

**Run command for fresh beta**: Delete app data / reinstall Expo Go, `npm start`, test flows above.

Last updated: 2026-06-07 (Step 18)