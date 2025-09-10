/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/studio-ui-manager.js */
import { UIElements, elementIdMap } from "./ui-elements.js";

/**
 * Sets the visibility of an HTML element by toggling a 'hidden' class.
 * This is a local utility to avoid a direct import from the core frontend.
 * @param {HTMLElement | null | undefined} element The HTML element.
 * @param {boolean} isVisible True to show the element, false to hide.
 * @param {string} displayStyleWhenVisible The display style to apply.
 */
function setElementVisibility(
  element,
  isVisible,
  displayStyleWhenVisible = 'block'
) {
  if (!element) return;
  element.classList.toggle('hidden', !isVisible);
  if (isVisible && element.style.display === 'none') {
    element.style.display = displayStyleWhenVisible;
  }
}

/**
 * Manages all direct DOM creation, querying, and manipulation for the Gesture Studio modal.
 */
export class StudioUIManager {
    #modalContainer;
    #translate;
    #setIcon;
    #context;

    constructor(modalContainer, context) {
        this.#modalContainer = modalContainer;
        this.#context = context;
        this.#translate = context.services.translate;
        this.#setIcon = context.uiComponents.setIcon;
    }

    buildModalContent() {
        this.#modalContainer.innerHTML = `
            <div id="studio-modal-content" class="modal-content !max-w-6xl h-[90vh]">
                <div id="studio-modal-header" class="modal-header">
                    <span id="studio-header-icon" class="header-icon material-icons"></span>
                    <span class="header-title" id="studio-header-title-text"></span>
                    <button id="studio-close-btn" class="btn btn-icon header-close-btn" aria-label="Close"><span class="mdi"></span></button>
                </div>
                <div class="modal-scrollable-content p-2 desktop:p-4">
                    <div id="studio-content-wrapper" class="flex flex-col desktop:flex-row gap-4 w-full h-full">
                        <div id="studio-video-column" class="flex-grow-[2] min-w-0 min-h-[200px] desktop:min-h-0 relative flex">
                            <div id="studio-video-placeholder" class="relative flex-grow flex items-center justify-center bg-background rounded-md overflow-hidden">
                                <div id="live-test-display" class="absolute bottom-2 right-2 z-10 bg-surface/80 text-text-primary p-2 rounded-md shadow-lg text-xs leading-tight backdrop-blur-sm hidden">
                                    <div><span data-translate-key="studioLiveStatus"></span>: <strong id="live-detected-status"></strong></div>
                                    <div><span data-translate-key="studioLiveConfidence"></span>: <span id="live-confidence-value"></span></div>
                                    <div><span data-translate-key="studioRequiredConfidenceLabel"></span>: <span id="live-required-confidence-value"></span></div>
                                </div>
                                <div id="countdown-overlay" class="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-md">
                                    <span id="countdown-overlay-text" class="text-white text-7xl desktop:text-9xl font-bold [text-shadow:_0_0_20px_black] animate-pulse">3</span>
                                </div>
                            </div>
                        </div>
                        <div id="studio-controls-column" class="flex-grow min-w-[320px] flex flex-col">
                            <div class="bg-surface border border-border rounded-lg shadow-sm p-3 flex flex-col h-full">
                                <div class="flex items-center gap-2 mb-2">
                                    <span id="studio-step-icon" class="material-icons text-primary text-xl"></span>
                                    <span id="studio-step-title" class="text-base font-semibold text-text-primary" data-translate-key="studioStepDefineTitle"></span>
                                </div>
                                <div class="flex-grow min-h-0 flex flex-col">
                                    <section id="define-section" class="flex flex-col justify-between h-full">
                                        <div class="flex flex-col gap-3">
                                            <div class="form-group !mb-0"><label id="label-gesture-name" for="gesture-name" class="form-label" data-translate-key="studioGestureName"></label><input type="text" id="gesture-name" class="form-control" data-translate-key-placeholder="studioGestureNamePlaceholder"></div>
                                            <div class="form-group !mb-0"><label id="label-gesture-description" for="gesture-description" class="form-label" data-translate-key="studioGestureDesc"></label><textarea id="gesture-description" class="form-control" rows="2" data-translate-key-placeholder="studioGestureDescPlaceholder"></textarea></div>
                                            <div class="form-row"><div class="form-group !mb-0"><label id="label-gesture-type" for="gesture-type" class="form-label" data-translate-key="studioGestureType"></label><select id="gesture-type" class="form-control"><option id="option-gesture-type-hand" value="hand" data-translate-key="studioGestureTypeHand"></option><option id="option-gesture-type-pose" value="pose" data-translate-key="studioGestureTypePose"></option></select></div><div class="form-group !mb-0"><label id="label-samples-to-record" for="samples-to-record" class="form-label" data-translate-key="studioSamplesToRecord"></label><input type="number" id="samples-to-record" class="form-control" value="3" min="3" max="10"></div></div>
                                            <div class="form-group !mb-0"><label id="label-camera-source" for="studio-camera-select" class="form-label" data-translate-key="selectCameraSource"></label><select id="studio-camera-select" class="form-control"></select></div>
                                        </div>
                                        <div class="flex justify-between items-center mt-auto">
                                            <div></div>
                                            <button id="confirm-setup-start-camera-btn" class="btn btn-primary"><span class="material-icons"></span><span id="btn-text-confirm-setup" data-translate-key="studioConfirmAndStart"></span></button>
                                        </div>
                                    </section>
                                    <section id="record-section" class="h-full flex flex-col gap-3 justify-center">
                                        <p id="samples-counter-display"></p>
                                        <div id="samples-preview" class="flex-grow-0 min-h-[110px] bg-background border border-border rounded-md p-2 flex flex-wrap justify-center content-start items-center gap-1 overflow-y-auto"></div>
                                        <div class="flex justify-between items-center mt-auto">
                                            <button id="back-to-setup-btn-from-record" class="btn btn-secondary"><span class="material-icons"></span><span data-translate-key="studioStartOver"></span></button>
                                            <div class="flex gap-2">
                                                <button id="reset-samples-btn" class="btn btn-secondary"><span class="material-icons"></span><span id="btn-text-reset-samples" data-translate-key="studioResetSamples"></span></button>
                                                <button id="record-workflow-btn" class="btn btn-primary"><span class="material-icons"></span><span id="record-workflow-btn-text" data-translate-key="studioRecordSample"></span></button>
                                            </div>
                                        </div>
                                    </section>
                                    <section id="test-section" class="h-full flex flex-col gap-3 justify-between">
                                        <div class="form-group !mb-0"><label for="gestureToleranceSlider" id="label-gesture-tolerance" class="form-label" data-translate-key="studioToleranceLabel"></label><div class="slider-group"><output for="gestureToleranceSlider" id="gestureToleranceValue" class="slider-output">20%</output><div class="slider-container"><input type="range" id="gestureToleranceSlider" class="form-slider" min="0" max="1" step="0.05" value="0.2"></div></div></div>
                                        <details id="analysis-details-container" class="border border-border-light rounded p-2"><summary class="cursor-pointer font-medium flex items-center gap-1 list-none"><span class="material-icons"></span> <span data-translate-key="studioAnalysis"></span></summary><p id="analysis-status" class="mt-2"></p><pre id="extracted-features-display" class="text-xs font-mono bg-background border border-border rounded p-2 mt-2 min-h-[100px] max-h-[150px] overflow-auto whitespace-pre-wrap"></pre></details>
                                        <details id="generated-code-details-container" class="border border-border-light rounded p-2" open><summary class="cursor-pointer font-medium flex items-center gap-1 list-none"><span class="material-icons"></span> <span data-translate-key="studioGeneratedJS"></span></summary><div class="mt-2"><textarea id="generated-code" class="form-control text-xs font-mono !bg-background" rows="15" readonly></textarea></div></details>
                                        <div id="test-controls-group" class="flex justify-between items-center mt-auto">
                                            <button id="back-to-setup-btn" class="btn btn-secondary"><span class="material-icons"></span><span id="btn-text-back-to-setup" data-translate-key="studioStartOver"></span></button>
                                            <button id="save-gesture-btn" class="btn btn-primary"><span class="material-icons"></span><span id="btn-text-save-gesture" data-translate-key="studioSaveGesture"></span></button>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        for (const key in elementIdMap) {
            const id = elementIdMap[key];
            if (id) UIElements[key] = this.#modalContainer.querySelector(`#${id}`);
        }
    }

