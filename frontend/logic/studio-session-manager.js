/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-session-manager.js */
import { GestureRecorder } from "../gesture-recorder.js";
import { FeatureExtractor } from "./feature-extractor.js";
import { showToastNotification } from "../ui-interactions.js";

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
  #translate;

  constructor(setupData, translate) {
    if (!setupData) {
      throw new Error("StudioSessionManager requires setup data.");
    }
    this.#currentSetupData = setupData;
    this.#translate = translate;
    this.#gestureRecorder = new GestureRecorder(setupData.type, setupData.samplesNeeded);
    this.#featureExtractor = new FeatureExtractor(setupData.type);
  }

  // --- Sample Management ---
  
  addSample(snapshot) {
    return this.#gestureRecorder.addSample(snapshot);
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
      showToastNotification(this.#translate("toastCaptureAllSamples"), true);
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
      showToastNotification(this.#translate("toastNoGeneratedCode"), true);
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