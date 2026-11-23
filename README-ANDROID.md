# BLOCK STRIKE Android APK builder

Baseline: **AR11.10.20-WEAPON.1.1-C4**. No new weapon slots or gameplay rewrites.

This is an Android WebView shell that packages ALL existing game content into the APK (maps, YaPB GRAPH, weapons, sounds, and M1887). The game runs without GitHub Pages or network access. Runtime files are served at `https://appassets.androidplatform.net/` by WebView's request interception to retain a secure origin for fetch and IndexedDB. Imported maps and weapon skins use Android's file picker and persistent WebView storage.

## Build from the current game repository on GitHub (recommended)

1. Make sure your repository root contains the current version of BLOCK STRIKE, including `index.html`, `js/`, `css/`, `assets/`, `sw.js`, `offline-assets.js` (apply the appropriate WEAPON.1.1-C4 hotfix first).
2. Extract this builder ZIP to the **same repository root**. Keep the `android/` and `.github/workflows/` directories. Do not replace existing game files.
3. Commit and push the additions. Under **Actions → Build BLOCK STRIKE Offline APK → Run workflow**, launch the build (or push a change under `android/`).
4. Once the build completes, download the **Block-Strike-WEAPON1.1-Android-APK** artifact and extract `app-debug.apk` from the artifact ZIP.
5. Install on an Android device after allowing installation from the app used to open the APK.

No npm install is needed for this vanilla HTML/JS game. GitHub Actions provides Java 17, Gradle 8.10.2, Android SDK platform 35 and build tools. There is no native build tooling installed in the current ChatGPT execution environment, so this deliverable is **build-ready source, not an already compiled APK**. The workflow was not run here.

## Build with Android tools locally

With JDK 17, Android SDK platform 35 and Gradle 8.10.2 installed:

```bash
python3 android/scripts/stage_game.py . android/app/src/main/assets/www
gradle -p android :app:assembleDebug --no-daemon
```

APK path: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes

- **Offline built-in content:** included in the APK. As a result the APK can be large, roughly hundreds of MB. No initial asset download.
- **Prepare Offline button:** disabled inside the APK only, avoiding duplicate browser cache; GitHub Pages game remains unchanged.
- **Refresh Game button:** displays an APK-update instruction instead of trying to update via GitHub Pages.
- **Weapon/map import:** Android file chooser grants temporary content URI access; imports persist in IndexedDB inside the app.
- **Android-only:** APK files do not install on iPhone. For iOS keep using Safari Add to Home Screen.
- **Signing:** generated `app-debug.apk` is debug-signed for testing/sideloading. Production distribution requires release signing and testing. GitHub-hosted debug builds use a newly generated debug signing key; updating an older debug APK may require uninstalling it first (which can delete its local imports). A persistent release keystore is required for reliable in-place updates.
- **QA limitations:** source and assets can be validated without SDK here; native compile, install, WebGL, gameplay, file picker, and touch/background resume still need real Android QA.
- **Copyright:** third-party GoldSrc/Point Blank-related assets may require separate redistribution permission; app packaging does not convey rights.
