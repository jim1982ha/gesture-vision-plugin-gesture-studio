/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/logic/studio-camera-manager.js */
import { UIElements } from "../ui-elements.js";

/**
 * Manages all camera and video-related logic for the Gesture Studio.
 */
export class StudioCameraManager {
  #cameraServiceInstance;
  #isVideoContainerBorrowed = false;
  #context;

  constructor(context) {
    if (!context || !context.cameraService) {
      throw new Error("StudioCameraManager requires a valid context with a CameraService instance.");
    }
    this.#context = context;
    this.#cameraServiceInstance = context.cameraService;
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
    
    const overridePayload = setupData.type === 'hand' 
        ? { hand: true, pose: false } 
        : { hand: false, pose: true };
    this.#context.services.pubsub.publish(GESTURE_EVENTS.REQUEST_LANDMARK_VISIBILITY_OVERRIDE, overridePayload);
    
    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { placeholderElement: UIElements.studioVideoPlaceholder });
    this.#isVideoContainerBorrowed = true;

    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "hidden");

    await this.#cameraServiceInstance.startStream({
      gestureType: setupData.type,
      cameraId: setupData.cameraId,
    });
  }

  /**
   * Stops the camera stream and restores the video container to its original place.
   * @returns {Promise<void>}
   */
  async stopAndRestore() {
    const { GESTURE_EVENTS, UI_EVENTS } = this.#context.shared.constants;
    this.#context.services.pubsub.publish(GESTURE_EVENTS.CLEAR_LANDMARK_VISIBILITY_OVERRIDE);
    if (this.#cameraServiceInstance?.isStreamActive()) {
      await this.#cameraServiceInstance.stopStream();
    }
    
    if (this.#isVideoContainerBorrowed) {
      this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { release: true });
      this.#isVideoContainerBorrowed = false;
    }
    
    this.#context.services.pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "OFFLINE_IDLE");
  }
}