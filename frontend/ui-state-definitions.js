/* FILE: extensions/plugins/gesture-studio/frontend/ui-state-definitions.js */
import { UIElements } from "./ui-elements.js";
const { setIcon } = window.GestureVision.ui.components;

function setElementVisibility(element, isVisible) {
  if (!element) return;
  element.classList.toggle("hidden", !isVisible);
}

function updateDynamicTexts(state, payload) {
  const translate = payload.translate;
  if (!translate) return;

  if (UIElements.samplesCounterDisplay) {
    UIElements.samplesCounterDisplay.textContent = translate(
      "studioSamplesLabel",
      {
        captured: payload.samplesCount ?? 0,
        needed: payload.samplesNeeded ?? 3,
      }
    );
  }

  const workflowBtnText = UIElements.recordWorkflowBtnText;
  if (!workflowBtnText) return;

  switch (state) {
    case "ready_to_record":
      workflowBtnText.textContent = translate("studioRecordSample", {
        count: payload.samplesCount ?? 0,
        needed: payload.samplesNeeded ?? 3,
      });
      break;
    case "all_samples_recorded":
      workflowBtnText.textContent = translate("studioAnalyzeAndGenerate");
      break;
    case "capturing_sample":
      // This case is now handled by the countdown overlay, so no button text change is needed.
      break;
  }
}

export function updateUIState(state, payload = {}) {
  const {
    defineSection,
    recordSection,
    testSection,
    studioStepTitle,
    studioStepIcon,
    recordWorkflowBtn,
    countdownOverlay,
    countdownOverlayText,
    liveTestDisplay,
  } = UIElements;
  
  const translate = payload.translate;
  if (!translate) {
      console.warn("[updateUIState] translate function not provided in payload. UI text may not update.");
      return;
  }

  // --- Reset all sections to hidden by default ---
  setElementVisibility(defineSection, false);
  setElementVisibility(recordSection, false);
  setElementVisibility(testSection, false);
  setElementVisibility(countdownOverlay, false);
  setElementVisibility(liveTestDisplay, false);

  updateDynamicTexts(state, payload);

  let stepTitleKey = "";
  let stepIconKey = "";

  switch (state) {
    case "initial_define_record":
    case "error_state":
      setElementVisibility(defineSection, true);
      stepTitleKey = "studioStepDefineTitle";
      stepIconKey = "edit_note";
      break;

    case "camera_starting":
    case "ready_to_record":
    case "all_samples_recorded":
      setElementVisibility(recordSection, true);
      stepTitleKey = "studioStepRecordTitle";
      stepIconKey = "camera";

      if (recordWorkflowBtn) {
        recordWorkflowBtn.disabled = false;
        setIcon(
          recordWorkflowBtn,
          state === "all_samples_recorded" ? "UI_ANALYZE" : "UI_ADD"
        );
      }
      break;
    
    case "capturing_sample":
      setElementVisibility(recordSection, true);
      stepTitleKey = "studioStepRecordTitle";
      stepIconKey = "camera";
      
      if (recordWorkflowBtn) recordWorkflowBtn.disabled = true;

      setElementVisibility(countdownOverlay, true);
      if (countdownOverlayText) countdownOverlayText.textContent = payload.countdownValue ?? '...';
      break;

    case "analyzing_features":
      setElementVisibility(recordSection, true);
      stepTitleKey = "studioStepRecordTitle";
      stepIconKey = "camera";
      if (recordWorkflowBtn) {
        recordWorkflowBtn.disabled = true;
        setIcon(recordWorkflowBtn, "UI_HOURGLASS");
        if (UIElements.recordWorkflowBtnText) UIElements.recordWorkflowBtnText.textContent = translate("studioAnalysisStatusAnalyzing");
      }
      break;

    case "saving":
    case "testing_gesture":
      { // FIX: Added block scope for lexical declaration
        setElementVisibility(testSection, true);
        setElementVisibility(liveTestDisplay, true);
        stepTitleKey = "studioStepTestTitle";
        stepIconKey = "biotech";
        
        const { saveGestureBtn, backToSetupBtn } = UIElements;
        if (saveGestureBtn) saveGestureBtn.disabled = state === "saving";
        if (backToSetupBtn) backToSetupBtn.disabled = state === "saving";
        break;
      }
  }

  if (studioStepTitle && stepTitleKey) studioStepTitle.textContent = translate(stepTitleKey);
  if (studioStepIcon && stepIconKey) setIcon(studioStepIcon, stepIconKey);
}