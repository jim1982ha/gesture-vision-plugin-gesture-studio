/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/ui/studio-ui-manager.js */
import { UIElements, elementIdMap } from "./ui-elements.js";
import { buildModalShell } from './studio-layout.js';
import { StudioViewManager } from './studio-view-manager.js';
import { StudioUIRenderer } from './studio-ui-renderer.js';

/**
 * Main orchestrator for the Gesture Studio UI.
 * Initializes and delegates tasks to specialized sub-managers.
 */
export class StudioUIManager {
    #modalContainer;
    #context;
    
    viewManager;
    renderer;

    constructor(modalContainer, context) {
        this.#modalContainer = modalContainer;
        this.#context = context;

        // 1. Build the static HTML shell.
        buildModalShell(this.#modalContainer);
        
        // 2. Query all elements once the shell is built.
        for (const key in elementIdMap) {
            const id = elementIdMap[key];
            if (id) UIElements[key] = this.#modalContainer.querySelector(`#${id}`);
        }
        
        // 3. Instantiate and delegate to specialized managers.
        this.viewManager = new StudioViewManager(UIElements, context);
        this.renderer = new StudioUIRenderer(UIElements, context);

        this.#setIcon(UIElements.studioCloseBtn, 'UI_CLOSE');
    }
    
    #setIcon = (element, iconKey) => this.#context.uiComponents.setIcon(element, iconKey);

    getElements = () => UIElements;
    getCurrentState = () => this.viewManager.getCurrentState();
    setCurrentState = (newState) => this.viewManager.setCurrentState(newState);
    
    renderState = (state, payload) => this.viewManager.renderState(state, payload);
    
    // Delegate rendering tasks to the renderer
    updateSamplesDisplay = (...args) => this.renderer.updateSamplesDisplay(...args);
    updateDynamicDefinitionUI = (...args) => this.renderer.updateDynamicDefinitionUI(...args);
    updateRealtimeDistanceDisplay = (...args) => this.renderer.updateRealtimeDistanceDisplay(...args);
    showAnalysisResults = (...args) => this.renderer.showAnalysisResults(...args);
    displayGeneratedCode = (...args) => this.renderer.displayGeneratedCode(...args);
    updateLiveConfidenceDisplay = (...args) => this.renderer.updateLiveConfidenceDisplay(...args);
    updateToleranceOutput = (...args) => this.renderer.updateToleranceOutput(...args);
    clearDynamicContent = () => this.renderer.clearDynamicContent();

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
    
    applyTranslations(translate) {
        const shell = this.#modalContainer;
        if (!shell) return;
      
        const header = shell.querySelector('.modal-header');
        if (header) {
            const title = header.querySelector('.header-title');
            if (title) title.textContent = translate("pluginStudioName");
        }
    
        const translationMappings = [
          { dataAttr: 'data-translate-key', set: (el, val) => { if (el) el.textContent = val; } },
          { dataAttr: 'data-translate-key-placeholder', set: (el, val) => { if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.placeholder = val; } }
        ];
    
        const selector = translationMappings.map(m => `[${m.dataAttr}]`).join(',');
        const translatableElements = shell.querySelectorAll(selector);
    
        translatableElements.forEach(el => {
          translationMappings.forEach(mapping => {
            const key = el.getAttribute(mapping.dataAttr);
            if (key) {
                const textSpan = el.querySelector('span:not(.material-icons):not(.material-symbols-outlined)');
                if(el.tagName === 'BUTTON' && textSpan) {
                    textSpan.textContent = translate(key);
                } else {
                    mapping.set(el, translate(key));
                }
            }
          });
        });
        
        this.#setIcon(UIElements.selectLandmarksBtn, 'UI_HANDS_LANDMARKS_DROPDOWN_TRIGGER');
        this.#setIcon(UIElements.calibrateMinBtn, 'UI_RECORD');
        this.#setIcon(UIElements.calibrateMaxBtn, 'UI_RECORD');
    }
}