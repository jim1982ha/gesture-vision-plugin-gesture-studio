/* FILE: extensions/plugins/gesture-studio/frontend/logic/studio-camera-manager.js */
const { pubsub } = window.GestureVision.services;
const { GESTURE_EVENTS, UI_EVENTS } = window.GestureVision.shared.constants;
import { UIElements } from "../ui-elements.js";

/**
 * Manages all camera and video-related logic for the Gesture Studio.
 */
export class StudioCameraManager {
  #cameraServiceInstance;

  constructor(cameraService) {
    if (!cameraService) {
      throw new Error("StudioCameraManager requires a valid CameraService instance.");
    }
    this.#cameraServiceInstance = cameraService;
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
    
    const overridePayload = setupData.type === 'hand' 
        ? { hand: true, pose: false } 
        : { hand: false, pose: true };
    pubsub.publish(GESTURE_EVENTS.REQUEST_LANDMARK_VISIBILITY_OVERRIDE, overridePayload);
    
    // Reparent the main video container into the studio's placeholder
    pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { placeholderElement: UIElements.studioVideoPlaceholder });

    // Hide the main UI's overlay so the video feed is visible inside the studio
    pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "hidden");

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
    pubsub.publish(GESTURE_EVENTS.CLEAR_LANDMARK_VISIBILITY_OVERRIDE);
    if (this.#cameraServiceInstance?.isStreamActive()) {
      await this.#cameraServiceInstance.stopStream();
    }
    
    // Release the video container back to its original parent
    pubsub.publish(UI_EVENTS.REQUEST_VIDEO_REPARENT, { release: true });
    
    // Restore the main UI's overlay to its default idle state
    pubsub.publish(UI_EVENTS.REQUEST_OVERLAY_STATE, "OFFLINE_IDLE");
  }
}