# Easy Guide: Run HVAC Hub on Your Android Phone

This is the **simplest possible** way to get the full app (all 20 steps + Camera Visual Search) on your phone.

## Option 1: Easiest – Use Expo Go (Recommended for Testing, No Build Needed)

This lets you run the full app on your phone in under 5 minutes without creating an APK.

### Steps:

1. On your **Android phone**, open the Google Play Store.
2. Search for **"Expo Go"** and install it (made by Expo, free).

3. On your **computer**:
   - Download the file: `hvac-hub-final-complete.tar.gz` from this workspace.
   - Extract it (right-click → Extract All or use 7-Zip/WinRAR).
   - You should now have a folder called `hvac-hub`.

4. Open a terminal / command prompt on your computer and type these commands one by one:

   ```bash
   cd hvac-hub
   npm install
   npx expo start
   ```

5. A browser window or terminal will show a **QR code**.

6. On your phone:
   - Open the **Expo Go** app you installed.
   - Tap the **Scan QR Code** button.
   - Point your phone camera at the QR code on your computer screen.

7. The full HVAC Hub app will load on your phone!

**Tip**: Keep the terminal open on your computer while using the app. You can see logs there.

---

## Option 2: Get a Real Installable APK File (Sideload)

If you want a normal .apk file you can install without Expo Go:

### Requirements:
- Free Expo account (takes 1 minute)
- Internet connection

### Steps:

1. **Create Expo account** (if you don't have one):
   - Go to https://expo.dev in your browser
   - Click "Sign up" (use Google or email)

2. **On your computer**, in the `hvac-hub` folder (after extracting the tar.gz), run these commands:

   ```bash
   npm install
   npx eas login
   ```

   (Log in with the same account you created on expo.dev)

3. Build the APK (this runs in the cloud):

   ```bash
   npx eas build --platform android --profile preview
   ```

4. Wait for the build to finish (usually 5-15 minutes). 
   - You will get a link in the terminal.
   - Click the link and download the `.apk` file to your phone.

5. **Install the APK on your phone**:
   - On your Android phone, go to **Settings → Security** (or search for "Install unknown apps").
   - Allow your browser or "Files" app to install unknown apps.
   - Open the downloaded `.apk` file and tap **Install**.

The app will appear on your home screen like a normal app.

---

## Having Problems?

Reply with the **exact error message** you're seeing and I'll give you the next exact command to run.

Common quick fixes:
- "eas: command not found" → run `npm install -g eas-cli`
- Build fails → make sure you ran `npx eas login` first
- Can't install APK → enable "Unknown sources" in phone settings

The app includes the new **Camera Visual Search** feature (📸 Visual Search button in Equipment tab) for taking multiple photos or short videos of nameplates and finding matches.

Enjoy testing! Let me know where you're stuck.