    getSetupData() {
        const samplesInput = UIElements.samplesToRecordInput;
        let samplesToRecord = 3;
        if (samplesInput && samplesInput.value) {
            const val = parseInt(samplesInput.value, 10);
            if (!isNaN(val) && val >= 3 && val <= 10) {
                samplesToRecord = val;
            } else {
                samplesInput.value = "3";
                this.#context.services.pubsub.publish(this.#context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'toastInvalidSampleCount' });
            }
        }
        return {
            name: UIElements.gestureNameInput?.value.trim() || "MyCustomGesture",
            description: UIElements.gestureDescriptionInput?.value.trim() || "A custom gesture.",
            type: UIElements.gestureTypeSelect?.value || "hand",
            samplesNeeded: samplesToRecord,
            cameraId: UIElements.studioCameraSelect?.value || "",
        };
    }

    renderState(state, payload) {
        const { defineSection, recordSection, testSection, studioStepTitle, studioStepIcon, recordWorkflowBtn, countdownOverlay, countdownOverlayText, liveTestDisplay, backToSetupBtn, backToSetupBtnFromRecord, resetSamplesBtn, saveGestureBtn } = UIElements;
        
        setElementVisibility(defineSection, false);
        setElementVisibility(recordSection, false);
        setElementVisibility(testSection, false);
        setElementVisibility(countdownOverlay, false);
        setElementVisibility(liveTestDisplay, false);

        this.#updateDynamicTexts(state, payload);

        let stepTitleKey = "";
        let stepIconKey = "";

        this.#setIcon(backToSetupBtn, 'UI_CANCEL');
        this.#setIcon(backToSetupBtnFromRecord, 'UI_CANCEL');
        this.#setIcon(resetSamplesBtn, 'UI_DELETE');
        this.#setIcon(saveGestureBtn, 'UI_SAVE');
        const headerIcon = this.#modalContainer.querySelector('.header-icon');
        if (headerIcon) this.#setIcon(headerIcon, 'UI_GESTURE');

        switch (state) {
            case "initial_define_record":
            case "error_state":
                setElementVisibility(defineSection, true);
                stepTitleKey = "studioStepDefineTitle";
                stepIconKey = "edit_note";
                this.#setIcon(UIElements.confirmSetupStartCameraBtn, 'UI_CONFIRM');
                break;
            case "ready_to_record":
            case "all_samples_recorded":
                setElementVisibility(recordSection, true);
                stepTitleKey = "studioStepRecordTitle";
                stepIconKey = "camera";
                if (recordWorkflowBtn) {
                    recordWorkflowBtn.disabled = false;
                    this.#setIcon(recordWorkflowBtn, state === "all_samples_recorded" ? "UI_ANALYZE" : "UI_ADD");
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
                    this.#setIcon(recordWorkflowBtn, "UI_HOURGLASS");
                    if (UIElements.recordWorkflowBtnText) UIElements.recordWorkflowBtnText.textContent = this.#translate("studioAnalysisStatusAnalyzing");
                }
                break;
            case "saving":
            case "testing_gesture":
                setElementVisibility(testSection, true);
                setElementVisibility(liveTestDisplay, true);
                stepTitleKey = "studioStepTestTitle";
                stepIconKey = "biotech";
                if (saveGestureBtn) saveGestureBtn.disabled = state === "saving";
                if (backToSetupBtn) backToSetupBtn.disabled = state === "saving";
                break;
        }

        if (studioStepTitle && stepTitleKey) studioStepTitle.textContent = this.#translate(stepTitleKey);
        if (studioStepIcon && stepIconKey) this.#setIcon(studioStepIcon, stepIconKey);
    }

