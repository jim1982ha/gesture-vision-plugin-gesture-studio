/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui-elements.js */
// Defines and exports a map of element IDs used within the Gesture Studio modal.

export const elementIdMap = {
  // Shell and Header
  studioShell: "studio-shell",
  studioHeaderTitleText: "studio-header-title-text",
  studioHeaderIcon: "studio-header-icon", // FIX: Add the missing header icon ID
  closeStudioBtn: "close-studio-btn",
  
  // Columns and Sections
  studioContentWrapper: "studio-content-wrapper",
  studioVideoColumn: "studio-video-column",
  studioControlsColumn: "studio-controls-column",
  defineSection: "define-section",
  recordSection: "record-section",
  testSection: "test-section",

  // Shared Card Elements
  studioStepTitle: "studio-step-title",
  studioStepIcon: "studio-step-icon",

  // Step 1: Define
  labelGestureName: "label-gesture-name",
  gestureNameInput: "gesture-name",
  labelGestureDescription: "label-gesture-description",
  gestureDescriptionInput: "gesture-description",
  labelGestureType: "label-gesture-type",
  gestureTypeSelect: "gesture-type",
  optionGestureTypeHand: "option-gesture-type-hand",
  optionGestureTypePose: "option-gesture-type-pose",
  labelSamplesToRecord: "label-samples-to-record",
  samplesToRecordInput: "samples-to-record",
  labelCameraSource: "label-camera-source",
  studioCameraSelect: "studio-camera-select",
  confirmSetupStartCameraBtn: "confirm-setup-start-camera-btn",
  btnTextConfirmSetup: "btn-text-confirm-setup",

  // Step 2: Record
  studioVideoPlaceholder: "studio-video-placeholder",
  samplesCounterDisplay: "samples-counter-display",
  samplesPreview: "samples-preview",
  resetSamplesBtn: "reset-samples-btn",
  btnTextResetSamples: "btn-text-reset-samples",
  recordWorkflowBtn: "record-workflow-btn",
  recordWorkflowBtnText: "record-workflow-btn-text",
  countdownOverlay: "countdown-overlay",
  countdownOverlayText: "countdown-overlay-text",
  backToSetupBtnFromRecord: "back-to-setup-btn-from-record",
  
  // Step 3: Test
  liveTestDisplay: "live-test-display",
  liveStatusLabel: "live-status-label",
  liveDetectedStatus: "live-detected-status",
  liveConfidenceLabel: "live-confidence-label",
  liveConfidenceValue: "live-confidence-value",
  liveRequiredConfidenceLabel: "live-required-confidence-label",
  liveRequiredConfidenceValue: "live-required-confidence-value",
  "label-gesture-tolerance": "label-gesture-tolerance",
  generatedCodeDetailsContainer: "generated-code-details-container",
  labelGeneratedCode: "label-generated-code",
  generatedCodeTextarea: "generated-code",
  analysisDetailsContainer: "analysis-details-container",
  labelAnalysis: "label-analysis",
  analysisStatus: "analysis-status",
  extractedFeaturesDisplay: "extracted-features-display",
  testControlsGroup: "test-controls-group",
  backToSetupBtn: "back-to-setup-btn",
  btnTextBackToSetup: "btn-text-back-to-setup",
  saveGestureBtn: "save-gesture-btn",
  btnTextSaveGesture: "btn-text-save-gesture",
};

// This object will be populated at runtime by the StudioController
export const UIElements = {};