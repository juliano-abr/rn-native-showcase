#!/usr/bin/env bash
# Runs the Kotlin JVM unit tests of every native module through Gradle.
# Needs a JDK 17+ and an Android SDK (ANDROID_HOME), and generates the Android project first.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  echo "Set ANDROID_HOME to an Android SDK (platform and build-tools for the compileSdk the demo uses)." >&2
  exit 1
fi

if [ ! -d apps/demo/android ]; then
  pnpm prebuild:android
fi

cd apps/demo/android
./gradlew \
  :showcase-device-info:testDebugUnitTest \
  :showcase-battery-info:testDebugUnitTest \
  :showcase-haptics:testDebugUnitTest \
  :showcase-secure-storage:testDebugUnitTest \
  -PreactNativeArchitectures=x86_64 \
  --console=plain "$@"
