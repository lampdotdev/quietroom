#!/bin/zsh
# Builds the game for this Mac (./build.sh mac, build/TheLittleHouse.app), the iPhone and iPad simulator (./build.sh ios,
# build/iOS/TheLittleHouse.app) or Android (./build.sh android): the Swift around the page, with the page copied in.
set -euo pipefail
cd "$(dirname "$0")"
PLACE="${1:-mac}"
# dyld ignores DYLD_INSERT_LIBRARIES and the like for a binary with a __RESTRICT segment: the agent's shell can
# start the installed app, and Lamp answers its secrets calls only to the app itself, so nothing may ride into it.
mkdir -p .build
: > .build/restrict
RESTRICT=(-Xlinker -sectcreate -Xlinker __RESTRICT -Xlinker __restrict -Xlinker "$PWD/.build/restrict")
stage_page() {
  if find Web -type l | grep -q .; then echo "Web/ holds a shortcut to another file. Put the file itself there." >&2; exit 1; fi
  rm -rf "$1"
  mkdir -p "$(dirname "$1")"
  cp -Rp Web "$1"
  if [ -f "$1/lamp-game.js" ]; then
    if [ -z "${LAMP_PAGE_DEVICE:-}" ]; then echo "Lamp builds the game, saying which device its page is for: build it from Lamp." >&2; exit 1; fi
    printf '%s' "$LAMP_PAGE_DEVICE" > "$1/lamp-device.js"
    BUILD="$(cd "$1" && find . -type f ! -name lamp-device.js ! -name lamp-build.js -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -c1-16)"
    printf '%s"%s";\n' "export default " "$BUILD" > "$1/lamp-build.js"
  fi
}
if [[ "$PLACE" == "android" ]]; then
  if [ -z "${LAMP_GRADLE:-}" ] || [ -z "${ANDROID_HOME:-}" ]; then
    echo "Android's tools aren't set up. Open the game in Lamp to download them." >&2
    exit 1
  fi
  stage_page build/android-assets/Web
  # The game's icon, once Lamp has drawn it; until then the system's own for an app.
  ICON=".lamp/AppIcon-square.png"
  [ -f "$ICON" ] || ICON=/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns
  mkdir -p build/android-res/mipmap-xxxhdpi
  /usr/bin/sips -s format png -z 432 432 "$ICON" --out build/android-res/mipmap-xxxhdpi/ic_launcher.png > /dev/null
  cd Lamp/Android
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
  exec "$LAMP_GRADLE" --console=plain -q "-Dlamp.app=myquietroom" assembleDebug
fi
if [[ "$PLACE" == "ios" ]]; then
  SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
  FLAGS=(-c debug --triple "$(uname -m)-apple-ios17.0-simulator" --sdk "$SDK" --scratch-path .build/ios)
  APP="build/iOS/TheLittleHouse.app"
else
  FLAGS=(-c release "${RESTRICT[@]}")
  APP="build/TheLittleHouse.app"
fi
# On this Mac, Lamp's player when Lamp hands it over (LAMP_PLAYER): copied, not compiled, so nothing of Apple's tools runs.
PLAYER="${LAMP_PLAYER:-}"
[[ "$PLACE" == "ios" ]] && PLAYER=""
if [[ -z "$PLAYER" ]]; then
  BIN="$(swift build "${FLAGS[@]}" --show-bin-path)/TheLittleHouse"
  swift build "${FLAGS[@]}" 2>&1
fi
rm -rf "$APP"
if [[ "$PLACE" == "ios" ]]; then
  mkdir -p "$APP"
  cp "$BIN" "$APP/TheLittleHouse"
  cat > "$APP/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>TheLittleHouse</string>
  <key>CFBundleIdentifier</key><string>dev.lamp.dev.app.myquietroom</string>
  <key>CFBundleName</key><string>The Little House</string>
  <key>CFBundleDisplayName</key><string>The Little House</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>MinimumOSVersion</key><string>17.0</string>
  <key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array>
  <key>UILaunchScreen</key><dict/>
  <key>UIRequiresFullScreen</key><true/>
  <key>UIStatusBarHidden</key><true/>
  <key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationPortraitUpsideDown</string><string>UIInterfaceOrientationLandscapeRight</string><string>UIInterfaceOrientationLandscapeLeft</string></array>
  <key>UISupportedInterfaceOrientations~ipad</key><array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationPortraitUpsideDown</string><string>UIInterfaceOrientationLandscapeRight</string><string>UIInterfaceOrientationLandscapeLeft</string></array>
  <key>GCSupportsControllerUserInteraction</key><true/>
  <key>GCSupportedGameControllers</key><array><dict><key>ProfileName</key><string>ExtendedGamepad</string></dict></array>
  <key>NSMicrophoneUsageDescription</key><string>The Little House listens to your microphone.</string>
  <key>NSSpeechRecognitionUsageDescription</key><string>The Little House turns your speech into text.</string>
  <key>NSCameraUsageDescription</key><string>The Little House uses your camera.</string>
  <key>NSPhotoLibraryUsageDescription</key><string>The Little House uses your photos.</string>
  <key>NSPhotoLibraryAddUsageDescription</key><string>The Little House saves pictures to your photos.</string>
  <key>NSCalendarsFullAccessUsageDescription</key><string>The Little House reads and adds calendar events.</string>
  <key>NSRemindersFullAccessUsageDescription</key><string>The Little House reads and adds reminders.</string>
  <key>NSContactsUsageDescription</key><string>The Little House looks up people in your contacts.</string>
  <key>NSLocationWhenInUseUsageDescription</key><string>The Little House uses your location.</string>
  <key>NSLocationAlwaysAndWhenInUseUsageDescription</key><string>The Little House uses your location, also in the background.</string>
  <key>NSMotionUsageDescription</key><string>The Little House uses the motion sensors and your step count.</string>
  <key>NSBluetoothAlwaysUsageDescription</key><string>The Little House connects to Bluetooth devices.</string>
  <key>NSFaceIDUsageDescription</key><string>The Little House unlocks with Face ID.</string>
  <key>NSHealthShareUsageDescription</key><string>The Little House reads your health data.</string>
  <key>NSHealthUpdateUsageDescription</key><string>The Little House saves health data.</string>
  <key>NFCReaderUsageDescription</key><string>The Little House reads NFC tags.</string>
  <key>NSSiriUsageDescription</key><string>The Little House works with Siri and Shortcuts.</string>
  <key>NSNearbyInteractionUsageDescription</key><string>The Little House finds nearby devices.</string>
  <key>NSLocalNetworkUsageDescription</key><string>The Little House talks to Lamp on your Mac and to devices on your network.</string>
  <key>NSAppleMusicUsageDescription</key><string>The Little House plays music from your library.</string>
  <key>NSHomeKitUsageDescription</key><string>The Little House reads and controls your home.</string>
  <key>DTPlatformName</key><string>iphonesimulator</string>
  <key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array>
