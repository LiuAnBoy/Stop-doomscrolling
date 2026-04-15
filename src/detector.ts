/**
 * Detector module — wraps MediaPipe ObjectDetector for phone detection.
 * Exposes a single detect() method returning { phoneDetected: boolean }.
 */
import {
  ObjectDetector,
  FilesetResolver,
  type ObjectDetectorResult,
} from "@mediapipe/tasks-vision";

const PHONE_CONFIDENCE_MIN = 0.3;
const MEDIAPIPE_WASM_PATH = "/wasm";
const MODEL_URL = "/models/efficientdet_lite0.tflite";

export class Detector {
  private detector: ObjectDetector | null = null;
  private lastTimestamp = -1;

  /** Loads the MediaPipe model. Must be called before detect(). */
  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    this.detector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
      scoreThreshold: PHONE_CONFIDENCE_MIN,
      categoryAllowlist: ["cell phone"],
      runningMode: "VIDEO",
    });
  }

  /**
   * Runs object detection on a video frame.
   * @param frame - Raw (un-mirrored) video element from Camera.getFrame()
   * @returns Whether a phone was detected with sufficient confidence
   */
  detect(frame: HTMLVideoElement): { phoneDetected: boolean } {
    if (!this.detector || frame.readyState < 2) {
      return { phoneDetected: false };
    }

    const timestamp = performance.now();
    // MediaPipe requires strictly increasing timestamps
    if (timestamp <= this.lastTimestamp) {
      return { phoneDetected: false };
    }
    this.lastTimestamp = timestamp;

    let result: ObjectDetectorResult;
    try {
      result = this.detector.detectForVideo(frame, timestamp);
    } catch {
      return { phoneDetected: false };
    }

    return { phoneDetected: result.detections.length > 0 };
  }
}
