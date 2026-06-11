# Browser-Only: Get HVAC Hub APK on Your Android Phone (No Local Commands, No npm/EAS install)

**Goal:** Get the complete HVAC Hub app (all 20 steps + new camera visual search for multiple photos + continuous video of nameplates + fuzzy matching) as a real .apk file you can install directly on your phone. Everything done in browser only (GitHub web UI + expo.dev web UI). No software install, no terminal, no npm/npx/eas on your company laptop.

**What you need:**
- Free GitHub account
- Free Expo account (expo.dev)
- The tarball file: hvac-hub-final-complete.tar.gz (download from this workspace /home/user/)
- Your Android phone (for final install)
- Internet

**The tarball is authoritative** — it contains the full integrated app with:
- 6-tab Expo Router navigation
- Zustand store
- Supabase stubs + AI personality/feedback/search/voice
- QR scanner
- **NEW: Camera-based visual search** (in Equipment tab: 📸 Visual Search button, take photos or record video of nameplates, fuzzy match on brand/model/refrigerant/voltage/tonnage + evidence bonus)
- All calculators, EPA, walkthroughs, admin approvals, offline, badges, etc.
- Updated app.json (com.hvachub.demo) and eas.json ready

---

## Step-by-Step (Copy-Paste Ready, Browser Only)

### 1. Download and Prepare the Project Files (Local extract only — no commands)
1. In this workspace, download `hvac-hub-final-complete.tar.gz` (usually via the file list or chat attachment area).
2. On your computer, extract the tar.gz:
   - Windows: Right-click the file → "Extract All" (or use built-in "Extract" / 7-Zip if available, no new install needed).
   - Mac: Double-click the .tar.gz.
   - You will get a folder named `hvac-hub`.
3. Open the `hvac-hub` folder. **Do NOT open a terminal or run anything.** Just look inside — you should see:
   - package.json
   - app.json
   - eas.json
   - src/ folder
   - assets/ folder
   - (and other files like README.md, tsconfig.json, etc.)
   - **Important:** These must go to GitHub *root*, not inside another folder.

### 2. Create or Prepare Your GitHub Repository (Browser)
1. Go to https://github.com in your browser. Sign in.
2. If you don't have a repo for this yet:
   - Click the big green "+" (top right) → "New repository"
   - Name: `hvac-hub`
   - Description: "HVAC Hub - Complete app for technicians (all 20 steps + visual search)"
   - Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (leave empty so you can upload)
   - Click "Create repository"
3. You should now be on an empty repo page.

### 3. Upload the Project Files to GitHub Repo **ROOT** (Critical — fixes "package.json" and "eas.json" errors)
**This is the most important step to avoid "Failed to read "/package.json"" or "/eas.json"" errors and "Failed to run eas build:internal".**

**CRITICAL: Do NOT upload node_modules or cache folders — they break cloud builds.**

1. In your empty GitHub repo page, look for the area that says "or drag files here to add them to your repository" (or click "uploading an existing file" link).
2. On your computer, open the extracted `hvac-hub` folder in File Explorer / Finder.
3. **Select ONLY these specific items** (use Ctrl-click / Cmd-click to multi-select; do not select everything):
   - package.json
   - package-lock.json
   - app.json
   - eas.json
   - tsconfig.json
   - .gitignore
   - README.md
   - LICENSE (if present)
   - src/ (the whole folder)
   - assets/ (the whole folder)
   - scripts/ (the whole folder)
   - supabase/ (the whole folder)
   - docs/ (the whole folder)
   - All top-level .md files (BETA_TESTING.md, EASY_ANDROID_INSTALL.md, INSTALL_ON_ANDROID.md, PLAN.md, PROGRESS.md, etc.)
   - Any other small root files that are not folders starting with a dot or "dist"

   **Explicitly SKIP / DO NOT drag these (they will cause build failures):**
   - node_modules (HUGE — never upload this)
   - .expo
   - .git
   - .npm
   - .vscode
   - .claude
   - Any folder or file starting with "dist" (dist-step1, etc.)
   - .env or .env.example (unless you want to, but keys are not needed)

4. **Important:** Do NOT select or drag the outer "hvac-hub" folder itself — that would put everything in a subfolder and cause "Failed to read" errors.

5. Drag and drop the selected items directly onto the GitHub "drag files here" area in the browser.
6. GitHub will show the files uploading (it may take a minute).
7. At the bottom:
   - Commit message: "Upload clean HVAC Hub app at root (all 20 steps + visual search)"
   - Click the green "Commit changes" button.
8. Refresh the repo page. You should now see `package.json`, `app.json`, `eas.json`, `src/`, etc. **directly at the root** (not inside any subfolder). If you see a "hvac-hub/" folder or node_modules, delete those folders and repeat the upload with only the clean list above.

