/**
 * Camera module — opens the webcam and provides raw frames for detection.
 * Display mirroring is handled by CSS (transform: scaleX(-1)).
 * Detection always uses the un-mirrored video element directly.
 */
export class Camera {
  private videoEl: HTMLVideoElement;

  constructor(videoEl: HTMLVideoElement) {
    this.videoEl = videoEl;
  }

  /** Opens the webcam and starts streaming into the video element. */
  async start(): Promise<void> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      throw new Error("Camera access required.");
    }
    this.videoEl.srcObject = stream;
    await new Promise<void>((resolve) => {
      this.videoEl.onloadedmetadata = () => {
        this.videoEl.play().catch((err) => {
          console.error("[camera] play() failed:", err);
        });
        resolve();
      };
    });
  }

  /**
   * Returns the raw (un-mirrored) video element usable by MediaPipe.
   * Only valid after {@link start} resolves.
   */
  getFrame(): HTMLVideoElement {
    return this.videoEl;
  }
}
