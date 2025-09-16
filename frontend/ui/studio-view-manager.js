/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/studio-view-manager.js */

/**
 * Manages which "view" or "step" of the Gesture Studio is currently visible.
 */
export class StudioViewManager {
    #elements;
    #translate;
    #setIcon;
    #setElementVisibility;
    #currentState = "initial_select_type";

    constructor(elements, context) {
        this.#elements = elements;
        this.#translate = context.services.translationService.translate;
        this.#setIcon = context.uiComponents.setIcon;
        this.#setElementVisibility = context.uiComponents.setElementVisibility;
    }

    getCurrentState = () => this.#currentState;
    setCurrentState = (newState) => { this.#currentState = newState; };

    renderState(state, payload) {
        const { defineSection, recordSection, testSection, studioStepTitle, studioStepIcon, recordWorkflowBtn, recordWorkflowBtnText, countdownOverlay, countdownOverlayText, liveTestDisplay, backToSetupBtn, backToSetupBtnFromRecord, backToSetupBtnFromTest, resetSamplesBtn, saveGestureBtn, creationTypeSelectionSection, defineDynamicSection, defineCommonSection, studioVideoColumn, dynamicWorkflowBtn } = this.#elements;
        
        const allSections = [creationTypeSelectionSection, defineCommonSection, defineDynamicSection, recordSection, testSection, countdownOverlay, liveTestDisplay];
        allSections.forEach(el => this.#setElementVisibility(el, false));

        let stepTitleKey = "";
        let stepIconKey = "";

        // Ensure all back buttons have an icon.
        this.#setIcon(backToSetupBtn, 'UI_ONE');
        this.#setIcon(backToSetupBtnFromRecord, 'UI_ONE');
        this.#setIcon(this.#elements.backToSetupBtnFromDynamic, 'UI_ONE');
        this.#setIcon(backToSetupBtnFromTest, 'UI_ONE');
        this.#setIcon(resetSamplesBtn, 'UI_UNDO');
        this.#setIcon(saveGestureBtn, 'UI_SAVE');
        
        this.#setElementVisibility(studioVideoColumn, state !== 'initial_select_type' && state !== 'initial_define_record' && state !== 'initial_define_dynamic' && state !== 'error_state');

        switch (state) {
            case "initial_select_type":
                this.#setElementVisibility(creationTypeSelectionSection, true);
                stepTitleKey = "studioCreationTypeTitle";
                stepIconKey = "quiz";
                break;
            case "initial_define_record":
            case "initial_define_dynamic":
            case "error_state":
                this.#setElementVisibility(defineCommonSection, true);
                this.#setElementVisibility(defineSection, state === 'initial_define_record' || state === 'error_state');
                stepTitleKey = "studioStepDefineTitle";
                stepIconKey = "edit_note";
                this.#setIcon(this.#elements.confirmSetupStartCameraBtn, 'UI_TWO');
                break;
            case "calibrate_dynamic_gesture":
            case "testing_gesture": {
                if (state === "calibrate_dynamic_gesture") {
                    this.#setElementVisibility(defineDynamicSection, true);
                    stepTitleKey = "studioStepDefineDynamicTitle";
                    stepIconKey = "tune";
                    this.#setIcon(dynamicWorkflowBtn, 'UI_THREE');
                } else { // testing_gesture
                    this.#setElementVisibility(testSection, true);
                    stepTitleKey = "studioStepTestTitle";
                    stepIconKey = "biotech";
                }
                 this.#setElementVisibility(liveTestDisplay, true);
                 liveTestDisplay.classList.remove('top-2', 'left-2', 'text-sm', 'font-mono');
                 liveTestDisplay.classList.add('bottom-2', 'right-2', 'text-xs');
                 if (saveGestureBtn) saveGestureBtn.disabled = state === "saving";
                 if (backToSetupBtn) backToSetupBtn.disabled = state === "saving";
                 break;
            }
            case "ready_to_record":
            case "all_samples_recorded":
                this.#setElementVisibility(recordSection, true);
                stepTitleKey = "studioStepRecordTitle";
                stepIconKey = "camera";
                if (recordWorkflowBtn && recordWorkflowBtnText) {
                    recordWorkflowBtn.disabled = false;
                    const isDone = state === "all_samples_recorded";
                    this.#setIcon(recordWorkflowBtn, isDone ? "UI_THREE" : "UI_ADD");
                    recordWorkflowBtnText.textContent = this.#translate(isDone ? 'studioAnalyzeAndGenerate' : 'studioRecordSample', { count: payload.samplesCount, needed: payload.samplesNeeded });
                }
                break;
            case "capturing_sample":
                this.#setElementVisibility(recordSection, true);
                stepTitleKey = "studioStepRecordTitle";
                stepIconKey = "camera";
                if (recordWorkflowBtn) recordWorkflowBtn.disabled = true;
                this.#setElementVisibility(countdownOverlay, true);
                if (countdownOverlayText) countdownOverlayText.textContent = payload.countdownValue ?? '...';
                break;
            case "analyzing_features":
                this.#setElementVisibility(recordSection, true);
                stepTitleKey = "studioStepRecordTitle";
                stepIconKey = "camera";
                if (recordWorkflowBtn && recordWorkflowBtnText) {
                    recordWorkflowBtn.disabled = true;
                    this.#setIcon(recordWorkflowBtn, "UI_HOURGLASS");
                    recordWorkflowBtnText.textContent = this.#translate('studioAnalysisStatusAnalyzing');
                }
                break;
        }

        if (studioStepTitle && stepTitleKey) studioStepTitle.textContent = this.#translate(stepTitleKey);
        if (studioStepIcon && stepIconKey) this.#setIcon(studioStepIcon, stepIconKey);
    }
}