/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/studio-app.js */
import { updateUIState } from "./ui-state-definitions.js";
import {
  getSetupData,
  showAnalysisResults,
  displayGeneratedCode,
  showToastNotification,
  updateSamplesDisplay,
  updateLiveConfidenceDisplay,
} from "./ui-interactions.js";
import { UIElements, elementIdMap } from "./ui-elements.js";
import { LandmarkSelector } from "./landmark-selector.js";
import { StudioCameraManager } from "./logic/studio-camera-manager.js";
import { StudioSessionManager } from "./logic/studio-session-manager.js";
import { StudioLiveTester } from "./logic/studio-live-tester.js";

const CAPTURE_COUNTDOWN_SECONDS = 1;

class StudioController {
  #currentSetupData = null;
  #cameraManager = null;
  #sessionManager = null;
  #liveTester = null;
  #landmarkSelector = null;
  #canvasRendererRef = null;
  #modalContainer = null;
  #manifest = null;

  #currentStudioState = "initial_define_record";
  #studioContext = null;
  #activeSubscriptions = [];
  #countdownIntervalId = null;
  #countdownValue = 0;

  #appStore = null;
  #translate = null;
  #pubsub = null;
  #setIcon = null;

  constructor(context, modalContainer, manifest) {
    if (!context?.cameraService || !context.coreStateManager || !context.gesture) {
      throw new Error("[GestureStudio] Critical services not provided in context.");
    }
    this.#studioContext = context;
    this.#appStore = context.coreStateManager;
    this.#translate = context.services.translate;
    this.#pubsub = context.services.pubsub;
    this.#setIcon = context.uiComponents.setIcon;
    this.#manifest = manifest;
    
    this.#modalContainer = modalContainer;
    this.#cameraManager = new StudioCameraManager(context);
    this.#canvasRendererRef = context.cameraService?.getCameraManager()?.getCanvasRenderer() || null;
    
    this.#initializeUI(modalContainer);
    this.#attachEventListeners();
    this.applyStudioTranslations();
    this.#pubsub.publish(this.#studioContext.shared.constants.UI_EVENTS.REQUEST_CAMERA_LIST_RENDER);
  }

