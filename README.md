# rn-native-showcase

Four small React Native native modules written with the Expo Modules API in Kotlin and Swift, each with a typed JavaScript API and a web fallback, plus a demo app that calls all of them.

The point of the repository is to show how a native module should be built: where the logic lives, how errors cross the bridge, how unsupported platforms are handled, and what can be tested without a device. It also says plainly what was and was not verified.

## Demo

Recorded on an Android 15 emulator (API 35). The values on screen are real native results.

[Watch the walkthrough (MP4, 6 MB)](docs/demo/android-emulator-walkthrough.mp4)

|                                              Home                                              |                                     Device info                                      |                                           Battery events                                            |
| :--------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------: |
| <img src="docs/screenshots/home.png" width="220" alt="Home screen listing the four modules" /> | <img src="docs/screenshots/device-info.png" width="220" alt="Device info results" /> | <img src="docs/screenshots/battery-events.png" width="220" alt="Battery state and native events" /> |

|                                   Haptics                                    |                                         Secure storage                                         |                                  Error handling                                  |
| :--------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------: |
| <img src="docs/screenshots/haptics.png" width="220" alt="Haptics results" /> | <img src="docs/screenshots/secure-storage-calls.png" width="220" alt="Secure storage calls" /> | <img src="docs/screenshots/error-handling.png" width="220" alt="Typed errors" /> |

More: [secure storage info](docs/screenshots/secure-storage-info.png), [platform support table](docs/screenshots/platform-support.png).

