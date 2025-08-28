# gesture-vision-plugin-gesture-studio

A tool to create custom hand and pose gestures.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/jim1982ha/gesture-vision/main/packages/frontend/public/icons/icon-72.webp" width="80" alt="Gesture Studio Plugin Icon">
</p>
<h1 align="center">GestureVision - Gesture Studio Plugin</h1>
<p align="center">
  <strong>An integrated tool to visually create, test, and save your own custom hand and pose gestures.</strong>
</p>

---

The Gesture Studio plugin is a powerful UI contribution that makes creating custom gestures accessible to everyone. Instead of manually writing gesture definition files, you can use your camera to record samples of a gesture, and the Studio will automatically analyze the movements and generate the necessary JavaScript code for you.

## ✨ Key Features

-   **Visual Gesture Creation:** A step-by-step interface guides you through defining, recording, and testing a new gesture.
-   **Sample-Based Learning:** Simply perform a gesture several times for the camera. The Studio captures snapshots of the hand or body landmarks.
-   **Automatic Feature Extraction:** Analyzes the recorded samples to identify the most stable and unique angles and distances between landmarks that define your gesture.
-   **Code Generation:** Automatically generates a standard, optimized `.js` gesture definition file based on its analysis.
-   **Live Testing & Tuning:** Immediately test your newly created gesture in a live video feed and adjust the recognition tolerance with a slider to see the results in real-time.
-   **Seamless Integration:** Saved gestures are immediately available for use in the main "Gesture Settings" panel.

## 🔧 Configuration

The Gesture Studio is a UI-only plugin and does not have a configuration file. It is accessed directly through the main application's settings.

### How to Use the Gesture Studio

1.  Navigate to **Settings -> Custom Gestures**.
2.  Click the **"Create..."** button to launch the Gesture Studio modal.
3.  **Step 1: Define**
    -   Give your gesture a unique **Name** (e.g., "Two Finger Pinch").
    -   Provide an optional **Description**.
    -   Select the **Gesture Type** (Hand or Pose).
    -   Choose the camera source and number of samples to record.
    -   Click **"Confirm & Start Camera"**.
4.  **Step 2: Record**
    -   Position yourself and perform the gesture.
    -   Click **"Record Sample"**. A short countdown will begin, after which a snapshot is taken.
    -   Repeat until you have recorded the required number of samples. Thumbnails will appear as you go.
    -   Once all samples are recorded, the main button will change to **"Analyze & Generate"**. Click it.
5.  **Step 3: Test & Refine**
    -   The Studio will display the generated code and a summary of the extracted features.
    -   Perform your gesture in the live video feed. A status display will show the real-time recognition confidence.
    -   Adjust the **Tolerance** slider to make the recognition more strict or lenient.
    -   When you are satisfied, click **"Save Gesture"**.

Your new gesture is now ready to be assigned to an action!

---

Part of the **GestureVision** application.