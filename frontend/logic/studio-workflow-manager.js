/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-workflow-manager.js */
const CAPTURE_COUNTDOWN_SECONDS = 1;

export class StudioWorkflowManager {
    #controller;
    #currentSetupData = null;
    #countdownIntervalId = null;
    #countdownValue = 0;

    constructor(controller) {
        this.#controller = controller;
    }
    
    get controller() { return this.#controller; }
    get context() { return this.#controller.context; }
    get appStore() { return this.#controller.appStore; }
    get sessionManager() { return this.#controller.sessionManager; }
    get uiManager() { return this.#controller.uiManager; }

    updateUIAndSetState = (newState, payload = {}) => {
        this.uiManager.viewManager.setCurrentState(newState);
        this.uiManager.viewManager.renderState(newState, payload);
        this.uiManager.renderer.updateSamplesDisplay(this.sessionManager?.getSamples() || [], (index) => this.#controller.handleLandmarkSelectionRequest('multiple', this.sessionManager.getSelectedStaticLandmarkIndices(), (indices) => this.sessionManager.setSelectedStaticLandmarkIndices(indices), null, index));
    };
    
    handleCreationTypeSelected = (creationType) => {
        const basicSetupData = this.uiManager.getSetupData();
        this.#currentSetupData = { ...basicSetupData, creationType };
        
        this.#controller.createSession(this.#currentSetupData);
        
        const nextState = creationType === 'static' ? "initial_define_record" : "initial_define_dynamic";
        this.updateUIAndSetState(nextState);
    };

    handleSetupCompleteAndStartCamera = () => {
        const setupDataAttempt = this.uiManager.getSetupData();
        if (!setupDataAttempt.name) {
            this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastGestureNameRequired" });
            return;
        }

        this.#currentSetupData = { ...this.#currentSetupData, ...setupDataAttempt };
        this.#controller.createSession(this.#currentSetupData);

        this.#controller.cameraManager.start(this.#currentSetupData)
            .then(() => {
                const { studioVideoPlaceholder, liveTestDisplay } = this.uiManager.getElements();
                if(studioVideoPlaceholder && liveTestDisplay) {
                    studioVideoPlaceholder.appendChild(liveTestDisplay);
                }
                const nextState = this.#currentSetupData.creationType === 'static' ? "ready_to_record" : "calibrate_dynamic_gesture";
                this.updateUIAndSetState(nextState, { samplesCount: 0, samplesNeeded: this.#currentSetupData.samplesNeeded });
                if (this.#currentSetupData.creationType === 'dynamic') this.uiManager.renderer.updateDynamicDefinitionUI(this.sessionManager);
            })
            .catch((err) => {
                console.error("[StudioController] Failed to start camera:", err);
                this.updateUIAndSetState("error_state", { message: `Failed to start camera: ${err.message}` });
            });
    };
    
    handleStartRecordingSample = () => {
        this.#countdownValue = CAPTURE_COUNTDOWN_SECONDS;
        this.updateUIAndSetState("capturing_sample", { countdownValue: this.#countdownValue });

        this.#countdownIntervalId = window.setInterval(() => {
            this.#countdownValue--;
            if (this.#countdownValue <= 0) {
                clearInterval(this.#countdownIntervalId);
                this.handleCaptureSampleSequence();
            } else {
                this.updateUIAndSetState("capturing_sample", { countdownValue: this.#countdownValue });
            }
        }, 1000);
    };

    handleCaptureSampleSequence = async () => {
        this.updateUIAndSetState("capturing_sample", { countdownValue: "...", isProcessing: true });
        try {
            const snapshot = await this.context.cameraService.getLandmarkSnapshot();
            const isMirrored = this.context.cameraService.getCameraManager().isMirrored();
            if (snapshot?.landmarks2d?.length && snapshot.imageData) {
                this.sessionManager.addSample(snapshot, isMirrored);
            } else {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: snapshot?.imageData ? "toastSampleCaptureFailedNoLandmarks" : "toastSampleCaptureFailedGeneric" });
            }
        } catch (e) {
            console.error("Error capturing sample:", e);
            this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'errorGeneric', substitutions: { message: (e).message } });
        }

        this.uiManager.renderer.updateSamplesDisplay(this.sessionManager.getSamples() || [], (index) => this.#controller.handleLandmarkSelectionRequest('multiple', this.sessionManager.getSelectedStaticLandmarkIndices(), (indices) => this.sessionManager.setSelectedStaticLandmarkIndices(indices), null, index));
        const canAnalyze = this.sessionManager.isRecordingComplete();
        const currentSamplesCount = this.sessionManager.getSamples().length;
      
        if (canAnalyze) this.updateUIAndSetState("all_samples_recorded", { samplesCount: currentSamplesCount, samplesNeeded: this.#currentSetupData.samplesNeeded });
        else this.updateUIAndSetState("ready_to_record", { samplesCount: currentSamplesCount, samplesNeeded: this.#currentSetupData.samplesNeeded });
    };

    handleResetSamples = () => {
        this.sessionManager.resetSamples();
        this.#controller.canvasRendererRef?.setFocusPointsForDrawing(null);
        this.uiManager.renderer.updateSamplesDisplay([], (index) => this.#controller.handleLandmarkSelectionRequest('multiple', this.sessionManager.getSelectedStaticLandmarkIndices(), (indices) => this.sessionManager.setSelectedStaticLandmarkIndices(indices), null, index));
        this.updateUIAndSetState("ready_to_record", {
            samplesCount: 0, samplesNeeded: this.#currentSetupData.samplesNeeded,
        });
    };

    handleAnalyzeSamples = () => {
        this.updateUIAndSetState("analyzing_features");
        setTimeout(() => {
            const analysisResult = this.sessionManager.analyzeSamples();
            if (analysisResult?.rules) {
                this.updateGeneratedCodeAndStartTest();
                this.uiManager.renderer.showAnalysisResults(analysisResult.rules);
            } else {
                console.warn("[StudioController] Analysis failed.");
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'studioAnalysisStatusFailed' });
                this.updateUIAndSetState("all_samples_recorded", {
                    samplesCount: this.sessionManager.getSamples().length, samplesNeeded: this.#currentSetupData.samplesNeeded,
                });
            }
        }, 10);
    };

    updateGeneratedCodeAndStartTest = () => {
        const { gestureToleranceSlider } = this.uiManager.getElements();
        const tolerance = parseFloat(gestureToleranceSlider?.value || "0.2");
        const code = this.sessionManager.generateJsFileContent(tolerance);
        
        if (code) {
            this.uiManager.renderer.displayGeneratedCode(code);
            const analysisResult = this.sessionManager.getAnalysisResult();
            let checkFunction = null;

            if (this.sessionManager.getCreationType() === 'dynamic') {
                const compiledModule = self.GestureUtils.compileGestureCode(code, this.#currentSetupData.type);
                if (compiledModule) {
                    const dynamicCheckFn = this.#currentSetupData.type === 'pose' ? compiledModule.checkPose : compiledModule.checkGesture;
                    checkFunction = (landmarks, worldLandmarks) => {
                        const currentTolerance = parseFloat(gestureToleranceSlider?.value || "0.2");
                        return dynamicCheckFn(landmarks, worldLandmarks, currentTolerance);
                    };
                }
            } else { // Static gesture
                if (analysisResult?.rules && self.GestureUtils.checkStaticGesture) {
                    checkFunction = (landmarks, worldLandmarks) => {
                        const currentTolerance = parseFloat(gestureToleranceSlider?.value || "0.2");
                        return self.GestureUtils.checkStaticGesture(landmarks, worldLandmarks, analysisResult.rules, currentTolerance);
                    };
                }
            }

            if (checkFunction) {
                this.#controller.liveTester.start(checkFunction);
            } else {
                this.#controller.liveTester.stop();
                console.error("[Studio] Failed to create a valid check function for live testing.");
            }
            
            if (analysisResult?.focusPoints) this.#controller.canvasRendererRef?.setFocusPointsForDrawing(analysisResult.focusPoints);
            this.updateUIAndSetState("testing_gesture");
        }
    };
    
    handleSaveGesture = () => {
        const { gestureToleranceSlider } = this.uiManager.getElements();
        const tolerance = parseFloat(gestureToleranceSlider?.value || "0.2");
        const codeString = this.sessionManager.generateJsFileContent(tolerance);
        if (!codeString || !this.#currentSetupData) {
            this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'toastNoGeneratedCode' });
            return;
        }
        const { name, description, type } = this.#currentSetupData;
        this.context.webSocketService.sendMessage({ type: "UPLOAD_CUSTOM_GESTURE", payload: { name, description, type, codeString, source: "studio" } });
        this.#controller.closeStudio();
    };

    handleBackToSetup = async () => {
        await this.#controller.cameraManager.stopAndRestore();
        this.#controller.liveTester.stop();
        this.#controller.canvasRendererRef?.setFocusPointsForDrawing(null);
        this.uiManager.renderer.clearDynamicContent();
        this.#controller.sessionManager = null;
        this.updateUIAndSetState("initial_select_type");
    };

    handleWorkflowAction = () => {
        const state = this.uiManager.viewManager.getCurrentState();
        if (state === "ready_to_record" || (state === "all_samples_recorded" && !this.sessionManager.isRecordingComplete())) {
            this.handleStartRecordingSample();
        } else if (state === "all_samples_recorded") {
            this.handleAnalyzeSamples();
        } else if (state === 'calibrate_dynamic_gesture') {
            if (this.sessionManager.getMinDistance() !== null && this.sessionManager.getMaxDistance() !== null) {
                this.updateGeneratedCodeAndStartTest();
            } else {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "studioNotCalibrated" });
            }
        }
    };
    
    handleSelectLandmarks = async () => {
        if (!this.sessionManager) return;
        try {
            const snapshot = await this.context.cameraService.getLandmarkSnapshot();
            const isMirrored = this.context.cameraService.getCameraManager().isMirrored();
            if (!snapshot || !snapshot.imageData || !snapshot.landmarks2d) {
                throw new Error("Failed to get a valid camera snapshot.");
            }
            const snapshotWithMirroring = { ...snapshot, isMirrored };
            this.controller.handleLandmarkSelectionRequest('two_points', this.sessionManager.getDynamicLandmarks(), (indices) => {
                if (indices.size === 2) {
                    this.sessionManager.setDynamicLandmarks(Array.from(indices));
                    this.uiManager.renderer.updateDynamicDefinitionUI(this.sessionManager);
                }
            }, snapshotWithMirroring, 0);
        } catch (e) {
            this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastSampleCaptureFailedGeneric" });
            console.error("Failed to get snapshot for landmark selection:", e);
        }
    }

    handleCalibrate = async (type) => {
        try {
            const snapshot = await this.context.cameraService.getLandmarkSnapshot();
            const landmarks = snapshot?.landmarks2d;

            if (!landmarks || landmarks.length === 0) {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'toastSampleCaptureFailedNoLandmarks' });
                return;
            }
            
            const expectedLandmarkCount = this.#currentSetupData.type === 'hand' ? 21 : 33;
            if (landmarks.length !== expectedLandmarkCount) {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { 
                    message: `Calibration failed: Expected ${this.#currentSetupData.type} landmarks, but received a different type. Please restart and select the correct gesture type.` 
                });
                return;
            }
            
            const [p1_idx, p2_idx] = this.sessionManager.getDynamicLandmarks();
            const ref_idx = this.#currentSetupData.type === 'hand' ? [5, 8] : [11, 12];
            const knownDist = this.#currentSetupData.type === 'hand' ? 9.0 : 25.0;
            const [ref1_idx, ref2_idx] = ref_idx;

            const p1 = landmarks[p1_idx];
            const p2 = landmarks[p2_idx];
            const ref1 = landmarks[ref1_idx];
            const ref2 = landmarks[ref2_idx];
            
            if (!p1 || !p2 || !ref1 || !ref2) {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'toastSampleCaptureFailedNoLandmarks' });
                return;
            }
    
            const vectorDistance = (v1, v2) => Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
            const measuredPx = vectorDistance(p1, p2);
            const referencePx = vectorDistance(ref1, ref2);

            if (referencePx < 1e-6) {
                this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: 'toastSampleCaptureFailedNoLandmarks' });
                return;
            }
            
            const pixelsPerCm = referencePx / knownDist;
            const distanceInCm = measuredPx / pixelsPerCm;
            
            if(type === 'min') this.sessionManager.setMinDistance(distanceInCm);
            else this.sessionManager.setMaxDistance(distanceInCm);
    
            this.uiManager.renderer.updateDynamicDefinitionUI(this.sessionManager);

        } catch (e) {
             console.error(`Calibration failed for type ${type}:`, e);
             this.context.services.pubsub.publish(this.context.shared.constants.UI_EVENTS.SHOW_ERROR, { messageKey: "toastSampleCaptureFailedGeneric" });
        }
    }
}