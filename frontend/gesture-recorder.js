/* FILE: extensions/plugins/gesture-vision-plugin-gesture-studio/frontend/gesture-recorder.js */
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
    
    const imageSource = snapshot?.imageData;

    if (
      !snapshot ||
      !Array.isArray(snapshot.landmarks) ||
      snapshot.landmarks.length === 0 ||
      !(imageSource instanceof ImageBitmap)
    ) {
      console.warn(
        "[GestureRecorder] Attempted to add invalid sample (missing landmarks or valid ImageBitmap). Sample rejected.",
        snapshot
      );
      if (imageSource instanceof ImageBitmap) imageSource.close();
      return false;
    }

    this.#samples.push({
      type: this.#gestureType,
      landmarks: snapshot.landmarks,
      imageData: imageSource, // This is an ImageBitmap
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
    this.#samples.forEach(s => s.imageData?.close());
    this.#samples = [];
  }
}