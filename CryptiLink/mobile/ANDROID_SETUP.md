Android setup and build instructions for CryptiLink mobile

Prerequisites:
- Java JDK 17+ installed and `java` on PATH.
- Android SDK and command-line tools installed. Set `ANDROID_SDK_ROOT` or `ANDROID_HOME`.

Quick build steps (locally):

1. From `CryptiLink/mobile` ensure `node_modules` are installed: `yarn` or `npm install`.
2. Generate Gradle wrapper (if you don't have `gradle`): from `CryptiLink/mobile/android` run `gradle wrapper` or if you have `gradlew` already use it.
   - On Windows: run `gradlew.bat assembleDebug` from `CryptiLink/mobile/android` (or `gradlew.bat -v` to verify).
3. Build debug APK: from `CryptiLink/mobile/android` run `./gradlew assembleDebug` (or `gradlew.bat assembleDebug` on Windows).

Notes:
- `google-services.json` must be present under `android/app/google-services.json` (already added).
- The Gradle wrapper JAR and `gradlew` scripts are not checked into this repo; run `gradle wrapper` locally if needed.
- `react-native-config` Gradle hook is applied conditionally in `app/build.gradle` and expects `node_modules` present.
- For release builds, add keystore and signing config to `android/app/build.gradle` and set keystore values in `~/.gradle/gradle.properties` (e.g. `MYAPP_STORE_FILE`, `MYAPP_STORE_PASSWORD`, `MYAPP_KEY_ALIAS`, `MYAPP_KEY_PASSWORD`).
