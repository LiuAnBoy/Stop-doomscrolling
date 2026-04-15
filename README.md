# StopScroll

> 鏡頭偵測到你拿起手機，就在電腦螢幕上播放一段提醒影片。一個阻止自己滑手機的小玩具。

## 它在幹嘛

打開後鏡頭一直盯著你。當畫面中出現手機超過 1 秒，App 會自動播放一段 attention-grabbing 的影片提醒你「欸別滑了」。手機從畫面消失 0.5 秒後，影片自動停止、回到待機狀態。

底層是 [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/object_detector) 的 EfficientDet-Lite0 物件偵測模型，本機跑、不傳雲端。

## Features

- 即時鏡頭偵測手機（CPU inference，不需要 GPU）
- 偵測有 **dwell time + jitter tolerance**，不會因為畫面晃一下就誤觸發
- 純前端 ML，影像不離開機器
- Tauri 2 打包成原生 dmg / exe，比 Electron 輕

## 下載

到 [Releases](../../releases) 拿對應平台的安裝檔：

| 平台 | 檔案 |
|---|---|
| macOS Apple Silicon | `StopScroll_x.x.x_aarch64.dmg` |
| macOS Intel | `StopScroll_x.x.x_x64.dmg` |
| Windows | `StopScroll_x.x.x_x64-setup.exe` |

### ⚠️ 未簽章說明

開源小玩具沒花錢買簽章憑證，第一次開啟會被系統擋：

**macOS** — 跳「無法驗證開發者」時：
- 方法一：右鍵點 App → 「打開」→ 確認
- 方法二：終端機跑 `xattr -cr /Applications/StopScroll.app`

**Windows** — SmartScreen 跳「Windows 已保護你的電腦」時：
- 點「**其他資訊**」→「**仍要執行**」

## 本機開發

需要：[Node.js 20+](https://nodejs.org/)、[pnpm](https://pnpm.io/)、[Rust](https://www.rust-lang.org/tools/install) + [Tauri prerequisites](https://tauri.app/start/prerequisites/)

```bash
pnpm install        # postinstall 會自動下載 MediaPipe model 與 wasm
pnpm tauri dev      # 開發模式
pnpm tauri build    # 打包生產版
pnpm test           # 跑 state machine 單元測試
```

第一次 `pnpm install` 會自動執行 `scripts/download-assets.mjs`，從 Google CDN 抓 MediaPipe 模型（13MB），並把 wasm 從 `node_modules` 複製到 `public/wasm/`。

## 專案結構

```
src/
├── main.ts            # entry point
├── ui.ts              # UI orchestration
├── camera.ts          # getUserMedia 包裝
├── detector.ts        # MediaPipe ObjectDetector 封裝
├── stateMachine.ts    # IDLE ⇄ TRIGGERED 狀態機（含 dwell / jitter 邏輯）
└── stateMachine.test.ts

src-tauri/
├── src/               # Rust shell（minimal）
├── resources/
│   └── video.mp4      # bundle 進 app 的提醒影片
└── tauri.conf.json

scripts/
└── download-assets.mjs  # 拉 MediaPipe wasm + model

.github/workflows/
└── release.yml          # tag v* 觸發，產 macOS dmg + Windows exe
```

## 狀態機

```
              phone 連續出現 1000ms
   ┌─────┐ ──────────────────────► ┌───────────┐
   │IDLE │                         │ TRIGGERED │
   │     │ ◄────────────────────── │           │
   └─────┘   phone 連續消失 500ms  └───────────┘
```

短暫的偵測中斷（≤ 500ms）會被視為仍存在，避免抖動誤判。

## 發版

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 會自動 matrix build macOS (Intel + Apple Silicon) + Windows，產出未簽章的 dmg / exe，建立成 draft release，到 GitHub Releases 頁面手動 publish 即可。

## Tech Stack

- **Frontend**: TypeScript + Vite
- **ML**: [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision)（EfficientDet-Lite0）
- **Shell**: [Tauri 2](https://tauri.app/)
- **Test**: [Vitest](https://vitest.dev/)

## License

MIT