### 4. Verify Key Files in GitHub (Browser)
1. In GitHub repo, click on `package.json` — it should open and show the project name "hvac-hub" etc.
2. Click on `app.json` — confirm it has `"package": "com.hvachub.demo"` and `"bundleIdentifier": "com.hvachub.demo"`.
3. Click on `eas.json` — it should contain the preview profile (see content below if missing).
4. If eas.json is missing or wrong, create it now:
   - Click "Add file" > "Create new file"
   - Filename: `eas.json`
   - Paste this exact content:
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```
   - Commit message: "Add eas.json for preview APK"
   - Commit the file.
5. If app.json needs the eas projectId later, we can update after first build.

### 5. Set Up expo.dev Project and Link GitHub (Browser)
1. Go to https://expo.dev and sign up / log in (use Google or email, free).
2. Click "New Project" or go to your dashboard.
3. Create a new project named "HVAC Hub" (or "hvac-hub").
4. In the new project:
   - Go to **Project settings** (gear icon or left menu).
   - Under "Builds & Submissions" or "GitHub", link your GitHub account if prompted.
   - Connect the specific repo: select your `hvac-hub` GitHub repo.
   - It may ask for the EAS project ID — you can leave placeholder for now or it will auto-generate on first build. (The app.json has a placeholder "your-eas-project-id-here" which is fine to start.)
5. Confirm the project is linked to your GitHub repo.

### 6. Trigger the Android Preview APK Build (Browser — this creates the installable .apk)
1. In expo.dev, go to your HVAC Hub project.
2. Click the **Builds** tab (or "New build" button).
3. Select:
   - Platform: **Android**
   - Build profile: **preview** (this uses the eas.json profile that produces a direct .apk, not app bundle)
   - Distribution: Internal (default)
4. For Android signing credentials (first time):
   - Choose **"Generate a new keystore"** (recommended, Expo will handle it securely).
   - Do not use "Use existing" unless you have one.
5. Click **"Start build"** (or "Build Android").
6. The build will run in the cloud (usually 5-15 minutes). You can close the tab and come back.
7. Refresh the Builds page periodically.
8. When status shows "Finished" or "Success", look for the download button/link for the **.apk** file (it will say something like "Download APK" or have a direct link).
9. Download the .apk file to your computer (or directly to phone if the link allows).

### 7. Install the APK on Your Android Phone
1. On your phone, download the .apk (transfer via USB, email, Google Drive, or direct browser download from expo.dev link if possible).
2. On phone:
   - Go to **Settings > Security** (or search "unknown sources" / "Install unknown apps").
   - Find your browser (Chrome, etc.) or "Files" app and **enable "Allow from this source"** or "Install unknown apps".
3. Open the .apk file (in Downloads or Files app).
4. Tap **Install**.
5. Once installed, open the app. It will appear as "HVAC Hub".
6. Grant camera and storage permissions when prompted (needed for QR + Visual Search).

**Test the new visual search feature:**
- Go to Equipment tab (second tab)
- Tap the **"📸 Visual Search"** button
- Take 1-3 photos or record a short video of a nameplate (real or printed sample)
- Optionally enter partial/illegible text (e.g. "Carrier XR" or "48")
- Tap Analyze — it uses fuzzy matching against the DB and shows matches with confidence + photo/video evidence.

---

## If You Get an Error

**Current error: "Build failed  Failed to run eas build:internal"**
- This is a generic wrapper. The real cause is almost always in the detailed logs.
- **Most common cause right now:** node_modules, .expo, .git or other cache folders were accidentally uploaded to GitHub (they make the cloud build fail).
- **Fix (recommended):** Create a **brand new** GitHub repo, then repeat the clean upload in **Step 3** above using the exact "select only these items" list (skip node_modules etc.). After upload, re-apply the projectId fix in app.json if needed (see below), then link the new repo and retry the build.

**Previous error we fixed: projectId mismatch ("your-eas-project-id-here" vs real ID)**
- Already resolved by editing app.json on GitHub with the ID from the error (551b71f5-da5f-4c07-84ec-f4a047d830d1).
- If you start a fresh repo, re-do that edit after uploading (replace the two placeholder lines in app.json with the real ID).

**Common earlier errors: "Failed to read "/eas.json"" or "Failed to read "/package.json""**
- Files inside a `hvac-hub/` subfolder instead of at root.
- **Fix:** Delete bad folders or start new repo, then repeat **Step 3** with only the clean listed items dragged to root.

**Other errors:**
- In expo.dev, click the failed build → look for "View logs" or expand the error details and **copy the full text** below the "Failed to run eas build:internal" line.
- Reply here with the **exact error message** (especially the detailed logs).
- I will give the precise next browser step.

**If build succeeds but no APK link:** Check the build logs in expo.dev for details and paste the error here.

**Expo projectId note:** The app.json must match the current Expo project ID exactly (we use 551b71f5-da5f-4c07-84ec-f4a047d830d1 from your error). Always edit app.json on GitHub after any fresh upload.

---

**All features preserved exactly** as in the tarball. No local development required after this.

Once you have the APK installed and working, let me know how the visual search performs or if you hit any new error message.

**Next action for you right now:** Start at Step 1 (download tarball) and report back the exact error (if any) after trying Step 3 (upload) + Step 6 (build trigger). 

You got this — we'll get the APK on your phone with pure browser steps!