There are no iOS screenshots. The Swift code has not been compiled (see [Known limitations](#known-limitations)).

## Features

| Module                                                | API                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`@showcase/device-info`](packages/device-info)       | `getDeviceInfo()`, `getMemoryInfo()`                                           |
| [`@showcase/battery-info`](packages/battery-info)     | `getBatteryState()`, `getCapabilities()`, `addListener("onBatteryChange", fn)` |
| [`@showcase/haptics`](packages/haptics)               | `impact(style)`, `selection()`, `notification(type)`, `getCapabilities()`      |
| [`@showcase/secure-storage`](packages/secure-storage) | `setItem`, `getItem`, `deleteItem`, `getAllKeys`, `clear`, `getSecurityInfo()` |

- Every function has a TypeScript type. Native results are never `any`.
- Fields a platform cannot provide are `null`, and capability objects tell callers what to expect.
- Errors carry stable codes (`ERR_INVALID_KEY`, `ERR_VALUE_TOO_LARGE`, `ERR_UNAVAILABLE`, `ERR_KEY_INVALIDATED`, ...).
- Importing a module never crashes when the native side is missing (Expo Go, an old dev client, tests).
- Battery events start observing only while a JavaScript listener is attached.
- A demo app with a screen per module, a call log with raw results, a live event feed, an error screen and a platform support table.

Platform behaviour is documented in [docs/platform-differences.md](docs/platform-differences.md).

## Tech stack

- React Native 0.88, Expo SDK 58, Expo Router, React 19
- Expo Modules API: Kotlin on Android, Swift on iOS
- TypeScript 6 in strict mode
- Jest 30, jest-expo, React Native Testing Library; Kotlin JVM unit tests through Gradle
- pnpm 10 workspaces, ESLint 9 (flat config), Prettier
- GitHub Actions

## Architecture

```
packages/<module>/
  src/                 types, native binding, web fallback, public API, Jest tests
  android/             Gradle library: Kotlin module class + pure logic + JVM tests
  ios/                 podspec + Swift module
apps/demo/             Expo Router app
```

Each module follows the same shape:

1. `<X>Module.ts` looks the native module up with `requireOptionalNativeModule`, so a missing module is `null` instead of an exception.
2. `index.ts` is the public API. It validates input, maps native errors to typed errors and degrades gracefully.
3. `<X>Module.web.ts` implements the same shape for browsers. Metro picks it by file suffix.
4. On Android, decisions live in plain Kotlin objects (`BatteryMapper`, `HapticPlanner`, `SecureCipher`, `SecureStore`) so they can be unit tested on the JVM. The Expo module class is a thin adapter.

The demo app mirrors this: route files in `src/app` are a few lines each and render a screen from `src/features/<name>`, which owns its constants, hooks, utils and tests.

Full write-up, risks and milestone acceptance criteria: [docs/architecture.md](docs/architecture.md).

## Engineering challenges

- **Swift without a Mac.** The project was built on Linux. The Swift was written against the `expo-modules-core` sources, kept small, and put behind a macOS CI job that builds it. Until that job is green, iOS is unverified.
- **Testing native logic without a device.** The Android library code is split so its logic compiles into the JVM unit tests (35 tests). Gradle runs them inside the generated demo project because the library depends on Expo's Gradle plugins.
- **Secure storage correctness.** Android uses AES-256-GCM with a Keystore key, a provider-generated random IV and the storage key as additional authenticated data. The on-disk format is versioned (`v1:`) so it can change later. Key invalidation surfaces as `ERR_KEY_INVALIDATED` and is never silently reset.
- **Honest haptics.** Android devices differ a lot (predefined effects on API 29+, amplitude control on some motors only). `impact()` resolves with the strategy used and whether the request was accepted instead of promising a feel it cannot guarantee.
- **Events without leaks.** The battery receiver is registered in `OnStartObserving` and removed in `OnStopObserving` and `OnDestroy`.

## Technical decisions

| Decision                                                    | Why                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Expo Modules API instead of TurboModules and codegen        | Less boilerplate for small modules, typed records and events, autolinking in workspaces |
| pnpm workspace with hoisted node linker                     | React Native tooling expects a flat `node_modules`                                      |
| Validation in JavaScript before native calls                | Same error codes on every platform, native code can assume valid input                  |
| `null` for unsupported values, exceptions only for misuse   | Callers can render "not available" without try/catch                                    |
| `android/` and `ios/` of the demo are generated and ignored | Continuous native generation keeps the repository free of build output                  |
| Secure storage as the fourth module                         | It is the one that shows error codes, validation and Keystore handling, not just reads  |
| `native-utilities` dropped                                  | A fifth module would repeat these patterns without adding anything                      |

## Getting started

Requirements: Node 22, pnpm 10 (`corepack enable`). For Android: JDK 21 and the Android SDK. For iOS: macOS and Xcode. Expo Go cannot run these modules; you need a development build.

```bash
pnpm install
```

**In a browser** (uses the web fallbacks):

```bash
pnpm demo:web          # http://localhost:8431
```

**On an Android emulator or device:**

```bash
export ANDROID_HOME=~/Android/Sdk      # wherever your SDK is
pnpm prebuild:android                  # generates apps/demo/android
cd apps/demo/android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
pnpm demo                              # Metro on 8081, then open the app
```

The debug build loads JavaScript from Metro. Use `arm64-v8a` instead of `x86_64` for a physical device. `pnpm --filter @showcase/demo android` (`expo run:android`) wraps the same steps; the Gradle commands above are the ones used to produce the demo and screenshots.

**On iOS:**

```bash
pnpm --filter @showcase/demo exec expo prebuild --platform ios --no-install
pnpm --filter @showcase/demo ios
```

Not run by the author. See limitations.

### Environment variables

None. The project has no secrets and makes no network requests.

## Running tests

```bash
pnpm verify          # format check, lint, typecheck, all Jest tests
pnpm test            # Jest only: 100 tests (53 in packages, 47 in the demo)
pnpm test:android    # Kotlin JVM unit tests: 35 tests, needs ANDROID_HOME
```

CI also runs `expo-doctor`, `expo install --check` and a web export.

| Layer                            | Tests                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| TypeScript APIs and web fallback | Jest, native module mocked                                           |
| Demo screens, hooks and utils    | Jest, React Native Testing Library, expo-router mocked               |
| Kotlin logic                     | JUnit on the JVM through Gradle                                      |
| Native module classes            | Compiled by Gradle, exercised manually on an emulator, not automated |

## Project structure

```
.
├── packages/
│   ├── device-info/        android/ ios/ src/
│   ├── battery-info/
│   ├── haptics/
│   └── secure-storage/
├── apps/demo/
│   └── src/
│       ├── app/            Expo Router routes
│       ├── features/       device-info, battery, haptics, secure-storage, support, errors
│       ├── components/     Screen, Button, Card, Badge, KeyValueList, ApiCallCard
│       ├── hooks/          use-api-call
│       ├── utils/          format, theme, support matrix
│       └── types/
├── docs/                   architecture, platform differences, screenshots, demo video
├── scripts/                verify.sh, android-unit-tests.sh
└── .github/workflows/      ci.yml, ios.yml
```

## Roadmap

- Run `ios.yml` on GitHub and fix whatever the first macOS build finds.
- Instrumented Android tests for the module classes on an emulator in CI.
- Optional biometric gate for secure storage.
- Publish the packages to npm with a changelog.
- A config plugin for options such as the Keychain access group.

## Known limitations

- **iOS is unverified.** The Swift code was written but never compiled or run. `ios.yml` is meant to catch compile errors; it has not run yet. Treat iOS behaviour in the docs as intended, not observed.
- **CI has not run on GitHub yet.** Every command in `ci.yml` was run locally except the macOS job, but the workflow files themselves have not been executed.
- **Only an emulator was used on Android.** There is no hardware vibrator, so haptics `played: true` means "the system accepted the request". Secure storage reported security level `software`, because the emulator has no secure hardware.
- **The native module classes have no automated tests.** Their logic is tested on the JVM; the Expo glue was checked by hand on the emulator.
- **Android only exposes available memory.** iOS reports installed memory only.
- **Web secure storage is plain `localStorage`.** It is labelled `none` and is for development only.
- The demo app has not been tested on tablets, in landscape or with screen readers.

## License

MIT. See [LICENSE](LICENSE).
