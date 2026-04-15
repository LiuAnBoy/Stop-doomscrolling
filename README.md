# StopScroll

> When the webcam catches you picking up your phone, your computer plays a video to nag you back. A tiny toy to stop yourself from doomscrolling.

## What it does

Once running, the webcam keeps an eye on you. If a phone shows up in frame for more than 1 second, the app auto-plays an attention-grabbing video as a reminder to *put it down*. As soon as the phone leaves frame for 0.5 seconds, the video stops and the app returns to standby.

Powered by [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/object_detector) running the EfficientDet-Lite0 object detection model — entirely on-device, nothing leaves your machine.

## Features

- Real-time phone detection from your webcam (CPU inference, no GPU required)
- **Dwell time + jitter tolerance** built into the detection — won't false-trigger on a single noisy frame
- 100% on-device ML — your video feed never leaves your computer
- Packaged with Tauri 2 as a native dmg / exe — much lighter than Electron

## Download

Grab the installer for your platform from [Releases](../../releases):

| Platform | File |
|---|---|
| macOS Apple Silicon | `StopScroll_x.x.x_aarch64.dmg` |
| macOS Intel | `StopScroll_x.x.x_x64.dmg` |
| Windows | `StopScroll_x.x.x_x64-setup.exe` |

### ⚠️ Unsigned build notice

This is an open-source toy and I haven't paid for code signing certificates, so the OS will block the first launch:

**macOS** — when you see *"cannot verify the developer"*:
- Option 1: right-click the app → **Open** → confirm
- Option 2: in Terminal, run `xattr -cr /Applications/StopScroll.app`

**Windows** — when SmartScreen shows *"Windows protected your PC"*:
- Click **More info** → **Run anyway**

## Local development

Requirements: [Node.js 20+](https://nodejs.org/), [pnpm](https://pnpm.io/), [Rust](https://www.rust-lang.org/tools/install) + [Tauri prerequisites](https://tauri.app/start/prerequisites/)

```bash
pnpm install        # postinstall auto-fetches MediaPipe model + wasm
pnpm tauri dev      # dev mode
pnpm tauri build    # production build
pnpm test           # state machine unit tests
```

The first `pnpm install` runs `scripts/download-assets.mjs`, which downloads the MediaPipe model (13MB) from Google's CDN and copies the wasm files from `node_modules` into `public/wasm/`.

## Project structure

```
src/
├── main.ts            # entry point
├── ui.ts              # UI orchestration
├── camera.ts          # getUserMedia wrapper
├── detector.ts        # MediaPipe ObjectDetector wrapper
├── stateMachine.ts    # IDLE ⇄ TRIGGERED state machine (dwell + jitter logic)
└── stateMachine.test.ts

src-tauri/
├── src/               # Rust shell (minimal)
├── resources/
│   └── video.mp4      # the reminder video bundled into the app
└── tauri.conf.json

scripts/
└── download-assets.mjs  # fetches MediaPipe wasm + model

.github/workflows/
└── release.yml          # triggered on tag v*, builds macOS dmg + Windows exe
```

## State machine

```
              phone present for 1000ms
   ┌─────┐ ──────────────────────► ┌───────────┐
   │IDLE │                         │ TRIGGERED │
   │     │ ◄────────────────────── │           │
   └─────┘   phone absent for 500ms └───────────┘
```

Brief detection gaps (≤ 500ms) are treated as "still present" to avoid jitter-induced false negatives.

## Releasing

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will matrix-build macOS (Intel + Apple Silicon) and Windows, produce unsigned dmg / exe artifacts, and create a draft release. Just hit publish on the GitHub Releases page when you're ready.

## Tech stack

- **Frontend**: TypeScript + Vite
- **ML**: [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (EfficientDet-Lite0)
- **Shell**: [Tauri 2](https://tauri.app/)
- **Test**: [Vitest](https://vitest.dev/)

## License

MIT
