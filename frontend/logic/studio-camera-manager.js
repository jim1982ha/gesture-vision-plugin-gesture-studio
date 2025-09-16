/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-camera-manager.js */
import { UIElements } from "../ui/ui-elements.js";

/**
 * Manages all camera and video-related logic for the Gesture Studio.
 */
export class StudioCameraManager {
  #cameraServiceInstance;
  #isVideoContainerBorrowed = false;
  #context;
  #canvasRendererRef;

  constructor(context) {
    if (!context || !context.cameraService) {
      throw new Error("StudioCameraManager requires a valid context with a CameraService instance.");
    }
    this.#context = context;
    this.#cameraServiceInstance = context.cameraService;
    this.#canvasRendererRef = this.#cameraServiceInstance.getCameraManager().getCanvasRenderer();
  }

  /**
   * Starts the camera stream using the specified gesture type and camera ID.
   * Handles reparenting the video feed into the studio UI.
   * @param {object} setupData - The setup data including gesture type and camera ID.
   * @returns {Promise<void>}
   */
  async start(setupData) {
    if (!setupData || !this.#cameraServiceInstance) {
      throw new Error("Camera service or setup data not available.");
    }
    
    const { GESTURE_EVENTS, UI_EVENTS } = this.#context.shared.constants;
    
    const isHandGesture = setupData.type === 'hand';
    
    // Force landmarks to be visible for the recording session, overriding user preference.
    this.#canvasRendererRef?.setLandmarkVisibilityOverride({ hand: isHandGesture, pose: !isHandGesture });

    // FIX: Refine the processing override payload for clarity and to disable built-in gestures during creation.
    const processingOverridePayload = {
        hand: isHandGesture,
        pose: !isHandGesture,
        numHands: isHandGesture ? 1 : 0,
        builtIn: false, // We only care about detecting our custom gesture
        custom: true,
    };
    this.#context.services.pubsub.publish(GESTURE_EVENTS.REQUEST_PROCESSING_OVERRIDE, processingOverridePayload);
    
    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { placeholderElement: UIElements.studioVideoPlaceholder });
    this.#isVideoContainerBorrowed = true;

    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "hidden");

    if (!this.#context.uiController.sidebarManager.isMobile) {
        this.#context.uiController.layoutManager.setVideoSizeOverride(false);
    }

    await this.#cameraServiceInstance.startStream({
      cameraId: setupData.cameraId,
    });
  }

  /**
   * Stops the camera stream and restores the video container to its original place.
   * @returns {Promise<void>}
   */
  async stopAndRestore() {
    const { GESTURE_EVENTS, UI_EVENTS } = this.#context.shared.constants;
    
    // Restore landmark visibility to respect the user's global preference.
    this.#canvasRendererRef?.clearLandmarkVisibilityOverride();
    this.#context.services.pubsub.publish(GESTURE_EVENTS.CLEAR_PROCESSING_OVERRIDE);
    
    if (this.#cameraServiceInstance?.isStreamActive()) {
      await this.#cameraServiceInstance.stopStream();
    }
    
    if (this.#isVideoContainerBorrowed) {
      this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { release: true });
      this.#isVideoContainerBorrowed = false;
    }
    
    if (!this.#context.uiController.sidebarManager.isMobile) {
        this.#context.uiController.layoutManager.applyVideoSizePreference();
    }

    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "OFFLINE_IDLE");
  }
}