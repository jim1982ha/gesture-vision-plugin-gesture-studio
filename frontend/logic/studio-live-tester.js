/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-live-tester.js */
/**
 * Manages the live testing phase of the Gesture Studio on the main thread.
 * It is now a simple executor for a pre-compiled check function.
 */
export class StudioLiveTester {
  #checkFunction = null;

  constructor() {}

  /**
   * Starts the live test mode by storing a ready-to-use check function.
   * @param {function} checkFunction - The compiled function to execute on each frame.
   */
  start(checkFunction) {
    this.#checkFunction = checkFunction;
  }

  stop() {
    this.#checkFunction = null;
  }

  /**
   * Executes the stored check function against live landmark data.
   * @param {object[]} landmarks - The 2D screen-space landmarks.
   * @param {object[]} worldLandmarks - The 3D world-space landmarks.
   * @returns The detection result from the check function.
   */
  check(landmarks, worldLandmarks) {
    if (typeof this.#checkFunction !== 'function') {
      return { detected: false, confidence: 0, requiredConfidence: 0.0 };
    }
  
    try {
      // Simply execute the provided function. It has all necessary context (like tolerance) baked in.
      return this.#checkFunction(landmarks, worldLandmarks);
    } catch (e) {
      console.error("[StudioLiveTester] Error during live check execution:", e);
      this.stop();
      return { detected: false, confidence: 0, requiredConfidence: 0.0 };
    }
  }
}