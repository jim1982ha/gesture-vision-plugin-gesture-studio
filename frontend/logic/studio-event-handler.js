/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-event-handler.js */
export class StudioEventHandler {
    #controller;
    #activeSubscriptions = [];
    #boundEscapeHandler;

    constructor(controller) {
        this.#controller = controller;
        this.#boundEscapeHandler = this.#controller.closeStudio.bind(this.#controller);
    }
    
    get context() { return this.#controller.context; }
    get appStore() { return this.#controller.appStore; }

    attachAllEventListeners() {
        const UIElements = this.#controller.uiManager.getElements();
        
        // --- Event Listeners for new creation type selection ---
        UIElements.staticTypeBtn?.addEventListener("click", () => this.#controller.workflowManager.handleCreationTypeSelected('static'));
        UIElements.dynamicTypeBtn?.addEventListener("click", () => this.#controller.workflowManager.handleCreationTypeSelected('dynamic'));
        
        // --- General and Workflow buttons ---
        UIElements.studioCloseBtn?.addEventListener("click", this.#controller.closeStudio.bind(this.#controller));
        UIElements.confirmSetupStartCameraBtn?.addEventListener("click", this.#controller.workflowManager.handleSetupCompleteAndStartCamera);
        UIElements.recordWorkflowBtn?.addEventListener("click", this.#controller.workflowManager.handleWorkflowAction);
        UIElements.dynamicWorkflowBtn?.addEventListener("click", this.#controller.workflowManager.handleWorkflowAction);
        UIElements.resetSamplesBtn?.addEventListener("click", this.#controller.workflowManager.handleResetSamples);
        UIElements.saveGestureBtn?.addEventListener("click", this.#controller.workflowManager.handleSaveGesture);
        UIElements.backToSetupBtn?.addEventListener("click", this.#controller.workflowManager.handleBackToSetup);
        UIElements.backToSetupBtnFromRecord?.addEventListener("click", this.#controller.workflowManager.handleBackToSetup);
        UIElements.backToSetupBtnFromDynamic?.addEventListener('click', this.#controller.workflowManager.handleBackToSetup);
        UIElements.backToSetupBtnFromTest?.addEventListener("click", this.#controller.workflowManager.handleBackToSetup);
        
        // --- Dynamic Gesture specific buttons ---
        UIElements.selectLandmarksBtn?.addEventListener('click', this.#controller.workflowManager.handleSelectLandmarks);
        UIElements.calibrateMinBtn?.addEventListener('click', () => this.#controller.workflowManager.handleCalibrate('min'));
        UIElements.calibrateMaxBtn?.addEventListener('click', () => this.#controller.workflowManager.handleCalibrate('max'));
        
        UIElements.gestureToleranceSlider?.addEventListener("input", this.#handleToleranceChange);
        
        this.context.services.pubsub.subscribe('escape-for-gesture-studio', this.#boundEscapeHandler);
        
        const { CAMERA_SOURCE_EVENTS, WEBSOCKET_EVENTS, GESTURE_EVENTS } = this.context.shared.constants;
        this.#activeSubscriptions = [
            this.context.services.pubsub.subscribe(CAMERA_SOURCE_EVENTS.MAP_UPDATED, this.handleCameraListUpdate),
            this.context.services.pubsub.subscribe(WEBSOCKET_EVENTS.BACKEND_UPLOAD_CUSTOM_GESTURE_ACK, this.handleUploadAck),
            this.appStore.subscribe(state => state.languagePreference, this.handleLanguageChange),
            this.context.services.pubsub.subscribe(GESTURE_EVENTS.RENDER_OUTPUT, this.handleLiveTestRender)
        ];
    }
    
    #handleToleranceChange = (event) => {
        const newTolerance = parseFloat(event.target.value);
        this.#controller.uiManager.renderer.updateToleranceOutput(newTolerance);
        this.#controller.liveTester.updateTolerance(newTolerance);
    };

    handleCameraListUpdate = (deviceMap) => {
        const { studioCameraSelect } = this.#controller.uiManager.getElements();
        if (!studioCameraSelect) return;
        studioCameraSelect.innerHTML = "";
        deviceMap.forEach((label, id) => {
            const option = document.createElement("option");
            option.value = id; 
            option.textContent = label;
            studioCameraSelect.appendChild(option);
        });
    };

    handleUploadAck = (payload) => {
        if (payload?.source !== "studio") return;
        const { UI_EVENTS } = this.context.shared.constants;
        if (payload.success) {
            this.context.services.pubsub.publish(UI_EVENTS.SHOW_NOTIFICATION, { messageKey: 'customGestureSaveSuccess', substitutions: { name: payload.newDefinition?.name || '?' }, type: 'success' });
            const newGestureType = payload.newDefinition?.type;
            if (newGestureType === 'hand') this.appStore.getState().actions.requestBackendPatch({ enableCustomHandGestures: true });
            else if (newGestureType === 'pose') this.appStore.getState().actions.requestBackendPatch({ enablePoseProcessing: true });
        } else {
            this.context.services.pubsub.publish(UI_EVENTS.SHOW_ERROR, { messageKey: 'toastSaveFailed', substitutions: { message: payload.message || "Unknown error" } });
        }
    };
    
    handleLanguageChange = () => {
        this.#controller.uiManager.applyTranslations(this.context.services.translationService.translate);
    };

    handleLiveTestRender = (data) => {
        const { uiManager, sessionManager } = this.#controller;
        if (!sessionManager) return;
        
        const gestureType = sessionManager.getGestureType();
        const creationType = sessionManager.getCreationType();

        let landmarks;
        let worldLandmarks;
        if (gestureType === 'hand' && data?.handGestureResults) {
            landmarks = data.handGestureResults.landmarks?.[0];
            worldLandmarks = data.handGestureResults.worldLandmarks?.[0];
        } else if (gestureType === 'pose' && data?.poseLandmarkerResults) {
            landmarks = data.poseLandmarkerResults.landmarks?.[0];
            worldLandmarks = data.poseLandmarkerResults.worldLandmarks?.[0];
        }

        let distanceCm = null;
        const currentView = uiManager.viewManager.getCurrentState();

        if (creationType === 'dynamic' && landmarks) {
            const dynamicLandmarks = sessionManager.getDynamicLandmarks();
            if (dynamicLandmarks.length === 2) {
                const [p1_idx, p2_idx] = dynamicLandmarks;
                const ref_idx = gestureType === 'hand' ? [5, 8] : [11, 12];
                const knownDist = gestureType === 'hand' ? 9.0 : 25.0;
                const [ref1_idx, ref2_idx] = ref_idx;

                const p1 = landmarks[p1_idx];
                const p2 = landmarks[p2_idx];
                const ref1 = landmarks[ref1_idx];
                const ref2 = landmarks[ref2_idx];

                if (p1 && p2 && ref1 && ref2) {
                    const vectorDistance = (v1, v2) => Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
                    const measuredPx = vectorDistance(p1, p2);
                    const referencePx = vectorDistance(ref1, ref2);
                    if (referencePx > 1e-6) {
                        const pixelsPerCm = referencePx / knownDist;
                        distanceCm = measuredPx / pixelsPerCm;
                    }
                }
            }
        }
        
        if (currentView === "calibrate_dynamic_gesture") {
            uiManager.renderer.updateLiveTestDisplay({ distance: distanceCm });
        } else if (currentView === "testing_gesture" && landmarks) {
            const result = this.#controller.liveTester.check(landmarks, worldLandmarks);
            uiManager.renderer.updateLiveTestDisplay({ confidenceResult: result, distance: distanceCm });
        }
    };
    
    destroy() {
        this.context.services.pubsub.unsubscribe('escape-for-gesture-studio', this.#boundEscapeHandler);
        this.#activeSubscriptions.forEach(unsub => unsub());
        this.#activeSubscriptions = [];
    }
}