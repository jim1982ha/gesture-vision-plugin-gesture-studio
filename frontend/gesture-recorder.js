/* FILE: extensions/plugins/gesture-studio/frontend/gesture-recorder.js */
export class GestureRecorder {
  #samples = [];
  #gestureType;
  #samplesNeeded;

  constructor(gestureType, samplesNeeded) {
    if (gestureType !== "hand" && gestureType !== "pose")
      throw new Error("Invalid gesture type.");
    if (typeof samplesNeeded !== "number" || samplesNeeded < 1)
      throw new Error("Invalid samplesNeeded.");
    this.#gestureType = gestureType;
    this.#samplesNeeded = samplesNeeded;
    this.reset();
  }

  addSample(snapshot) {
    if (this.#samples.length >= this.#samplesNeeded) return false;
    
    // The snapshot.imageData is now an ImageBitmap
    const imageSource = snapshot?.imageData;

    if (
      !snapshot ||
      !Array.isArray(snapshot.landmarks) ||
      snapshot.landmarks.length === 0 ||
      !imageSource
    ) {
      console.warn(
        "[GestureRecorder] Attempted to add invalid sample (missing landmarks or image data). Sample rejected.",
        snapshot
      );
      return false;
    }

    // FIX: Convert the received ImageBitmap to a cloneable ImageData object.
    let clonedImageData;
    try {
        const tempCanvas = new OffscreenCanvas(imageSource.width, imageSource.height);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error("Could not get 2D context from OffscreenCanvas.");
        
        tempCtx.drawImage(imageSource, 0, 0);
        const originalImageData = tempCtx.getImageData(0, 0, imageSource.width, imageSource.height);
        
        clonedImageData = new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
        );
    } catch (e) {
        console.error("[GestureRecorder] Failed to clone image data from snapshot:", e);
        return false;
    }


    this.#samples.push({
      type: this.#gestureType,
      landmarks: snapshot.landmarks,
      imageData: clonedImageData,
    });
    
    return true;
  }

  getSamples() {
    return this.#samples.map((s) => ({ ...s }));
  }
  isRecordingComplete() {
    return this.#samples.length >= this.#samplesNeeded;
  }
  reset() {
    this.#samples = [];
  }
}