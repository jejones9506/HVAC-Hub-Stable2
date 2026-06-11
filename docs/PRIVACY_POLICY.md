# HVAC Hub Privacy Policy

**Last Updated**: 2026-06-07

HVAC Hub ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("App").

## Information We Collect
- **Account Information**: When you sign in with Google (via Supabase), we collect your name, email, and profile photo (from Google OAuth). This is stored in Supabase profiles table.
- **Usage Data**: Equipment views, calculator usage, AI chat history (stored locally and synced if Supabase configured), EPA quiz scores, job logs, badges, uploads (notes/photos/videos with your attribution).
- **Location Data**: ZIP code for local codes and recommendations (user-provided, used for calculators/walkthroughs).
- **Device Data**: Push notification tokens (for admin alerts and notifications), app version, device type (for analytics if enabled).
- **AI Interactions**: Chat messages, feedback ratings, personality preferences (for adaptive AI). Summaries are stored per-user.
- **Uploads**: Public/private community posts, photos, videos. Public ones are shared in the community DB.

We do **not** collect sensitive personal data like SSN, financial info, or exact GPS location (only ZIP).

## How We Use Your Information
- To provide core features: Equipment database, AI assistant (with verification/approval for shared data), calculators, EPA study, walkthroughs, community sharing.
- **AI Features**: Your chats and feedback are used to personalize responses (per-user personality learning). AI suggestions require your verification before admin review and addition to public DB (no duplicates).
- To notify admins of suggestions/reports and send you updates on approvals (via Expo push notifications or in-app).
- To improve the app (anonymous analytics if enabled in future).
- Legal compliance, safety (e.g., EPA-related).

## Data Sharing and Disclosure
- **Public Community Data**: Public uploads/notes are visible to other users (attributed to you).
- **Approved Shared DB**: Verified equipment/SDS data (after admin approval) becomes public in the shared database.
- **Admins/Moderation**: Reports of inaccuracy and suggestions go to admin queue for review.
- **Service Providers**: Supabase (backend, auth, storage, realtime), Expo (push notifications, build).
- We do not sell your data. We may share aggregated anonymous stats.
- Legal requirements or to protect safety.

## Data Storage and Security
- Local storage via Expo SecureStore / AsyncStorage for offline use (equipment cache, preferences, history).
- Cloud: Supabase (PostgreSQL with RLS policies: users own their data, public read for approved items, admin-gated for queue).
- AI calls (if real backend enabled): Processed via Supabase Edge Functions (keys server-side, not in client).
- Encryption: Standard for Supabase/Expo.
- You control: Sign out clears local, delete uploads, reset personality, export AI history.

**Note on AI**: Real AI (future) uses your verified data only after approval. All suggestions go through human admin review before public.

## Your Rights
- Access/edit/delete your profile data (via app or Supabase).
- Export your AI history, job logs, uploads.
- Opt-out of learning (toggle in AI prefs).
- Delete account: Contact support (removes profile; public posts remain anonymized or deleted on request).
- Report inaccuracy directly in-app (triggers moderation).

## Children's Privacy
Not intended for children under 13. We do not knowingly collect data from them.

## Changes to This Policy
We may update this policy. Continued use after changes constitutes acceptance. Check in-app or GitHub.

## Contact
For questions: [your-email@example.com] or via the app's Profile > Report.

This policy covers data use for the HVAC Hub app, including AI, community features, and admin moderation as described in our PLAN.md.

## Third-Party
- Google OAuth: See Google's privacy policy.
- Supabase: Their policy applies to backend.
- Expo: For builds/notifications.

By using the App, you agree to this policy.