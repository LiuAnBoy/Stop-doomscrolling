# StopScroll — Design Spec

- **Date**: 2026-04-15
- **Status**: Approved for planning
- **Project path**: `~/code/stopscroll`

## Purpose

A tiny cross-platform desktop toy that watches the webcam and, when it detects a phone held up in frame, expands its window and plays a pre-bundled "attention" video to interrupt the doomscroll. When the user puts the phone down, the window shrinks back and the video stops.

No settings, no configuration UI — the video and all parameters are baked into the build. This is intentionally a toy, not a product.

## Non-Goals

- User-configurable video, thresholds, or behavior
- Multiple video playlists, randomization
- Background / tray-icon / auto-start modes
- Mobile platforms
- Telemetry, accounts, cloud sync
- Robust detection for edge cases (lying down, side profile, etc.)

## Platforms

- macOS (Apple Silicon + Intel Universal)
- Windows 10/11 x64

## Tech Stack

- **Shell**: Tauri 2.x (Rust + system WebView)
- **Frontend**: TypeScript + Vite, plain DOM (no framework)
- **Detection**: MediaPipe Tasks (Web, WASM)
  - `ObjectDetector` with EfficientDet-Lite (filter to `cell phone` class)
- **Camera**: `getUserMedia` in WebView
- **Video playback**: HTML `<video>` element, system volume

Expected bundle size: 5–12 MB for the app shell + bundled MediaPipe models + the user's `video.mp4` (typically 10–50 MB).

## Architecture

```
┌────────────────────────────────────────────────┐
│ Tauri Shell (Rust)                              │
│  - Window creation, always-on-top, resize       │
│  - Resource loading (bundled video + models)    │
│  - IPC commands: resize_to_idle, resize_to_active│
└───────────────▲────────────────────────────────┘
                │ invoke
┌───────────────┴────────────────────────────────┐
│ WebView (TypeScript frontend)                   │
│                                                 │
│  ┌───────────┐   frames   ┌──────────────────┐ │
│  │ camera.ts │──────────▶│ detector.ts      │ │
│  │ getUserMd │           │ - ObjectDetector │ │
│  └───────────┘           └────────┬─────────┘ │
│                                   │ {phone}   │
│                           ┌───────▼─────────┐ │
│                           │ stateMachine.ts │ │
│                           │ IDLE ↔ TRIGGERED│ │
│                           └───────┬─────────┘ │
│                                   │ events    │
│                           ┌───────▼─────────┐ │
│                           │ ui.ts            │ │
│                           │ - resize window  │ │
│                           │ - play/pause vid │ │
│                           └──────────────────┘ │
└────────────────────────────────────────────────┘
```

### Module boundaries

- **`camera.ts`** — Opens the webcam, exposes a `<video>` element and a `getFrame()` method returning the latest frame as an `ImageBitmap` or `HTMLVideoElement` usable by MediaPipe. Display is mirrored via CSS; detection runs on the raw (un-mirrored) frame. No detection logic.
- **`detector.ts`** — Wraps MediaPipe ObjectDetector. Single `detect(frame) → { phoneDetected: boolean }`. Encapsulates model loading and confidence threshold.
- **`stateMachine.ts`** — Pure function / class taking `phoneDetected` readings over time and emitting `onTrigger()` / `onRelease()` callbacks. No DOM or Tauri dependencies. Easy to unit test.
- **`ui.ts`** — Subscribes to state machine events; calls Tauri commands to resize; shows/hides and plays/pauses the `<video>` element.
- **Rust side** — Two IPC commands (`resize_idle`, `resize_active`) that call `window.set_size()`. Nothing more.

Each module can be understood and swapped independently.

## Detection logic

```
Per frame (target ~15 FPS, actual capped by device):
  phoneDetected = ObjectDetector returns a `cell phone` bbox with score ≥ 0.5
```

Kept intentionally single-signal. A 3 s dwell suppresses incidental phone glances; false triggers are cheap (just plays a video) so head-pose or other signals aren't worth the complexity.

### State machine