</dict></plist>
PLIST
else
  PLAYED=""
  if [[ -n "$PLAYER" ]]; then
    mkdir -p "$(dirname "$APP")"
    cp -Rp "$PLAYER" "$APP"
    mv "$APP/Contents/MacOS/LampPlayer" "$APP/Contents/MacOS/TheLittleHouse"
    PLAYED="<key>LampPlayerVersion</key><string>${LAMP_PLAYER_VERSION:-}</string>"
  else
    mkdir -p "$APP/Contents/MacOS"
    cp "$BIN" "$APP/Contents/MacOS/TheLittleHouse"
    # The copy names the SDK it was really built with (see a Mac app's build.sh), so macOS draws it as that SDK does.
    if SDKVER="$(xcrun --sdk macosx --show-sdk-version 2>/dev/null)" \
      && MINOS="$(otool -l "$APP/Contents/MacOS/TheLittleHouse" | awk '/minos/ {print $2; exit}')" && [ -n "$MINOS" ]; then
      xcrun vtool -set-build-version macos "$MINOS" "$SDKVER" -replace -output "$APP/Contents/MacOS/TheLittleHouse" "$APP/Contents/MacOS/TheLittleHouse" >/dev/null 2>&1 || true
    fi
  fi
  cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>TheLittleHouse</string>
  <key>CFBundleIdentifier</key><string>dev.lamp.dev.app.myquietroom</string>
  <key>CFBundleName</key><string>The Little House</string>
  <key>CFBundleDisplayName</key><string>The Little House</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.games</string>
  <key>GCSupportsGameMode</key><true/>
  <key>NSMicrophoneUsageDescription</key><string>The Little House listens to your microphone.</string>
  <key>NSSpeechRecognitionUsageDescription</key><string>The Little House turns your speech into text.</string>
  <key>NSCameraUsageDescription</key><string>The Little House uses your camera.</string>
  <key>NSPhotoLibraryUsageDescription</key><string>The Little House uses your photos.</string>
  <key>NSPhotoLibraryAddUsageDescription</key><string>The Little House saves pictures to your photos.</string>
  <key>NSCalendarsFullAccessUsageDescription</key><string>The Little House reads and adds calendar events.</string>
  <key>NSRemindersFullAccessUsageDescription</key><string>The Little House reads and adds reminders.</string>
  <key>NSContactsUsageDescription</key><string>The Little House looks up people in your contacts.</string>
  <key>NSBluetoothAlwaysUsageDescription</key><string>The Little House connects to Bluetooth devices.</string>
  <key>NSAppleEventsUsageDescription</key><string>The Little House reads your email and drafts replies through Mail.</string>
  <key>NSLocalNetworkUsageDescription</key><string>The Little House looks for printers and other devices on your network.</string>
  <key>NSLocationUsageDescription</key><string>The Little House uses your location.</string>
  <key>NSLocationWhenInUseUsageDescription</key><string>The Little House uses your location.</string>
  <key>NSAppleMusicUsageDescription</key><string>The Little House plays music from your library.</string>
  <key>LampPlayer</key><dict><key>kind</key><string>page</string><key>scheme</key><string>lamp-web-app</string></dict>
  $PLAYED
  <key>NSPrincipalClass</key><string>NSApplication</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
fi
if [[ "$PLACE" == "ios" ]]; then stage_page "$APP/Web"; else stage_page "$APP/Contents/Resources/Web"; fi
codesign --force -s - "$APP"
echo "Built $APP"
