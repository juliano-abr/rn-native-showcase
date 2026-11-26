# Architecture, risks and milestones

This document is the plan the project was built against, updated with what actually happened. The README links here for the details that would make it too long.

## Goal

A few small native modules, each one done properly: a typed JavaScript surface, a Kotlin implementation, a Swift implementation, a web fallback, tests at every layer that can be tested, and documentation that says what is and is not verified.

## Layout

```
rn-native-showcase/
  packages/                 one npm package per native module
    device-info/
    battery-info/
    haptics/
    secure-storage/
      android/              Gradle library: Kotlin + JVM unit tests
      ios/                  CocoaPods spec + Swift
      src/                  TypeScript API, native binding, web fallback, Jest tests
  apps/demo/                Expo Router app that exercises every module
    src/app/                route files, kept to a few lines each
    src/features/<name>/    screen + constants + hooks + utils + __tests__
    src/components/         shared UI primitives
    src/hooks, utils, types shared code
  scripts/                  verify.sh, android-unit-tests.sh
  docs/                     this file, platform differences, screenshots, demo video
```

Inside every package the JavaScript is split the same way:

| File                  | Responsibility                                                      |
| --------------------- | ------------------------------------------------------------------- |
| `<X>.types.ts`        | Public types, including the native module shape and error codes     |
| `<X>Module.ts`        | Native binding through `requireOptionalNativeModule` (never throws) |
| `<X>Module.web.ts`    | Browser implementation of the same shape                            |
| `index.ts`            | Public API: validation, error mapping, graceful degradation         |
| `__tests__/*.test.ts` | Jest tests against a mocked native module                           |

The `.web.ts` suffix is resolved by Metro, so no platform checks are needed in the public API.

## Decisions

**Optional native module lookup.** `requireOptionalNativeModule` returns `null` when the native side is not linked (Expo Go, an old dev client, a unit test). Each package turns that into either a defined fallback (haptics resolves with `played: false, reason: "unlinked"`) or a typed `ERR_UNAVAILABLE`, instead of crashing at import time.

**Logic that can be tested without a device is kept out of the module class.** Pure Kotlin objects (`BatteryMapper`, `HapticPlanner`, `SecureCipher`, `SecureStore`) hold the decisions and are covered by JVM unit tests. The module classes only translate between Expo types and those objects.

**Validation happens in JavaScript first.** Secure storage rejects bad keys and oversized values before any native call, so the same error codes appear on every platform and the native side can assume well-formed input.

**Events are lazy.** Battery listeners are registered with `OnStartObserving` and `OnStopObserving`, so the broadcast receiver or observer exists only while JavaScript is listening.

**Unsupported is data, not an exception.** Battery fields the platform cannot provide are `null`. A capability object (`getCapabilities`) lets callers ask first. Only programmer errors (invalid arguments) throw.

**Secure storage format.** Android: AES-256-GCM, key in the Android Keystore under alias `showcase.secure-storage.v1`, provider-generated random IV, the storage key bound in as additional authenticated data so a value cannot be moved to another key. Entries are stored as `v1:<iv hex>:<ciphertext hex>` in SharedPreferences. iOS: Keychain generic passwords with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.

## Milestones and acceptance criteria

| #   | Milestone   | Acceptance criteria                                                                                                  | Status                                            |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Foundation  | pnpm workspace, strict TypeScript, ESLint, Prettier, Jest running in every package, one command to verify everything | Done                                              |
| 2   | Device info | Sync reads on Android, iOS and web; memory info; typed result; tests                                                 | Done on Android and web. iOS not compiled         |
| 3   | Battery     | Level, status, power source, events with start/stop observing, null for unsupported fields; JVM tests for the mapper | Done on Android and web. iOS not compiled         |
| 4   | Haptics     | Impact, selection, notification; strategy reported; never throws at runtime; platform differences documented         | Done on Android and web. iOS not compiled         |
| 5   | Demo app    | A screen per module, call results, live events, platform support table, error screen                                 | Done, run on an Android emulator and in a browser |
| 6   | Tests       | JS tests per package and for the demo, Kotlin JVM tests for the pure logic                                           | Done: 100 JS tests, 35 Kotlin tests               |
| 7   | Docs        | README, this document, platform differences, limitations                                                             | Done                                              |
| 8   | CI          | Format, lint, typecheck, JS tests, Expo checks, web export, Android unit tests and debug build, iOS build job        | Written. Not yet run on GitHub                    |

A fourth module, secure storage, was added as the optional one. A planned `native-utilities` package was dropped: a fifth module would have repeated the same patterns without showing anything new.

## Risks and how they were handled

| Risk                                                                   | Handling                                                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swift cannot be compiled on the Linux machine the project was built on | Swift was written against the `expo-modules-core` sources. A macOS CI job builds it, and the README lists iOS as unverified until that job is green. |
| Emulators have no Keystore hardware and no real vibrator               | Documented. `getSecurityInfo` reports `software` on the emulator, haptics report `played` only as "request accepted".                                |
| Native module tests need a device                                      | Logic moved into plain Kotlin objects and tested on the JVM through the generated demo project.                                                      |
| Library versions move quickly (Expo SDK, React Native, TypeScript)     | Versions were looked up before starting and are pinned by the lockfile.                                                                              |
| Debug builds load JavaScript from Metro                                | README documents Metro on port 8081 and `adb reverse` for emulators.                                                                                 |

## What is checked where

| Layer                            | How                                      | Run here     |
| -------------------------------- | ---------------------------------------- | ------------ |
| TypeScript API and web fallbacks | Jest, `tsc --noEmit`, browser smoke test | Yes          |
| Kotlin pure logic                | Gradle `testDebugUnitTest`               | Yes          |
| Kotlin module classes            | Compiled by Gradle, run on an emulator   | Yes (manual) |
| Demo app                         | Jest with RNTL, emulator walkthrough     | Yes          |
| Swift                            | `xcodebuild` in `ios.yml`                | No           |