```
States: IDLE, TRIGGERED

IDLE:
  if phoneDetected continuously for ≥ 3000 ms → go to TRIGGERED

TRIGGERED:
  if !phoneDetected continuously for ≥ 500 ms → go to IDLE
```

Thresholds (hard-coded constants in `stateMachine.ts`):

| Constant | Value | Purpose |
|---|---|---|
| `PHONE_CONFIDENCE_MIN` | 0.5 | Object detector threshold |
| `TRIGGER_DWELL_MS` | 3000 | Phone must be visible this long to fire |
| `RELEASE_DWELL_MS` | 500 | Phone must be absent this long to stop |

## Window / UX

Single borderless always-on-top window, user-draggable. Two sizes:

| State | Size | Contents |
|---|---|---|
| `IDLE` | 320 × 240 | Mirrored camera preview only |
| `TRIGGERED` | 960 × 540 | Left half: video playback. Right half: mirrored camera preview (detection continues). |

Transition: Tauri `set_size` is called, CSS transitions handle the internal layout shift smoothly (~200 ms).

On `TRIGGERED`: video element `play()` from the start, at full element volume; system volume determines actual loudness.
On `IDLE`: video element `pause()` and `currentTime = 0`.

Mirrored preview is CSS-only (`transform: scaleX(-1)`); detection operates on the raw frame.

## Video asset

- File lives at `src-tauri/resources/video.mp4` in the repo.
- Declared in `tauri.conf.json` under `bundle.resources`.
- Loaded at runtime via the Tauri asset protocol (e.g., `convertFileSrc(...)` on `resolveResource('resources/video.mp4')`).
- Replaceable only by rebuilding. This is intentional.

## Platform permissions

Camera access requires build-time declarations on both platforms — runtime prompt only appears if these are in place:

- **macOS**: add `NSCameraUsageDescription` to `Info.plist` via `tauri.conf.json` → `bundle.macOS.infoPlist`. Without it, `getUserMedia` fails silently and the app may be rejected by TCC.
- **Windows (WebView2)**: listen for the WebView2 `PermissionRequested` event on the Rust side and grant `Camera`. Without this handler, the `getUserMedia` promise rejects immediately.

## Error handling

Small toy, few failure modes; handle only ones the user will actually see:

- **Camera permission denied / no camera** — Show a simple message in the window: "Camera access required." No retry UI beyond reopening the app.
- **MediaPipe model load failure** — Show "Failed to load detection models." Log the error. No retry.
- **Video asset missing** — Build-time failure (resource not found during bundling). Not a runtime concern.

No crash reporting, no telemetry.

## Testing

- **Unit**: `stateMachine.ts` with synthetic time-series of `phoneDetected` booleans → verify trigger/release timing around the 3 s / 500 ms dwells.
- **Manual**: Build, run, physically pick up a phone — verify trigger within 3 s, release within ~500 ms. Check that a phone sitting on the desk in frame doesn't trigger once dwell passes (it will — that's expected; move it out of frame).

No E2E or browser-automation tests. It's a toy.

## Build & Distribution

- Dev: `pnpm tauri dev`
- Release: `pnpm tauri build` produces:
  - macOS: `.dmg` (Universal binary)
  - Windows: `.msi` installer
- No code signing or notarization in MVP (user will `xattr -d` / SmartScreen-override manually).

## Open Questions (resolved)

All resolved during brainstorming — listed here for traceability:

- Platform choice → Tauri (over Electron for size, over web for always-on-top + easy camera permission persistence).
- Detection strategy → Phone object detection only. Head-pose signal dropped during review: marginal precision gain, real cost in edge cases (profile view, glasses, occlusion by phone) for a toy where false triggers are harmless.
- Trigger asymmetry → 3 s to trigger, 500 ms to release.
- Trigger meaning → "phone visible in frame" (post-dwell). Simpler than "actively scrolling"; same practical outcome for the 3 s window.
- Video source → Bundled at build time, no config, no picker.
- Settings UI → None.
- Window behavior → Single window resizes; camera stays on the right, video appears on the left.
