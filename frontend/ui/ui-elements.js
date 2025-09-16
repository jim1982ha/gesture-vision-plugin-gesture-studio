/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/ui-elements.js */
// Defines and exports a map of element IDs used within the Gesture Studio modal.

export const elementIdMap = {
  // Shell and Header
  studioShell: "studio-shell",
  studioModalContent: "studio-modal-content",
  studioModalHeader: "studio-modal-header",
  studioHeaderTitleText: "studio-header-title-text",
  studioHeaderIcon: "studio-header-icon",
  studioCloseBtn: "studio-close-btn",
  
  // Columns and Sections
  studioContentWrapper: "studio-content-wrapper",
  studioVideoColumn: "studio-video-column",
  studioControlsColumn: "studio-controls-column",
  
  // Initial Type Selection
  creationTypeSelectionSection: "creation-type-selection-section",
  staticTypeBtn: "static-type-btn",
  dynamicTypeBtn: "dynamic-type-btn",
  
  // Common definition fields for both workflows
  defineCommonSection: "define-common-section",

  // Static-specific definition fields
  defineSection: "define-section",

  // Dynamic-specific definition fields
  defineDynamicSection: "define-dynamic-section",
  selectLandmarksBtn: "select-landmarks-btn",
  selectedLandmarksDisplay: "selected-landmarks-display",
  calibrateMinBtn: "calibrate-min-btn",
  calibrateMaxBtn: "calibrate-max-btn",
  calibrationResultDisplay: "calibration-result-display",
  minDistanceDisplay: "min-distance-display",
  maxDistanceDisplay: "max-distance-display",
  dynamicWorkflowBtn: "dynamic-workflow-btn",
  dynamicWorkflowBtnText: "dynamic-workflow-btn-text",
  backToSetupBtnFromDynamic: "back-to-setup-btn-from-dynamic",

  // Shared Card Elements
  studioStepTitle: "studio-step-title",
  studioStepIcon: "studio-step-icon",

  // Common Define fields (now in define-common-section)
  labelGestureName: "label-gesture-name",
  gestureNameInput: "gesture-name",
  labelGestureDescription: "label-gesture-description",
  gestureDescriptionInput: "gesture-description",
  labelGestureType: "label-gesture-type",
  gestureTypeSelect: "gesture-type",
  optionGestureTypeHand: "option-gesture-type-hand",
  optionGestureTypePose: "option-gesture-type-pose",
  labelCameraSource: "label-camera-source",
  studioCameraSelect: "studio-camera-select",
  confirmSetupStartCameraBtn: "confirm-setup-start-camera-btn",
  btnTextConfirmSetup: "btn-text-confirm-setup",

  // Static-specific fields
  labelSamplesToRecord: "label-samples-to-record",
  samplesToRecordInput: "samples-to-record",
  
  // Record Section (Static)
  studioVideoPlaceholder: "studio-video-placeholder",
  recordSection: "record-section",
  samplesCounterDisplay: "samples-counter-display",
  samplesPreview: "samples-preview",
  resetSamplesBtn: "reset-samples-btn",
  btnTextResetSamples: "btn-text-reset-samples",
  recordWorkflowBtn: "record-workflow-btn",
  recordWorkflowBtnText: "record-workflow-btn-text",
  countdownOverlay: "countdown-overlay",
  countdownOverlayText: "countdown-overlay-text",
  backToSetupBtnFromRecord: "back-to-setup-btn-from-record",
  
  // Test Section (Shared)
  testSection: "test-section",
  liveTestDisplay: "live-test-display",
  realtimeDistanceDisplay: "realtime-distance-display", // Added for real-time diagnostics
  liveDetectedStatus: "live-detected-status",
  liveConfidenceValue: "live-confidence-value",
  liveRequiredConfidenceValue: "live-required-confidence-value",
  gestureToleranceSlider: "gestureToleranceSlider",
  gestureToleranceValue: "gestureToleranceValue",
  generatedCodeDetailsContainer: "generated-code-details-container",
  generatedCodeTextarea: "generated-code",
  analysisDetailsContainer: "analysis-details-container",
  analysisStatus: "analysis-status",
  extractedFeaturesDisplay: "extracted-features-display",
  testControlsGroup: "test-controls-group",
  backToSetupBtn: "back-to-setup-btn",
  backToSetupBtnFromTest: "back-to-setup-btn-from-test",
  btnTextBackToSetup: "btn-text-back-to-setup",
  saveGestureBtn: "save-gesture-btn",
  btnTextSaveGesture: "btn-text-save-gesture",
};

// This object will be populated at runtime by the StudioController
export const UIElements = {};