    #updateDynamicTexts(state, payload) {
        if (UIElements.samplesCounterDisplay) {
            UIElements.samplesCounterDisplay.textContent = this.#translate("studioSamplesLabel", { captured: payload.samplesCount ?? 0, needed: payload.samplesNeeded ?? 3 });
        }
        const workflowBtnText = UIElements.recordWorkflowBtnText;
        if (!workflowBtnText) return;
        if (state === "ready_to_record") {
            workflowBtnText.textContent = this.#translate("studioRecordSample", { count: payload.samplesCount ?? 0, needed: payload.samplesNeeded ?? 3 });
        } else if (state === "all_samples_recorded") {
            workflowBtnText.textContent = this.#translate("studioAnalyzeAndGenerate");
        }
    }
    
    updateSamplesDisplay(samples, onSampleClick) {
        if(!UIElements.samplesPreview) return;
        UIElements.samplesPreview.innerHTML = '';
        samples.forEach((sample, index) => {
            const canvas = document.createElement("canvas");
            canvas.className = "w-[120px] h-[90px] border border-border dark:border-dark-border rounded-md cursor-pointer hover:border-primary dark:hover:border-dark-primary hover:shadow-lg";
            canvas.title = "Click to select focus points for this sample";
            if (typeof onSampleClick === 'function') {
                canvas.addEventListener('click', () => onSampleClick(index));
            }
    
            const ctx = canvas.getContext("2d");
            if (ctx && sample.imageData instanceof ImageData) {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = sample.imageData.width;
                tempCanvas.height = sample.imageData.height;
                const tempCtx = tempCanvas.getContext("2d");
                if (tempCtx) {
                    if (sample.isMirrored) {
                        ctx.save();
                        ctx.scale(-1, 1);
                        ctx.translate(-canvas.width, 0);
                    }
                    tempCtx.putImageData(sample.imageData, 0, 0);
                    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
                    if (sample.isMirrored) {
                        ctx.restore();
                    }
                }
            }
            UIElements.samplesPreview.appendChild(canvas);
        });
    }

    showAnalysisResults(features, translate) {
        if (UIElements.analysisStatus) UIElements.analysisStatus.textContent = translate("studioAnalysisStatusComplete");
        if (UIElements.extractedFeaturesDisplay) UIElements.extractedFeaturesDisplay.textContent = features ? JSON.stringify(features, null, 2) : translate("studioAnalysisStatusFailed");
    }

    displayGeneratedCode(codeString) { 
        if (UIElements.generatedCodeTextarea) {
            UIElements.generatedCodeTextarea.value = codeString || '';
        }
    }
    
    updateLiveConfidenceDisplay(result, translate) {
        if (UIElements.liveDetectedStatus) {
            const detectedText = result?.detected ? translate("studioStatusDetected") : translate("studioStatusNotDetected");
            const colorClass = result?.detected ? 'text-success dark:text-dark-success' : 'text-error dark:text-dark-error';
            UIElements.liveDetectedStatus.textContent = detectedText;
            UIElements.liveDetectedStatus.className = colorClass;
        }
        if (UIElements.liveConfidenceValue) {
            UIElements.liveConfidenceValue.textContent = (result?.confidence != null) ? `${(result.confidence * 100).toFixed(1)}%` : "-";
        }
        if (UIElements.liveRequiredConfidenceValue) {
            const requiredConfidence = result?.requiredConfidence ?? 0.1;
            UIElements.liveRequiredConfidenceValue.textContent = `> ${(requiredConfidence * 100).toFixed(1)}%`;
        }
    }
}