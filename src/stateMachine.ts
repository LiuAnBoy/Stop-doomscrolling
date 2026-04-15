/**
 * State machine for phone-scrolling detection.
 * Pure class — no DOM or Tauri dependencies. Easy to unit test.
 *
 * States: IDLE → TRIGGERED after phone detected for TRIGGER_DWELL_MS continuously.
 *         TRIGGERED → IDLE after phone absent for RELEASE_DWELL_MS continuously.
 */

export const TRIGGER_DWELL_MS = 1000;
export const RELEASE_DWELL_MS = 500;
/** Brief detection gaps (≤ this) don't count as "phone absent". */
export const JITTER_TOLERANCE_MS = 500;

type State = "IDLE" | "TRIGGERED";

export class StateMachine {
  private state: State = "IDLE";
  private dwellStart: number | null = null;
  private lastDetectedTs: number | null = null;
  private onTriggerCb: (() => void) | null = null;
  private onReleaseCb: (() => void) | null = null;

  /** Called once when IDLE → TRIGGERED. */
  onTrigger(cb: () => void): void {
    this.onTriggerCb = cb;
  }

  /** Called once when TRIGGERED → IDLE. */
  onRelease(cb: () => void): void {
    this.onReleaseCb = cb;
  }

  /**
   * Feed a detection reading into the state machine.
   * @param phoneDetected - Whether a phone was detected in this frame
   * @param now - Current timestamp in ms (defaults to performance.now())
   */
  update(phoneDetected: boolean, now: number = performance.now()): void {
    if (phoneDetected) this.lastDetectedTs = now;

    // Phone is "effectively present" if seen recently (within jitter tolerance).
    const present =
      this.lastDetectedTs !== null &&
      now - this.lastDetectedTs <= JITTER_TOLERANCE_MS;

    if (this.state === "IDLE") {
      if (present) {
        if (this.dwellStart === null) this.dwellStart = now;
        if (now - this.dwellStart >= TRIGGER_DWELL_MS) {
          this.state = "TRIGGERED";
          this.dwellStart = null;
          this.onTriggerCb?.();
        }
      } else {
        this.dwellStart = null;
      }
    } else {
      // TRIGGERED — release uses raw signal. RELEASE_DWELL_MS already absorbs
      // brief misses; extra jitter tolerance here would just slow release.
      if (!phoneDetected) {
        if (this.dwellStart === null) this.dwellStart = now;
        if (now - this.dwellStart >= RELEASE_DWELL_MS) {
          this.state = "IDLE";
          this.dwellStart = null;
          this.onReleaseCb?.();
        }
      } else {
        this.dwellStart = null;
      }
    }
  }

  getState(): State {
    return this.state;
  }
}
