/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/studio-ui-renderer.js */

/**
 * Handles all data-to-UI rendering tasks within the Gesture Studio.
 */
export class StudioUIRenderer {
    #elements;
    #translate;

    constructor(elements, context) {
        this.#elements = elements;
        this.#translate = context.services.translationService.translate;
    }

    updateDynamicDefinitionUI(sessionManager) {
        const { selectLandmarksBtn, selectedLandmarksDisplay, calibrateMinBtn, calibrateMaxBtn, minDistanceDisplay, maxDistanceDisplay, dynamicWorkflowBtn, dynamicWorkflowBtnText } = this.#elements;
        if (!sessionManager || !selectLandmarksBtn || !selectedLandmarksDisplay || !calibrateMinBtn || !calibrateMaxBtn || !minDistanceDisplay || !maxDistanceDisplay || !dynamicWorkflowBtn || !dynamicWorkflowBtnText) return;

        const landmarks = sessionManager.getDynamicLandmarks();
        if (landmarks.length === 2) {
            selectedLandmarksDisplay.textContent = `Points: ${landmarks[0]}, ${landmarks[1]}`;
            calibrateMinBtn.disabled = false;
            calibrateMaxBtn.disabled = false;
        } else {
            selectedLandmarksDisplay.textContent = this.#translate('studioTwoPointsRequired');
            calibrateMinBtn.disabled = true;
            calibrateMaxBtn.disabled = true;
        }
        
        const minDistance = sessionManager.getMinDistance();
        const maxDistance = sessionManager.getMaxDistance();
        minDistanceDisplay.textContent = `${this.#translate('studioMinDistance')}: ${minDistance !== null ? minDistance.toFixed(2) + ' cm' : this.#translate('studioNotCalibrated')}`;
        maxDistanceDisplay.textContent = `${this.#translate('studioMaxDistance')}: ${maxDistance !== null ? maxDistance.toFixed(2) + ' cm' : this.#translate('studioNotCalibrated')}`;
        
        const isCalibrated = minDistance !== null && maxDistance !== null;
        dynamicWorkflowBtn.disabled = !isCalibrated;
        
        dynamicWorkflowBtnText.textContent = this.#translate('studioAnalyzeAndGenerate');
    }

    updateSamplesDisplay(samples, onSampleClick) {
        const { samplesPreview } = this.#elements;
        if(!samplesPreview) return;
        samplesPreview.innerHTML = '';
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
            samplesPreview.appendChild(canvas);
        });
    }

    showAnalysisResults(features) {
        if (this.#elements.analysisStatus) this.#elements.analysisStatus.textContent = this.#translate("studioAnalysisStatusComplete");
        if (this.#elements.extractedFeaturesDisplay) this.#elements.extractedFeaturesDisplay.textContent = features ? (features.type === 'dynamic' ? this.#translate('studioDynamicAnalysisPlaceholder') : JSON.stringify(features, null, 2)) : this.#translate("studioAnalysisStatusFailed");
    }

    displayGeneratedCode(codeString) { 
        if (this.#elements.generatedCodeTextarea) {
            this.#elements.generatedCodeTextarea.value = codeString || '';
        }
    }
    
    updateLiveTestDisplay({ confidenceResult, distance }) {
        const { liveTestDisplay } = this.#elements;
        if (!liveTestDisplay) return;
        
        let html = '';

        if (typeof distance === 'number') {
            html += `<div>${this.#translate('studioDistance')}: ${distance.toFixed(2)} cm</div>`;
        }

        if (confidenceResult) {
            const detectedText = confidenceResult.detected ? this.#translate("studioStatusDetected") : this.#translate("studioStatusNotDetected");
            const colorClass = confidenceResult.detected ? 'text-success' : 'text-error';
            const confidenceText = (confidenceResult.confidence != null) ? `${(confidenceResult.confidence * 100).toFixed(1)}%` : "-";
            
            html += `
                <div>${this.#translate('studioLiveStatus')}: <strong class="${colorClass}">${detectedText}</strong></div>
                <div>${this.#translate('studioLiveConfidence')}: <span>${confidenceText}</span></div>
            `;
        }

        liveTestDisplay.innerHTML = html;
    }

    updateToleranceOutput = (value) => {
        const { gestureToleranceValue, gestureToleranceSlider } = this.#elements;
        if (!gestureToleranceValue || !gestureToleranceSlider) return;
        gestureToleranceValue.textContent = `${Math.round(value * 100)}%`;
        const min = parseFloat(gestureToleranceSlider.min), max = parseFloat(gestureToleranceSlider.max);
        gestureToleranceValue.style.setProperty("--value-percent-raw", String((value - min) / (max - min)));
    };
    
    clearDynamicContent() {
        if (this.#elements.samplesPreview) this.#elements.samplesPreview.innerHTML = '';
        if (this.#elements.generatedCodeTextarea) this.#elements.generatedCodeTextarea.value = '';
        if (this.#elements.extractedFeaturesDisplay) this.#elements.extractedFeaturesDisplay.textContent = '';
    }
}