/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui-interactions.js */
import { UIElements } from './ui-elements.js';

let toastTimeoutId = null;

export function getSetupData(translate) {
    const samplesInput = UIElements.samplesToRecordInput;
    let samplesToRecord = 3;
    if (samplesInput && samplesInput.value) {
        const val = parseInt(samplesInput.value, 10);
        if (!isNaN(val) && val >= 3 && val <= 10) {
            samplesToRecord = val;
        } else {
            samplesInput.value = "3";
            // NOTE: showToastNotification is called here, but it's a simple function
            // with no dependencies on context, so this is okay.
            showToastNotification(translate('toastInvalidSampleCount'), true);
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
export function updateSamplesDisplay(samples, onSampleClick) {
    if(!UIElements.samplesPreview) return;
    UIElements.samplesPreview.innerHTML = '';
    samples.forEach((sample, index) => {
        const canvas = document.createElement("canvas");
        canvas.width = 120; canvas.height = 90;
        canvas.className = "studio-sample-canvas";
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
                tempCtx.putImageData(sample.imageData, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
            }
        }
        UIElements.samplesPreview.appendChild(canvas);
    });
}
export function showAnalysisResults(features, translate) {
    if (UIElements.analysisStatus) UIElements.analysisStatus.textContent = translate("studioAnalysisStatusComplete");
    if (UIElements.extractedFeaturesDisplay) UIElements.extractedFeaturesDisplay.textContent = features ? JSON.stringify(features, null, 2) : translate("studioAnalysisStatusFailed");
}
export function displayGeneratedCode(codeString) { 
    if (UIElements.generatedCodeTextarea) {
        UIElements.generatedCodeTextarea.value = codeString || '';
    }
}

export function updateLiveConfidenceDisplay(result, translate) {
    if (UIElements.liveDetectedStatus) {
        const detectedText = result?.detected ? translate("studioStatusDetected") : translate("studioStatusNotDetected");
        const colorVar = result?.detected ? 'var(--success)' : 'var(--error)';
        UIElements.liveDetectedStatus.textContent = detectedText;
        UIElements.liveDetectedStatus.style.color = colorVar;
    }
    if (UIElements.liveConfidenceValue) {
        UIElements.liveConfidenceValue.textContent = (result?.confidence != null) ? `${(result.confidence * 100).toFixed(1)}%` : "-";
    }
    if (UIElements.liveRequiredConfidenceValue) {
        const requiredConfidence = result?.requiredConfidence ?? 0.1;
        UIElements.liveRequiredConfidenceValue.textContent = `> ${(requiredConfidence * 100).toFixed(1)}%`;
    }
}

export function showToastNotification(message, isError = false) {
    const existing = document.querySelector(".toast-notification");
    if (existing) { existing.remove(); if (toastTimeoutId) clearTimeout(toastTimeoutId); }
    const toast = document.createElement("div");
    toast.className = `toast-notification ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    toastTimeoutId = window.setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.parentNode?.removeChild(toast), 500);
    }, isError ? 5000 : 3000);
}