/**
 * UI orchestrator — wires camera, detector, and state machine together.
 * Calls Tauri IPC to resize the window on state transitions.
 */
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { Camera } from "./camera";
import { Detector } from "./detector";
import { StateMachine } from "./stateMachine";

const TARGET_FPS = 15;
const FRAME_MS = 1000 / TARGET_FPS;

export async function initUI(
  cameraVideo: HTMLVideoElement,
  attentionVideo: HTMLVideoElement,
  errorEl: HTMLElement,
  loadingEl: HTMLElement
): Promise<void> {
  const camera = new Camera(cameraVideo);
  const detector = new Detector();
  const sm = new StateMachine();

  // Load bundled video via Tauri resource protocol
  const videoPath = await resolveResource("resources/video.mp4");
  const srcUrl = convertFileSrc(videoPath);
  console.log("[ui] video path:", videoPath, "→ src:", srcUrl);
  attentionVideo.src = srcUrl;
  attentionVideo.addEventListener("error", () =>
    console.error("[ui] attention video error:", attentionVideo.error)
  );
  attentionVideo.addEventListener("loadeddata", () =>
    console.log("[ui] attention video loaded")
  );

  // Load detection model
  try {
    await detector.load();
  } catch {
    showError(errorEl, "Failed to load detection models.");
    return;
  }

  // Start camera
  try {
    await camera.start();
  } catch {
    showError(errorEl, "Camera access required.");
    return;
  }

  loadingEl.style.display = "none";

  // State transitions
  sm.onTrigger(async () => {
    console.log("[ui] TRIGGERED");
    await invoke("resize_active");
    document.body.classList.add("triggered");
    attentionVideo.currentTime = 0;
    attentionVideo.play().then(
      () => console.log("[ui] video playing"),
      (e) => console.error("[ui] video play failed:", e)
    );
  });

  sm.onRelease(async () => {
    await invoke("resize_idle");
    document.body.classList.remove("triggered");
    attentionVideo.pause();
    attentionVideo.currentTime = 0;
  });

  // Detection loop
  let lastFrame = 0;

  function loop(now: number): void {
    requestAnimationFrame(loop);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    const frame = camera.getFrame();
    const { phoneDetected } = detector.detect(frame);
    if (phoneDetected) console.log("[detect] phone!");
    sm.update(phoneDetected, now);
  }

  requestAnimationFrame(loop);
}

function showError(el: HTMLElement, msg: string): void {
  el.textContent = msg;
  el.removeAttribute("hidden");
}
