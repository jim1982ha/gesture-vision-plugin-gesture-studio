/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-session-manager.js */
import { FeatureExtractor } from "./feature-extractor.js";

/**
 * Manages the data and state for a single gesture creation session,
 * including recording samples and extracting features.
 * REFACTORED: This class now includes the logic from the former GestureRecorder.
 */
export class StudioSessionManager {
  #featureExtractor;
  #currentSetupData;
  #context;
  #samples = [];
  
  // Static gesture properties
  #selectedLandmarkIndices = new Set();
  #staticAnalysisResult = null;
  
  // Dynamic gesture properties
  #landmark1 = null;
  #landmark2 = null;
  #minDistance = null;
  #maxDistance = null;

  constructor(setupData, context) {
    if (!setupData || !context) {
      throw new Error("StudioSessionManager requires setup data and a context object.");
    }
    this.#currentSetupData = setupData;
    this.#context = context;
    this.#featureExtractor = new FeatureExtractor(setupData.type);
    this.resetSamples();
  }

  // --- Sample Management (from GestureRecorder) ---
  
  addSample(snapshot, isMirrored = false) {
    if (this.#samples.length >= this.getSamplesNeeded()) return false;
    
    const imageSource = snapshot?.imageData;

    if (
      !snapshot ||
      !Array.isArray(snapshot.landmarks2d) ||
      snapshot.landmarks2d.length === 0 ||
      !(imageSource instanceof ImageData)
    ) {
      console.warn(
        "[SessionManager] Attempted to add invalid sample (missing landmarks2d or valid ImageData). Sample rejected.",
        snapshot
      );
      return false;
    }

    this.#samples.push({
      type: this.getGestureType(),
      landmarks2d: snapshot.landmarks2d, // For drawing
      landmarks3d: snapshot.landmarks3d, // For analysis
      imageData: imageSource,
      isMirrored: isMirrored,
    });
    
    return true;
  }

  getSamples() { return this.#samples.map((s) => ({ ...s })); }
  isRecordingComplete() { return this.#samples.length >= this.getSamplesNeeded(); }
  
  resetSamples() {
    this.#samples = [];
    this.#staticAnalysisResult = null;
    this.#selectedLandmarkIndices.clear();
    this.#landmark1 = null;
    this.#landmark2 = null;
    this.#minDistance = null;
    this.#maxDistance = null;
  }

  // --- Feature Extraction ---
  
  analyzeSamples() {
    if (this.getCreationType() === 'static' && !this.isRecordingComplete()) {
        this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastCaptureAllSamples" });
        return null;
    }
    if (this.getCreationType() === 'static') {
        const samples = this.getSamples();
        this.#staticAnalysisResult = this.#featureExtractor.extract(samples, this.#selectedLandmarkIndices);
        return this.#staticAnalysisResult;
    }
    return { rules: { type: 'dynamic' } };
  }

  getAnalysisResult() {
    if (this.getCreationType() === 'dynamic') {
        return { rules: { type: 'dynamic' }, focusPoints: [this.#landmark1, this.#landmark2].filter(i => i !== null) };
    }
    return this.#staticAnalysisResult;
  }

  /**
   * Generates the final JavaScript code string for the gesture definition.
   * @param {number} tolerance - The tolerance value from the UI slider.
   * @returns {string|null} The generated JS code or null if no rules are available.
   */
  generateJsFileContent(tolerance) {
    if (this.getCreationType() === 'dynamic') {
      if (this.#landmark1 === null || this.#landmark2 === null || this.#minDistance === null || this.#maxDistance === null) {
        this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "studioNotCalibrated" });
        return null;
      }
      const dynamicDefinition = { metadata: { ...this.#currentSetupData }, landmark1: this.#landmark1, landmark2: this.#landmark2, minDistance: this.#minDistance, maxDistance: this.#maxDistance, tolerance };
      return this.#featureExtractor.generateDynamicGestureJsFileContent(dynamicDefinition);
    } else { // Static
      if (!this.#staticAnalysisResult?.rules) {
        this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastNoGeneratedCode" });
        return null;
      }
      const staticDefinition = { metadata: { ...this.#currentSetupData }, rules: this.#staticAnalysisResult.rules, focusPoints: this.#staticAnalysisResult.focusPoints, tolerance, };
      return this.#featureExtractor.generateStaticGestureJsFileContent(staticDefinition);
    }
  }
  
  // --- Getters & Setters ---

  setSelectedStaticLandmarkIndices(indices) { this.#selectedLandmarkIndices = indices; }
  getSelectedStaticLandmarkIndices() { return this.#selectedLandmarkIndices; }
  setDynamicLandmarks(indices) { const [p1, p2] = indices; this.#landmark1 = p1; this.#landmark2 = p2; }
  getDynamicLandmarks() { return [this.#landmark1, this.#landmark2].filter(i => i !== null); }
  setMinDistance(distance) { this.#minDistance = distance; }
  getMinDistance() { return this.#minDistance; }
  setMaxDistance(distance) { this.#maxDistance = distance; }
  getMaxDistance() { return this.#maxDistance; }
  getCreationType() { return this.#currentSetupData.creationType; }
  getGestureType() { return this.#currentSetupData.type; }
  getSamplesNeeded() { return this.#currentSetupData.samplesNeeded; }
}