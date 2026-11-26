# Platform differences

"Verified" below means run on an Android 15 emulator (API 35) or in Chromium during development. iOS code was not compiled or run; its column describes what the code is written to do.

## Device info

| Field                | Android                             | iOS                                 | Web                                    |
| -------------------- | ----------------------------------- | ----------------------------------- | -------------------------------------- |
| `manufacturer/model` | `Build.MANUFACTURER`, `Build.MODEL` | `Apple` and the hardware identifier | Usually `Unknown` (user agent parsing) |
| `apiLevel`           | `Build.VERSION.SDK_INT`             | `null`                              | `null`                                 |
| `isEmulator`         | Heuristic on build fingerprints     | Compile-time simulator check        | `null`                                 |
| Memory total         | `ActivityManager.MemoryInfo`        | `ProcessInfo.physicalMemory`        | `navigator.deviceMemory` (Chromium)    |
| Memory available     | Yes                                 | `null`                              | `null`                                 |

`isEmulator` on Android is a heuristic. It is right for the stock emulator images and can be wrong for unusual hardware, which is why the field is named after what it reports and not exposed as a security signal.

## Battery

| Capability      | Android                                                                | iOS                                                                                  | Web                             |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| Level           | Yes                                                                    | Yes, `null` on the simulator                                                         | Battery Status API (Chromium)   |
| Charging status | Yes                                                                    | Yes                                                                                  | Yes (same API)                  |
| Power source    | `ac`, `usb`, `wireless`                                                | `null`                                                                               | `null`                          |
| Temperature     | Yes (tenths of a degree)                                               | `null`                                                                               | `null`                          |
| Low power mode  | Battery saver                                                          | Low Power Mode                                                                       | `null`                          |
| Change events   | `ACTION_BATTERY_CHANGED` and `ACTION_POWER_SAVE_MODE_CHANGED` receiver | `batteryLevelDidChange`, `batteryStateDidChange`, `NSProcessInfoPowerStateDidChange` | `levelchange`, `chargingchange` |

Android events were exercised on the emulator with `adb emu power` (level, status and source changes arrived in the demo's event log).

## Haptics

| Call              | Android                                                                                                                                  | iOS                                                 | Web                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| `impact(style)`   | API 29+: predefined effects (`EFFECT_TICK`, `CLICK`, `HEAVY_CLICK`). Older: timed one-shot, with amplitude when the vibrator supports it | `UIImpactFeedbackGenerator` with the matching style | `navigator.vibrate` pattern |
| `selection()`     | Predefined tick or short one-shot                                                                                                        | `UISelectionFeedbackGenerator`                      | Short vibrate pattern       |
| `notification(t)` | Waveform per type (`success`, `warning`, `error`)                                                                                        | `UINotificationFeedbackGenerator`                   | Vibrate pattern per type    |

Things worth knowing:

- Every call resolves with `{ played, strategy, reason }`. `played: true` means the system accepted the request. It does not prove the user felt anything.
- Devices without a vibrator, a missing native module and a failing call all resolve with `played: false` and a `reason`. Only invalid arguments throw (`ERR_INVALID_ARGUMENT`).
- The Android manifest declares the normal `VIBRATE` permission, which needs no runtime prompt.
- Without amplitude control (cheap motors, many emulators) the three impact styles cannot feel different on Android.
- Browsers only vibrate after a user gesture. Safari does not implement `navigator.vibrate`.
- iOS ignores haptics on devices without a Taptic Engine and in the simulator.

## Secure storage

| Aspect           | Android                                                                               | iOS                                                | Web              |
| ---------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------- |
| Backend          | AES-256-GCM, key in Android Keystore, ciphertext in SharedPreferences                 | Keychain generic password                          | `localStorage`   |
| `securityLevel`  | `hardware` when the key is in secure hardware, else `software` (emulator: `software`) | `hardware` on devices, `software` on the simulator | `none`           |
| Protection class | Keys are not user-authentication bound                                                | `AfterFirstUnlockThisDeviceOnly`                   | None, plain text |
| Backup           | Demo sets `allowBackup: false`                                                        | Not migrated to new devices                        | Not applicable   |

Android specifics: if the Keystore key is invalidated (for example after a restore from backup that kept the preferences but not the key), reads fail with `ERR_KEY_INVALIDATED` and the caller decides whether to clear the data. There is no silent reset.

The web backend is a development convenience. It is clearly labelled in `getSecurityInfo()` and must not be used for secrets.

## Permissions summary

| Module         | Android permission               | iOS entitlement or plist key               |
| -------------- | -------------------------------- | ------------------------------------------ |
| device-info    | none                             | none                                       |
| battery-info   | none                             | none                                       |
| haptics        | `VIBRATE` (normal, install time) | none                                       |
| secure-storage | none                             | Keychain access within the app's own group |
