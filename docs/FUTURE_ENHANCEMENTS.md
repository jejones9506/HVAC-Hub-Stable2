# HVAC Hub Future Enhancements (Step 20 - Plan Complete)

This document outlines the features from Step 20 of PLAN.md, implemented as non-breaking stubs in the app (visible in Profile > Future Enhancements, Equipment, etc.). Full production versions would require additional deps, backend work, and testing.

## Implemented Stubs (Step 20)
- **Manufacturer API integrations**: Button in Profile triggers `manufacturerSync(model)` stub. Logs "would call public API". Future: integrate Carrier/Trane APIs if public endpoints available (use fetch or Edge).
- **AR for overlaying wiring diagrams**: In Equipment detail + Profile, `arOverlay(model)` stub. Uses existing expo-camera permission. Future: expo-three or ARKit/ARCore for 3D overlay on live camera feed from model submittals.
- **Forum/discussion threads per model**: In Profile, sample threads + add post. `addForumPost` stub. Future: Supabase realtime table for threads/comments per equipment_id.
- **Inventory management for tech trucks**: Profile shows mock inventory list + add item. `addInventoryItem` updates store. Future: offline sync, barcode scan for stock, multi-truck.
- **Multi-user company accounts**: Profile shows demo companies + switch. `switchCompany` stub. Future: extend profiles with company_id, RLS for shared data, role-based access (admin/tech).
- **International codes (EU, etc.)**: Extended mockLocalCodes with EU F-Gas (2024/573 GWP bans), EPBD, DE/UK/FR specifics. `setInternationalMode` and `internationalCodes` in store. Calculators/AI/Walkthroughs can use (extend getLocalCodes).
- **Continuous AI improvement via feedback loop**: `continuousAIImprovement()` calls existing analyze + logs. Already powered by Step 14 summaries/feedback. Future: aggregate anonymized feedback for prompt tuning, A/B testing.
- **Web admin dashboard**: Profile shows link to Supabase Studio or custom /admin. Future: separate Next.js dashboard using Supabase service role for advanced moderation, analytics, bulk ops.

## Additional Improvements (from PLAN)
Many were incorporated earlier (onboarding, gamification, voice, etc.). Remaining can build on current foundation.

## Maintenance Notes
- Continuous: Monitor Supabase usage, AI costs (if real), user feedback via in-app.
- Updates: Use EAS for OTA when published.
- The app is now at the end of the 20-step plan: fully functional MVP + future hooks.

See PLAN.md for original vision. The core verification/approval loop, per-user personality, location-aware codes, etc. are production-ready with real backend.

For questions: Use the in-app Report or GitHub.