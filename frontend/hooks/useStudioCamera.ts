/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/hooks/useStudioCamera.ts */
import { useCallback, useRef, useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import type { PluginUIContext } from '#frontend/types/index.js';
import type { StudioSessionData } from '../GestureStudio.js';

export const useStudioCamera = (_context: PluginUIContext) => {
    const coreContext = useContext(AppContext);
    const isVideoContainerBorrowed = useRef(false);

    const startCamera = useCallback(async (setupData: StudioSessionData) => {
        if (!coreContext) return;
        const { cameraService, pubsub } = coreContext.services;
        const videoPlaceholder = document.getElementById('studio-video-placeholder');

        if (!cameraService || !videoPlaceholder) {
            console.error("Camera service or video placeholder not available.");
            return;
        }

        const { GESTURE_EVENTS, UI_EVENTS } = coreContext.shared.constants;
        const isHandGesture = setupData.type === 'hand';
        
        cameraService.getCameraManager().getCanvasRenderer()?.setLandmarkVisibilityOverride({ hand: isHandGesture, pose: !isHandGesture });
        
        const processingOverridePayload = {
            enableHandProcessing: isHandGesture,
            enablePoseProcessing: !isHandGesture,
            numHands: isHandGesture ? coreContext.appStore.getState().numHandsPreference : 0,
            builtIn: false,
            custom: true,
        };
        pubsub.publish(GESTURE_EVENTS.REQUEST_PROCESSING_OVERRIDE, processingOverridePayload);
        
        pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { placeholderElement: videoPlaceholder });
        isVideoContainerBorrowed.current = true;

        pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "hidden");

        await cameraService.startStream({ cameraId: setupData.cameraId });
    }, [coreContext]);

    const stopAndRestoreCamera = useCallback(async () => {
        if (!coreContext) return;
        const { cameraService, pubsub } = coreContext.services;
        if (!cameraService) return;

        const { GESTURE_EVENTS, UI_EVENTS } = coreContext.shared.constants;

        cameraService.getCameraManager().getCanvasRenderer()?.clearLandmarkVisibilityOverride();
        pubsub.publish(GESTURE_EVENTS.CLEAR_PROCESSING_OVERRIDE);
        
        if (cameraService.isStreamActive()) {
            await cameraService.stopStream();
        }
        
        if (isVideoContainerBorrowed.current) {
            pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { release: true });
            isVideoContainerBorrowed.current = false;
        }

        pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "OFFLINE_IDLE");
    }, [coreContext]);

    return { startCamera, stopAndRestoreCamera };
};