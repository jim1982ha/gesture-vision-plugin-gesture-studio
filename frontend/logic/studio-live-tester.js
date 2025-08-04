/* FILE: extensions/plugins/gesture-studio/frontend/logic/studio-live-tester.js */
/**
 * Manages the live testing phase of the Gesture Studio.
 */
export class StudioLiveTester {
  #baseRulesForTesting = null;
  #currentTolerance = 0.2;
  #gestureProcessorRef = null;

  constructor() {
    // Constructor logic can be added here if needed in the future.
  }

  /**
   * Starts the live test mode.
   * @param {object} rules - The generated gesture rules to test against.
   * @param {number} initialTolerance - The initial tolerance value from the slider.
   * @param {object} gestureProcessor - Reference to the main gesture processor.
   */
  start(rules, initialTolerance, gestureProcessor) {
    this.#baseRulesForTesting = rules;
    this.#currentTolerance = initialTolerance;
    this.#gestureProcessorRef = gestureProcessor;
    
    // The processor is set to test mode, which will trigger the GESTURE_EVENTS.TEST_RESULT event.
    // The main studio-app.js controller listens for this event.
    this.#gestureProcessorRef?.setTestMode(this.#baseRulesForTesting, this.#currentTolerance);
  }

  /**
   * Stops the live test mode.
   */
  stop() {
    this.#baseRulesForTesting = null;
    this.#gestureProcessorRef?.stopTestMode();
  }

  /**
   * Updates the tolerance used for live testing.
   * @param {number} newTolerance - The new tolerance value.
   */
  updateTolerance(newTolerance) {
    this.#currentTolerance = newTolerance;
    this.#gestureProcessorRef?.setTestMode(this.#baseRulesForTesting, this.#currentTolerance);
  }
}