/* FILE: extensions/plugins/gesture-studio/frontend/studio-interactions.js */
import { UIElements } from './ui-elements.js';
const { translate } = window.GestureVision.services;
let toastTimeoutId = null;

export function getSetupData() {
    const samplesInput = UIElements.samplesToRecordInput;
    let samplesToRecord = 3;
    if (samplesInput && samplesInput.value) {
        const val = parseInt(samplesInput.value, 10);
        if (!isNaN(val) && val >= 3 && val <= 10) samplesToRecord = val;
        else samplesInput.value = "3";
    }
    return {
        name: UIElements.gestureNameInput?.value.trim() || "MyCustomGesture",
        description: UIElements.gestureDescriptionInput?.value.trim() || "A custom gesture.",
        type: UIElements.gestureTypeSelect?.value || "hand",
        samplesNeeded: samplesToRecord,
        cameraId: UIElements.studioCameraSelect?.value || "",
    };
}
export function updateSamplesDisplay(samples) {
    // --- LOGGING ---
    console.log(`%c[Studio Interactions] updateSamplesDisplay called with ${samples.length} samples.`, 'color: #00A36C', { element: UIElements.samplesPreview });
    if(!UIElements.samplesPreview) return;
    UIElements.samplesPreview.innerHTML = '';
    samples.forEach(sample => {
        const canvas = document.createElement("canvas");
        canvas.width = 120; canvas.height = 90;
        canvas.style.border = "1px solid var(--border)"; canvas.style.borderRadius = "var(--radius-small)";
        const ctx = canvas.getContext("2d");
        if (ctx && sample.imageData) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = sample.imageData.width; tempCanvas.height = sample.imageData.height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
                tempCtx.putImageData(sample.imageData, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
            }
        }
        UIElements.samplesPreview.appendChild(canvas);
    });
}
export function showAnalysisResults(features) {
    if (UIElements.analysisStatus) UIElements.analysisStatus.textContent = translate("studioAnalysisStatusComplete");
    if (UIElements.extractedFeaturesDisplay) UIElements.extractedFeaturesDisplay.textContent = features ? JSON.stringify(features, null, 2) : translate("studioAnalysisStatusFailed");
}
export function displayGeneratedCode(codeString) { 
    if (UIElements.generatedCodeTextarea) {
        UIElements.generatedCodeTextarea.value = codeString || '';
    }
}
export function getGeneratedCode() { return UIElements.generatedCodeTextarea?.value || ""; }
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