/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-session-manager.js */
import { GestureRecorder } from "../gesture-recorder.js";
import { FeatureExtractor } from "./feature-extractor.js";

/**
 * Manages the data and state for a single gesture creation session,
 * including recording samples and extracting features.
 */
export class StudioSessionManager {
  #gestureRecorder;
  #featureExtractor;
  #currentSetupData;
  #selectedLandmarkIndices = new Set();
  #analysisResult = null;
  #context;
  
  constructor(setupData, context) {
    if (!setupData || !context) {
      throw new Error("StudioSessionManager requires setup data and a context object.");
    }
    this.#currentSetupData = setupData;
    this.#context = context;
    this.#gestureRecorder = new GestureRecorder(setupData.type, setupData.samplesNeeded);
    this.#featureExtractor = new FeatureExtractor(setupData.type);
  }

  // --- Sample Management ---
  
  addSample(snapshot, isMirrored) {
    return this.#gestureRecorder.addSample(snapshot, isMirrored);
  }

  getSamples() {
    return this.#gestureRecorder.getSamples();
  }

  isRecordingComplete() {
    return this.#gestureRecorder.isRecordingComplete();
  }

  resetSamples() {
    this.#gestureRecorder.reset();
    this.#analysisResult = null;
    this.#selectedLandmarkIndices.clear();
  }

  // --- Feature Extraction ---
  
  analyzeSamples() {
    if (!this.#gestureRecorder.isRecordingComplete()) {
      this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastCaptureAllSamples" });
      return null;
    }
    const samples = this.getSamples();
    this.#analysisResult = this.#featureExtractor.extract(samples, this.#selectedLandmarkIndices);
    return this.#analysisResult;
  }

  getAnalysisResult() {
    return this.#analysisResult;
  }

  /**
   * Generates the final JavaScript code string for the gesture definition.
   * @param {number} tolerance - The tolerance value from the UI slider.
   * @returns {string|null} The generated JS code or null if no rules are available.
   */
  generateJsFileContent(tolerance) {
    if (!this.#analysisResult?.rules) {
      this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastNoGeneratedCode" });
      return null;
    }
    const fullJsonDefinition = {
      metadata: { ...this.#currentSetupData },
      rules: this.#analysisResult.rules,
      tolerance,
    };
    return this.#featureExtractor.generateJsFileContent(fullJsonDefinition);
  }
  
  // --- Landmark Selection ---

  setSelectedLandmarkIndices(indices) {
    this.#selectedLandmarkIndices = indices;
  }

  getSelectedLandmarkIndices() {
    return this.#selectedLandmarkIndices;
  }
}