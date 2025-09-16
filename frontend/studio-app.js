/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/studio-app.js */
import { LandmarkSelector } from "./ui/landmark-selector.js";
import { StudioCameraManager } from "./logic/studio-camera-manager.js";
import { StudioSessionManager } from "./logic/studio-session-manager.js";
import { StudioLiveTester } from "./logic/studio-live-tester.js";
import { StudioUIManager } from "./ui/studio-ui-manager.js";
import { StudioWorkflowManager } from "./logic/studio-workflow-manager.js";
import { StudioEventHandler } from "./logic/studio-event-handler.js";

class StudioController {
  #modalContainer;
  #studioContext;
  #appStore;
  
  // Managers and Controllers
  uiManager;
  cameraManager;
  sessionManager = null;
  liveTester;
  workflowManager;
  eventHandler;
  landmarkSelector = null;
  
  #canvasRendererRef;

  constructor(context, modalContainer) {
    if (!context?.cameraService || !context.coreStateManager || !context.gesture) {
      throw new Error("[GestureStudio] Critical services not provided in context.");
    }
    this.#studioContext = context;
    this.#appStore = context.coreStateManager;
    this.#modalContainer = modalContainer;
    this.#canvasRendererRef = context.cameraService?.getCameraManager()?.getCanvasRenderer() || null;

    this.uiManager = new StudioUIManager(modalContainer, context);
    this.cameraManager = new StudioCameraManager(context);
    this.liveTester = new StudioLiveTester();
    this.workflowManager = new StudioWorkflowManager(this);
    this.eventHandler = new StudioEventHandler(this);

    this.#initialize();
  }
  
  get context() { return this.#studioContext; }
  get appStore() { return this.#appStore; }
  get canvasRendererRef() { return this.#canvasRendererRef; }
  
  #initialize() {
    this.workflowManager.updateUIAndSetState("initial_select_type");
    this.eventHandler.attachAllEventListeners();
    this.uiManager.applyTranslations(this.context.services.translationService.translate);
    
    this.#studioContext.services.pubsub.publish(this.#studioContext.shared.constants.UI_EVENTS.REQUEST_CAMERA_LIST_RENDER);
    this.#studioContext.uiComponents.modalStack.push('gesture-studio');
    
    // Make modal visible after all setup is complete
    const { studioShell } = this.uiManager.getElements();
    if (studioShell) studioShell.style.visibility = "visible";
  }

  createSession(setupData) {
      this.sessionManager = new StudioSessionManager(setupData, this.#studioContext);
  }

  handleLandmarkSelectionRequest(selectionMode, existingSelection, onConfirmCallback, snapshot = null, sampleIndex = 0) {
      const sample = snapshot || this.sessionManager?.getSamples()?.[sampleIndex];
      if (!sample) {
          console.error(`[Studio] Landmark selection requires a valid sample. Requested index: ${sampleIndex}`);
          return;
      }
  
      if (!this.landmarkSelector) {
        this.landmarkSelector = new LandmarkSelector({
          onCancel: () => {},
          translate: this.context.services.translationService.translate,
          setIcon: this.context.uiComponents.setIcon,
          context: this.#studioContext,
        });
      }

      this.landmarkSelector.show({
        sample,
        initialSelection: existingSelection,
        selectionMode: selectionMode,
        onConfirm: onConfirmCallback
      });
  }
  
  destroy() {
    this.liveTester.stop();
    this.#canvasRendererRef?.setFocusPointsForDrawing(null);
    this.landmarkSelector?.destroy();
    this.eventHandler.destroy();
    this.sessionManager = null;
    
    this.#studioContext.uiComponents.modalStack.remove('gesture-studio');
  }

  async closeStudio() {
    this.destroy();
    await this.cameraManager.stopAndRestore();
    this.#modalContainer?.remove(); 
    currentStudioInstance = null;
  }
}

let currentStudioInstance = null;

export function initializeStudioUI(context, modalContainer) {
  if (currentStudioInstance) currentStudioInstance.closeStudio().catch(console.error);
  currentStudioInstance = new StudioController(context, modalContainer);
}