  #initializeUI(modalContainer) {
    for (const key in elementIdMap) {
      const id = elementIdMap[key];
      if (id && modalContainer) UIElements[key] = modalContainer.querySelector(`#${id}`);
      else if (id) UIElements[key] = document.getElementById(id);
    }
    if (UIElements.studioShell) UIElements.studioShell.style.visibility = "visible";
    this.#setIcon(UIElements.closeStudioBtn, 'UI_CLOSE');
    updateUIState("initial_define_record", { translate: this.#translate, setIcon: this.#setIcon });
  }

  #attachEventListeners = () => {
    UIElements.closeStudioBtn?.addEventListener("click", this.closeStudio.bind(this));
    UIElements.confirmSetupStartCameraBtn?.addEventListener("click", this.handleSetupCompleteAndStartCamera);
    UIElements.recordWorkflowBtn?.addEventListener("click", this.handleWorkflowAction);
    UIElements.resetSamplesBtn?.addEventListener("click", this.handleResetSamples);
    UIElements.saveGestureBtn?.addEventListener("click", this.handleSaveGesture);
    UIElements.backToSetupBtn?.addEventListener("click", this.handleBackToSetup);
    UIElements.backToSetupBtnFromRecord?.addEventListener("click", this.handleBackToSetup);
    
    const toleranceSlider = document.getElementById("gestureToleranceSlider");
    if (toleranceSlider) {
      toleranceSlider.addEventListener("input", this.#handleToleranceChange);
      this.#updateToleranceOutput(parseFloat(toleranceSlider.value));
    }
    
    const { CAMERA_SOURCE_EVENTS, WEBSOCKET_EVENTS, GESTURE_EVENTS } = this.#studioContext.shared.constants;
    
    this.#activeSubscriptions = [
      this.#pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, this.renderCameraList),
      this.#pubsub.subscribe(WEBSOCKET_EVENTS.BACKEND_UPLOAD_CUSTOM_GESTURE_ACK, this.handleUploadAck),
      this.#appStore.subscribe(state => state.languagePreference, this.applyStudioTranslations),
      this.#pubsub.subscribe(GESTURE_EVENTS.TEST_RESULT, (testResult) => {
        if (this.#currentStudioState === "testing_gesture") {
          updateLiveConfidenceDisplay({ ...testResult, requiredConfidence: 0.1 }, this.#translate);
        }
      })
    ];
  };

  #updateUIAndSetState = (newState, payload = {}) => {
    this.#currentStudioState = newState;
    updateUIState(newState, { ...payload, translate: this.#translate, setIcon: this.#setIcon });
  };

  handleSetupCompleteAndStartCamera = () => {
    const setupDataAttempt = getSetupData(this.#translate);
    if (!setupDataAttempt.name) {
      showToastNotification(this.#translate("toastGestureNameRequired"), true);
      return;
    }
    this.#currentSetupData = setupDataAttempt;
    this.#sessionManager = new StudioSessionManager(setupDataAttempt, this.#translate);
    this.#liveTester = new StudioLiveTester();

    this.#cameraManager.start(setupDataAttempt)
      .then(() => {
        if(UIElements.studioVideoPlaceholder && UIElements.liveTestDisplay) {
            UIElements.studioVideoPlaceholder.appendChild(UIElements.liveTestDisplay);
        }
        this.#updateUIAndSetState("ready_to_record", {
          samplesCount: 0,
          samplesNeeded: this.#currentSetupData.samplesNeeded,
        });
      })
      .catch((err) => {
        console.error("[StudioController] Failed to start camera:", err);
        this.#updateUIAndSetState("error_state", { message: `Failed to start camera: ${err.message}` });
      });
  };

  handleStartRecordingSample = () => {
    this.#countdownValue = CAPTURE_COUNTDOWN_SECONDS;
    this.#updateUIAndSetState("capturing_sample", { countdownValue: this.#countdownValue });

    this.#countdownIntervalId = window.setInterval(() => {
      this.#countdownValue--;
      if (this.#countdownValue <= 0) {
        clearInterval(this.#countdownIntervalId);
        this.handleCaptureSampleSequence();
      } else {
        this.#updateUIAndSetState("capturing_sample", { countdownValue: this.#countdownValue });
      }
    }, 1000);
  };
  
  handleCaptureSampleSequence = async () => {
    this.#updateUIAndSetState("capturing_sample", { countdownValue: "...", isProcessing: true });
    
    try {
      const snapshot = await this.#studioContext.cameraService.getLandmarkSnapshot();
      if (snapshot?.landmarks?.length && snapshot.imageData) this.#sessionManager.addSample(snapshot);
      else showToastNotification(this.#translate(snapshot?.imageData ? "toastSampleCaptureFailedNoLandmarks" : "toastSampleCaptureFailedGeneric"), true);
    } catch (e) {
      console.error("Error capturing sample:", e);
      showToastNotification(`${this.#translate("errorGeneric")}: ${e.message}`, true);
    }

    updateSamplesDisplay(this.#sessionManager.getSamples() || [], this.#handleSampleClick);
    const canAnalyze = this.#sessionManager.isRecordingComplete();
    const currentSamplesCount = this.#sessionManager.getSamples().length;
  
    if (canAnalyze) this.#updateUIAndSetState("all_samples_recorded", { samplesCount: currentSamplesCount, samplesNeeded: this.#currentSetupData.samplesNeeded });
    else this.#updateUIAndSetState("ready_to_record", { samplesCount: currentSamplesCount, samplesNeeded: this.#currentSetupData.samplesNeeded });
  };

  handleResetSamples = () => {
    this.#sessionManager.resetSamples();
    this.#canvasRendererRef?.setFocusPointsForDrawing(null);
    updateSamplesDisplay([], this.#handleSampleClick);
    this.#updateUIAndSetState("ready_to_record", {
      samplesCount: 0, samplesNeeded: this.#currentSetupData.samplesNeeded,
    });
  };

  handleAnalyzeSamples = () => {
    this.#updateUIAndSetState("analyzing_features");
    setTimeout(() => {
      const analysisResult = this.#sessionManager.analyzeSamples();
      if (analysisResult?.rules) {
        this.updateGeneratedCodeAndStartTest();
        showAnalysisResults(analysisResult.rules, this.#translate);
      } else {
        console.warn("[StudioController] Analysis failed.");
        showToastNotification(this.#translate("studioAnalysisStatusFailed"), true);
        this.#updateUIAndSetState("all_samples_recorded", {
            samplesCount: this.#sessionManager.getSamples().length, samplesNeeded: this.#currentSetupData.samplesNeeded,
        });
      }
    }, 10);
  };
  
  updateGeneratedCodeAndStartTest = () => {
    const tolerance = parseFloat(document.getElementById("gestureToleranceSlider")?.value || "0.2");
    const code = this.#sessionManager.generateJsFileContent(tolerance);
    if (code) {
      displayGeneratedCode(code);
      const result = this.#sessionManager.getAnalysisResult();
      this.#liveTester.start(result.rules, tolerance, this.#studioContext.gesture);
      this.#canvasRendererRef?.setFocusPointsForDrawing(result.focusPoints);
      this.#updateUIAndSetState("testing_gesture");
    }
  };

  #handleToleranceChange = (event) => {
    const newTolerance = parseFloat(event.target.value);
    this.#updateToleranceOutput(newTolerance);
    this.#liveTester.updateTolerance(newTolerance);
    const newCode = this.#sessionManager.generateJsFileContent(newTolerance);
    if (newCode) displayGeneratedCode(newCode);
  };

  #updateToleranceOutput = (value) => {
    const output = document.getElementById("gestureToleranceValue");
    const slider = document.getElementById("gestureToleranceSlider");
    if (!output || !slider) return;
    output.textContent = `${Math.round(value * 100)}%`;
    const min = parseFloat(slider.min), max = parseFloat(slider.max);
    output.style.setProperty("--value-percent-raw", String((value - min) / (max - min)));
  };

  handleSaveGesture = () => {
    const tolerance = parseFloat(document.getElementById("gestureToleranceSlider")?.value || "0.2");
    const codeString = this.#sessionManager.generateJsFileContent(tolerance);
    if (!codeString || !this.#currentSetupData) {
      showToastNotification(this.#translate("toastNoGeneratedCode"), true); return;
    }
    const { name, description, type } = this.#currentSetupData;
    this.#studioContext.webSocketService.sendMessage({ type: "UPLOAD_CUSTOM_GESTURE", payload: { name, description, type, codeString, source: "studio" } });
    this.closeStudio();
  };

  handleBackToSetup = async () => {
    await this.#cameraManager.stopAndRestore();
    this.#liveTester?.stop();
    this.#canvasRendererRef?.setFocusPointsForDrawing(null);

    if (UIElements.samplesPreview) UIElements.samplesPreview.innerHTML = '';
    if (UIElements.generatedCodeTextarea) UIElements.generatedCodeTextarea.value = '';
    if (UIElements.extractedFeaturesDisplay) UIElements.extractedFeaturesDisplay.textContent = '';
    
    this.#sessionManager = null;
    
    this.#updateUIAndSetState("initial_define_record");
  };

  handleWorkflowAction = () => {
    const state = this.#currentStudioState;
    if (state === "ready_to_record" || (state === "all_samples_recorded" && !this.#sessionManager.isRecordingComplete())) {
      this.handleStartRecordingSample();
    } else if (state === "all_samples_recorded") {
      this.handleAnalyzeSamples();
    }
  };

  #handleSampleClick = async (sampleIndex) => {
    const sample = this.#sessionManager.getSamples()[sampleIndex];
    if (!sample) return;
    if (!this.#landmarkSelector) {
      const response = await fetch(`/api/plugins/assets/${this.#manifest.id}/frontend/landmark-selector.html`);
      const html = await response.text();
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.appendChild(container.firstElementChild);
      this.#landmarkSelector = new LandmarkSelector({
        modalElement: document.getElementById('landmark-selector-modal'),
        onConfirm: (indices) => this.#sessionManager.setSelectedLandmarkIndices(indices),
        onCancel: () => {},
        translate: this.#translate,
        setIcon: this.#setIcon
      });
    }
    this.#landmarkSelector.show(sample, this.#sessionManager.getSelectedLandmarkIndices());
  };
  
  handleUploadAck = (payload) => {
    if (payload?.source !== "studio") return;
    const { UI_EVENTS } = this.#studioContext.shared.constants;
    if (payload.success) {
      this.#pubsub.publish(UI_EVENTS.SHOW_NOTIFICATION, { messageKey: 'customGestureSaveSuccess', substitutions: { name: payload.newDefinition?.name || '?' }, type: 'success' });
      
      const newGestureType = payload.newDefinition?.type;
      if (newGestureType === 'hand') {
        this.#appStore.getState().actions.requestBackendPatch({ enableCustomHandGestures: true });
      } else if (newGestureType === 'pose') {
        this.#appStore.getState().actions.requestBackendPatch({ enablePoseProcessing: true });
      }

    } else {
      showToastNotification(this.#translate("toastSaveFailed", { message: payload.message || "Unknown error" }), true);
    }
  };
  
  renderCameraList = (deviceMap) => {
    if (!UIElements.studioCameraSelect) return;
    UIElements.studioCameraSelect.innerHTML = "";
    deviceMap.forEach((label, id) => {
      const option = document.createElement("option");
      option.value = id; option.textContent = label;
      UIElements.studioCameraSelect.appendChild(option);
    });
  };

  applyStudioTranslations = () => {
    const shell = this.#modalContainer;
    if (!shell) return;
  
    const translationMappings = [
      { dataAttr: 'data-translate-key', set: (el, val) => { if (el) el.textContent = val; } },
      { dataAttr: 'data-translate-key-aria-label', set: (el, val) => el.setAttribute('aria-label', val) },
      { dataAttr: 'data-translate-key-placeholder', set: (el, val) => { if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.placeholder = val; } }
    ];

    const selector = translationMappings.map(m => `[${m.dataAttr}]`).join(',');
    const translatableElements = shell.querySelectorAll(selector);

    translatableElements.forEach(el => {
      translationMappings.forEach(mapping => {
        const key = el.getAttribute(mapping.dataAttr);
        if (key) {
          mapping.set(el, this.#translate(key));
        }
      });
    });
  };

  destroy = () => {
    this.#liveTester?.stop();
    this.#canvasRendererRef?.setFocusPointsForDrawing(null);
    this.#activeSubscriptions.forEach((unsubscribeFn) => {
        if (typeof unsubscribeFn === 'function') {
            unsubscribeFn();
        } else if (unsubscribeFn && typeof unsubscribeFn.unsubscribe === 'function') {
            unsubscribeFn.unsubscribe();
        }
    });
    this.#activeSubscriptions = [];
    if (this.#countdownIntervalId) clearInterval(this.#countdownIntervalId);
    this.#sessionManager = null;
    this.#liveTester = null;
  };

  closeStudio = async () => {
    this.destroy();
    await this.#cameraManager.stopAndRestore();
    this.#modalContainer?.remove(); 
    currentStudioInstance = null;
  };
}

let currentStudioInstance = null;

export function initializeStudioUI(context, modalContainer, manifest) {
  if (currentStudioInstance) currentStudioInstance.closeStudio().catch(console.error);
  currentStudioInstance = new StudioController(context, modalContainer, manifest);
}