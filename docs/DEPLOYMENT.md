# HVAC Hub Deployment & App Store Prep (Step 19)

## Prerequisites
- Expo account (expo.dev)
- EAS CLI: `npm install -g eas-cli` or use npx
- Apple Developer account (for iOS)
- Google Play Console (for Android)
- Real Supabase project + keys (for production backend - see .env and supabase/ folder)
- Custom app icons/splash (replace in assets/images/)

## 1. EAS Configuration
- Run `eas build:configure` (or manually add to app.json "extra.eas.projectId")
- Create eas.json in root if needed (preview and production profiles).

Example eas.json (create if missing):
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "your-prod-url",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-prod-anon-key"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 2. Build Standalone Apps
- `npm run build:preview` (or `eas build --profile preview`)
- `npm run build:production` for store (or `eas build --profile production`)
- For web: `npm run build:web` then deploy dist/ to Vercel/Netlify or GitHub Pages.

## 3. App Icons, Splash, Assets
- Current assets are placeholders (generic Expo + some HVAC blue theme).
- **Recommended**:
  - Icon: 1024x1024 PNG, HVAC-themed (blue wrench/thermometer/brain icon).
  - Splash: 1242x2688 (iOS) or adaptive for Android.
  - Use `expo-assets` or manual.
- Update app.json paths if changed.
- Favicon for web already set.

**To generate screenshots for store**:
- Run `npm start -- --web`
- Use browser dev tools or tools like Puppeteer to capture:
  - Home dashboard
  - Equipment Hub with filters/modal
  - AI chat with search/feedback
  - Calculators
  - EPA quizzes
  - Profile with admin queue
- Aim for 6.5" and 5.5" iPhone, various Android.
- Store in docs/screenshots/ (add here).

## 4. Store Listings
- **App Store / Google Play**:
  - Title: HVAC Hub
  - Subtitle: Tools, AI & Community for HVAC Techs
  - Description: Use the content from package.json + README.
  - Keywords: HVAC, technician, EPA 608, calculators, AI assistant, refrigeration, air conditioning, walkthroughs.
  - Screenshots: 5-10 as above.
  - Privacy URL: Link to docs/PRIVACY_POLICY.md (host on GitHub or your site).
  - Support URL: Your site or email.

## 5. Privacy Policy & Terms
- Included: docs/PRIVACY_POLICY.md and docs/TERMS_OF_SERVICE.md
- Host them publicly (GitHub Pages, Vercel, or Supabase storage).
- Reference in App Store metadata and in-app (Profile > About or link).
- Covers: Data use for AI (verification loop), community uploads, admin moderation, Supabase backend, push notifications, camera for QR.
- AI disclaimer: "AI for reference only; verify all outputs."

## 6. Analytics (Optional)
- Add `expo-firebase-analytics` or `@segment/analytics-react-native` if desired.
- Currently disabled (no tracking in Step 19 to keep lightweight).
- Enable via feature flag in future.

## 7. Pre-Submission Checklist
- [ ] Test on real devices (iOS + Android).
- [ ] Run full E2E from BETA_TESTING.md.
- [ ] Configure real Supabase + deploy Edge Functions (ai-chat, search-web).
- [ ] Update .env with production keys (use EAS Secrets: `eas secret:create`).
- [ ] Add custom icons/splash.
- [ ] Generate and upload screenshots.
- [ ] Fill store descriptions, privacy URL, support email.
- [ ] Review for App Store guidelines (no misleading AI claims).
- [ ] Submit via `eas submit` or store consoles.
- [ ] Post-launch: Monitor Supabase usage, OpenAI costs, push tokens.

## 8. Web Deployment (Optional)
- `npm run build:web`
- Deploy `dist/` folder.
- Update web output in app.json if needed.

## Notes
- All prior simulation paths remain for users without keys.
- Full production requires real backend (Step 17+).
- See PLAN.md for future (Step 20 enhancements).

For questions during beta: Use in-app Report or contact.

Ready for App Store / Google Play after this prep! (Step 19 complete per plan)