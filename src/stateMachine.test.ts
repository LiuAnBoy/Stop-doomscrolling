import { describe, it, expect, vi } from "vitest";
import {
  StateMachine,
  TRIGGER_DWELL_MS,
  RELEASE_DWELL_MS,
  JITTER_TOLERANCE_MS,
} from "./stateMachine";

describe("StateMachine", () => {
  describe("IDLE → TRIGGERED", () => {
    it("does not trigger before TRIGGER_DWELL_MS", () => {
      const sm = new StateMachine();
      const onTrigger = vi.fn();
      sm.onTrigger(onTrigger);

      sm.update(true, 0);
      sm.update(true, TRIGGER_DWELL_MS - 1);

      expect(onTrigger).not.toHaveBeenCalled();
      expect(sm.getState()).toBe("IDLE");
    });

    it("triggers at exactly TRIGGER_DWELL_MS", () => {
      const sm = new StateMachine();
      const onTrigger = vi.fn();
      sm.onTrigger(onTrigger);

      sm.update(true, 0);
      sm.update(true, TRIGGER_DWELL_MS);

      expect(onTrigger).toHaveBeenCalledOnce();
      expect(sm.getState()).toBe("TRIGGERED");
    });

    it("resets dwell when phone absent for longer than jitter tolerance", () => {
      const sm = new StateMachine();
      const onTrigger = vi.fn();
      sm.onTrigger(onTrigger);

      sm.update(true, 0);
      sm.update(false, JITTER_TOLERANCE_MS + 100); // long gap — reset
      sm.update(true, JITTER_TOLERANCE_MS + 200); // new dwell starts here
      sm.update(true, JITTER_TOLERANCE_MS + 200 + TRIGGER_DWELL_MS - 1); // just short

      expect(onTrigger).not.toHaveBeenCalled();
    });

    it("triggers through brief detection gaps within jitter tolerance", () => {
      const sm = new StateMachine();
      const onTrigger = vi.fn();
      sm.onTrigger(onTrigger);

      // Detector misses every other frame at 15 FPS (~66ms), well within 500ms tolerance
      for (let t = 0; t <= TRIGGER_DWELL_MS + 200; t += 66) {
        sm.update(Math.floor(t / 66) % 2 === 0, t);
      }

      expect(onTrigger).toHaveBeenCalledOnce();
    });
  });

  describe("TRIGGERED → IDLE", () => {
    function makeTriggeredSM() {
      const sm = new StateMachine();
      sm.update(true, 0);
      sm.update(true, TRIGGER_DWELL_MS); // now TRIGGERED
      return sm;
    }

    it("does not release before RELEASE_DWELL_MS", () => {
      const sm = makeTriggeredSM();
      const onRelease = vi.fn();
      sm.onRelease(onRelease);

      sm.update(false, TRIGGER_DWELL_MS + 1);
      sm.update(false, TRIGGER_DWELL_MS + RELEASE_DWELL_MS - 1);

      expect(onRelease).not.toHaveBeenCalled();
      expect(sm.getState()).toBe("TRIGGERED");
    });

    it("releases at exactly RELEASE_DWELL_MS", () => {
      const sm = makeTriggeredSM();
      const onRelease = vi.fn();
      sm.onRelease(onRelease);

      sm.update(false, TRIGGER_DWELL_MS + 1);
      sm.update(false, TRIGGER_DWELL_MS + 1 + RELEASE_DWELL_MS);

      expect(onRelease).toHaveBeenCalledOnce();
      expect(sm.getState()).toBe("IDLE");
    });

    it("resets release dwell when phone reappears", () => {
      const sm = makeTriggeredSM();
      const onRelease = vi.fn();
      sm.onRelease(onRelease);

      const base = TRIGGER_DWELL_MS + 1;
      sm.update(false, base);
      sm.update(false, base + RELEASE_DWELL_MS - 100);
      sm.update(true, base + RELEASE_DWELL_MS - 50); // phone back — reset
      sm.update(false, base + RELEASE_DWELL_MS * 2 - 51);

      expect(onRelease).not.toHaveBeenCalled();
    });
  });
});
